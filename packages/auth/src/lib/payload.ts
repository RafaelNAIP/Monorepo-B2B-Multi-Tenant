import { z } from "zod";

// ─── Zod strict schema — rejeita campos extras ─────────────────

export const sessionPayloadSchema = z
  .object({
    sub: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1),
    tenantId: z.string().min(1),
    tenantSlug: z.string().min(1),
    role: z.enum(["admin", "client"]),
    iat: z.number().int(),
    exp: z.number().int(),
  })
  .strict();

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;
