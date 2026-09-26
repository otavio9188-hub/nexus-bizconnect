import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "BOOTSTRAP_OWNER_EMAIL", "BOOTSTRAP_OWNER_NAME"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error("Missing required environment variable(s): " + missing.join(", "));
  process.exit(1);
}

function generateTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  return "Nx" + [...bytes].map((b) => alphabet[b % alphabet.length]).join("") + "!9";
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = process.env.BOOTSTRAP_OWNER_EMAIL.trim().toLowerCase();
const fullName = process.env.BOOTSTRAP_OWNER_NAME.trim();
const password = process.env.BOOTSTRAP_OWNER_PASSWORD?.trim() || generateTempPassword();

const { data: owners, error: ownerCheckError } = await supabase.from("user_roles")
  .select("user_id").eq("role", "NEXUS_OWNER").limit(1);
if (ownerCheckError) throw new Error("Could not check existing owners: " + ownerCheckError.message);
if ((owners ?? []).length) {
  console.error("Bootstrap refused: a NEXUS_OWNER already exists.");
  process.exit(2);
}

const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersError) throw new Error("Could not inspect Auth users: " + usersError.message);
if (users.users.some((u) => u.email?.toLowerCase() === email)) {
  console.error("Bootstrap refused: this email already exists in Auth and is not a NEXUS_OWNER.");
  process.exit(2);
}

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email, password, email_confirm: true,
});
if (createError || !created?.user) {
  throw new Error("Could not create owner Auth user: " + (createError?.message || "unknown error"));
}

const id = created.user.id;
let profileCreated = false;
try {
  const { error: profileError } = await supabase.from("profiles").insert({
    id, company_id: null, active_company_id: null, full_name: fullName,
    email, status: "ACTIVE", must_change_password: true,
  });
  if (profileError) throw new Error("profile creation failed: " + profileError.message);
  profileCreated = true;

  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: id, company_id: null, role: "NEXUS_OWNER",
  });
  if (roleError) throw new Error("role creation failed: " + roleError.message);
} catch (error) {
  if (profileCreated) await supabase.from("profiles").delete().eq("id", id);
  await supabase.auth.admin.deleteUser(id);
  console.error("Bootstrap failed; the partial Auth user was removed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

console.log("\nNEXUS_OWNER bootstrap completed.");
console.log("Email: " + email);
console.log("Temporary password: " + password);
console.log("The first login must change this password.");
