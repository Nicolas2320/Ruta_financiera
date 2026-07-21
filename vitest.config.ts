import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      include: [
        "context/AuthContext.tsx",
        "supabase/functions/assistant/handler.ts",
        "utils/debtCalculations.ts",
        "utils/financialCalculations.ts",
        "utils/goalPlanning.ts"
      ],
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: {
        branches: 65,
        functions: 75,
        lines: 75,
        statements: 75
      }
    }
  }
});
