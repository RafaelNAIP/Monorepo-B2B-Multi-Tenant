import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Componentes usam o JSX runtime automático (como o Next), sem importar React
  esbuild: { jsx: "automatic" },
  test: {
    include: ["apps/web/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@/": resolve(__dirname, "apps/web") + "/",
    },
  },
});
