import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AppRole, PermissionAction } from "./modules";
import type { SessionContext } from "./nexus-shared";

export type Db = SupabaseClient<Database>;

export class AppError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const FORBIDDEN = () =>
  new AppError("FORBIDDEN", "Você não tem permissão para executar esta ação.");

export async function loadSessionContext(supabase: Db, userId: string): Promise<SessionContext> {
  const [{ data: profile }, { data: roles }, { data: perms }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, company_id, full_name, email, phone, position, department, status, must_change_password",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("user_permissions").select("module, action").eq("user_id", userId),
  ]);

  if (!profile) throw new AppError("NO_PROFILE", "Perfil de usuário não encontrado.");

  let company: SessionContext["company"] = null;
  if (profile.company_id) {
    const { data } = await supabase
      .from("companies")
      .select("id, name, status")
      .eq("id", profile.company_id)
      .maybeSingle();
    company = data ?? null;
  }

  const roleList = (roles ?? []).map((r) => r.role as AppRole);

  return {
    profile,
    company,
    roles: roleList,
    permissions: (perms ?? []).map((p) => ({
      module: p.module,
      action: p.action as PermissionAction,
    })),
    isNexusOwner: roleList.includes("NEXUS_OWNER"),
    isCompanyAdmin: roleList.includes("COMPANY_ADMIN"),
  };
}

export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  const core = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `Nx${core}!9`;
}

export type AuditEntry = {
  company_id?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  module: string;
  record_id?: string | null;
  record_label?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string | null;
  user_agent?: string | null;
};

export async function writeAudit(admin: Db, entry: AuditEntry) {
  await admin.from("audit_logs").insert({
    company_id: entry.company_id ?? null,
    user_id: entry.user_id ?? null,
    user_email: entry.user_email ?? null,
    action: entry.action,
    module: entry.module,
    record_id: entry.record_id ?? null,
    record_label: entry.record_label ?? null,
    old_value: (entry.old_value ?? null) as never,
    new_value: (entry.new_value ?? null) as never,
    ip_address: entry.ip_address ?? null,
    user_agent: entry.user_agent ?? null,
  });
}
