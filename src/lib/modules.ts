export const PERMISSION_ACTIONS = ["VIEW", "CREATE", "EDIT", "DELETE"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const APP_ROLES = ["NEXUS_OWNER", "COMPANY_ADMIN", "MANAGER", "EMPLOYEE"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const COMPANY_STATUSES = ["ACTIVE", "SUSPENDED", "BLOCKED"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

/** Modules a company user can be granted access to. Keys match database values. */
export const MODULES = [
  "dashboard",
  "sales",
  "customers",
  "products",
  "inventory",
  "purchases",
  "suppliers",
  "finance",
  "accounts_payable",
  "accounts_receivable",
  "reports",
  "employees",
  "company_settings",
  "audit_logs",
  // Módulos adicionais do ERP
  "affiliates",
  "contracts",
  "content",
  "commissions",
  "investments",
  "fiscal",
] as const;
export type ModuleKey = (typeof MODULES)[number];

export type PermissionPair = { module: string; action: PermissionAction };
