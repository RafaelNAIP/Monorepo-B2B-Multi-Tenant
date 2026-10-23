export const USER_ROLES = {
  client: "Cliente",
  admin: "Administrador",
} as const;

export type UserRole = keyof typeof USER_ROLES;
