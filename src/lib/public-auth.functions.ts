import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AppError } from "./actor";

const signupSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().nullable(),
  company_name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(72),
});

export const createPublicAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signupSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });

    if (authError || !created.user) {
      const message = authError?.message?.toLowerCase() ?? "";
      if (message.includes("already") || message.includes("exists")) {
        return { ok: false as const, message: "Este e-mail já está cadastrado." };
      }
      throw new AppError("SIGNUP_FAILED", "Não foi possível criar a conta.");
    }

    const userId = created.user.id;

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: data.company_name,
        email: data.email,
        phone: data.phone || null,
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (companyError || !company) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new AppError("SIGNUP_FAILED", "Não foi possível criar a empresa.");
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      company_id: company.id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      status: "ACTIVE",
      must_change_password: false,
    });

    if (profileError) {
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new AppError("SIGNUP_FAILED", "Não foi possível criar o perfil.");
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      company_id: company.id,
      role: "COMPANY_ADMIN",
    });

    if (roleError) {
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new AppError("SIGNUP_FAILED", "Não foi possível configurar o acesso.");
    }

    return { ok: true as const };
  });
