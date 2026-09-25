import type { AppRole, CompanyStatus, PermissionPair } from "./modules";

export type SessionProfile = {
  id: string;
  company_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  department: string | null;
  status: "ACTIVE" | "INACTIVE";
  must_change_password: boolean;
};

export type SessionCompany = {
  id: string;
  name: string;
  status: CompanyStatus;
} | null;

export type SessionContext = {
  profile: SessionProfile;
  company: SessionCompany;
  activeCompanyId: string | null;
  roles: AppRole[];
  permissions: PermissionPair[];
  isNexusOwner: boolean;
  isCompanyAdmin: boolean;
};

export function can(ctx: SessionContext | undefined, module: string, action: string): boolean {
  if (!ctx) return false;
  if (ctx.isNexusOwner) return false;
  if (ctx.profile.status !== "ACTIVE") return false;
  if (ctx.company?.status !== "ACTIVE") return false;
  if (ctx.isCompanyAdmin) return true;
  return ctx.permissions.some((p) => p.module === module && p.action === action);
}
