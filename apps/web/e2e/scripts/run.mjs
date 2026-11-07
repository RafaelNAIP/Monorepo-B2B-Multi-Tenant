// Orquestra a suíte E2E: sobe MongoDB em memória (replica set de 1 nó),
// exporta as variáveis do app, builda o Next e executa o Playwright.
// Uso: npm run test:e2e (raiz). Variáveis úteis:
//   E2E_SKIP_BUILD=1  pula o `next build` (quando o build já existe)
//   E2E_PORT=3100     porta do servidor de teste
//   PLAYWRIGHT_ARGS   argumentos extras, ex.: "--grep login"
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, "../..");
const repoRoot = path.resolve(webDir, "../..");

const repl = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: "wiredTiger" },
});

const mongoUrl = new URL(repl.getUri());
mongoUrl.pathname = "/empresa_e2e";

const env = {
  ...process.env,
  DATABASE_URL: mongoUrl.toString(),
  JWT_SECRET: "e2e-secret-com-mais-de-32-caracteres-para-testes",
  // Valores dummy: a assinatura do presign é local (HMAC/SigV4), sem rede.
  // O PUT real para o R2 é interceptado pelo Playwright nos specs de anexo.
  R2_ENDPOINT: "https://e2e-account.r2.cloudflarestorage.com",
  R2_ACCESS_KEY_ID: "e2e-access-key",
  R2_SECRET_ACCESS_KEY: "e2e-secret-key",
  R2_BUCKET_NAME: "e2e-bucket",
  E2E_PORT: process.env.E2E_PORT ?? "3100",
};

const isWindows = process.platform === "win32";

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, { stdio: "inherit", env, shell: isWindows, ...options });
}

let exitCode = 0;
try {
  if (process.env.E2E_SKIP_BUILD !== "1") {
    const build = run("npm", ["run", "build", "-w", "@empresa/web"], { cwd: repoRoot });
    if (build.status !== 0) throw new Error("next build falhou");
  }

  const extra = process.env.PLAYWRIGHT_ARGS ? process.env.PLAYWRIGHT_ARGS.split(" ") : [];
  const child = spawn("npx", ["playwright", "test", "-c", "playwright.config.ts", ...extra], {
    cwd: webDir,
    stdio: "inherit",
    env,
    shell: isWindows,
  });
  exitCode = await new Promise((resolve) => child.on("exit", (code) => resolve(code ?? 1)));
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  await repl.stop();
}

process.exit(exitCode);
