export const SUBSCRIPTION_STATUS = {
  active: "Ativo",
  inactive: "Inativo",
  trial: "Teste",
} as const;

export type SubscriptionStatus = keyof typeof SUBSCRIPTION_STATUS;

/** Cor primária usada quando o tenant não define uma (azul Tailwind 600). */
export const DEFAULT_PRIMARY_COLOR = "#2563eb";
