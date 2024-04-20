import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
});
