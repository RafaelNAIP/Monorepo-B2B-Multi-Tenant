import path from "node:path";

/** storageState gerado pelo projeto `setup` e reutilizado pelos specs. */
export const STATE = {
  admin: path.resolve(__dirname, "../.auth/admin.json"),
  client: path.resolve(__dirname, "../.auth/client.json"),
} as const;
