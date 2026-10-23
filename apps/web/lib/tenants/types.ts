import type { SubscriptionStatus } from "./constants";

export interface TenantTheme {
  primaryColor: string;
  borderRadius: number;
  logoUrl: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscription: SubscriptionStatus;
  theme: TenantTheme;
  createdAt: string;
}
