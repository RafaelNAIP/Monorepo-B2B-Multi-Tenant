import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/web/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@/": "./apps/web/",
    },
  },
});
