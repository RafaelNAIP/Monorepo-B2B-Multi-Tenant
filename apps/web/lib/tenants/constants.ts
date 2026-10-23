export const SUBSCRIPTION_STATUS = {
  active: "Ativo",
  inactive: "Inativo",
  trial: "Teste",
} as const;

export type SubscriptionStatus = keyof typeof SUBSCRIPTION_STATUS;
