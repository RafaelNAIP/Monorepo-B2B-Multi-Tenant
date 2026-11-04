import { sessionPayloadSchema, type SessionPayload } from "./payload";

// ─── Helpers base64url (edge-safe — Web Crypto API) ─────────────

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(pad);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── HMAC key derivation ────────────────────────────────────────

async function deriveKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// ─── Sign ───────────────────────────────────────────────────────

/**
 * Assina um SessionPayload e retorna `base64url(json).base64url(hmac)`.
 * Edge-safe — usa apenas Web Crypto API.
 */
export async function signSessionToken(
  payload: SessionPayload,
  secret: string
): Promise<string> {
  if (!secret) throw new Error("JWT_SECRET não pode ser vazio");

  const enc = new TextEncoder();
  const payloadBytes = enc.encode(JSON.stringify(payload));
  const payloadB64 = toBase64Url(payloadBytes.buffer as ArrayBuffer);

  const key = await deriveKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, payloadBytes as Uint8Array<ArrayBuffer>);
  const signatureB64 = toBase64Url(signature);

  return `${payloadB64}.${signatureB64}`;
}

// ─── Verify ─────────────────────────────────────────────────────

/**
 * Verifica token HMAC-SHA256 e retorna o payload validado por Zod.
 * Retorna `null` se adulterado, expirado ou malformado.
 */
export async function verifySessionToken(
  token: string,
  secret: string
): Promise<SessionPayload | null> {
  if (!secret) throw new Error("JWT_SECRET não pode ser vazio");
  if (!token || !token.includes(".")) return null;

  try {
    const [payloadB64, signatureB64] = token.split(".");
    if (!payloadB64 || !signatureB64) return null;

    const payloadBytes = fromBase64Url(payloadB64);
    const signatureBytes = fromBase64Url(signatureB64);

    const key = await deriveKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as Uint8Array<ArrayBuffer>,
      payloadBytes as Uint8Array<ArrayBuffer>
    );
    if (!valid) return null;

    const json = new TextDecoder().decode(payloadBytes);
    const raw = JSON.parse(json);

    // Validação Zod strict
    const parsed = sessionPayloadSchema.safeParse(raw);
    if (!parsed.success) return null;

    // Verificação de expiração
    const now = Math.floor(Date.now() / 1000);
    if (parsed.data.exp <= now) return null;

    return parsed.data;
  } catch {
    return null;
  }
}
