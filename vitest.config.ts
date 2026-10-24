import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/web/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@/": resolve(__dirname, "apps/web") + "/",
    },
  },
});
