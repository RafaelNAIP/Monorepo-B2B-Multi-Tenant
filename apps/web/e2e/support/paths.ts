import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** storageState gerado pelo projeto `setup` e reutilizado pelos specs. */
export const STATE = {
  admin: path.resolve(here, "../.auth/admin.json"),
  client: path.resolve(here, "../.auth/client.json"),
} as const;
