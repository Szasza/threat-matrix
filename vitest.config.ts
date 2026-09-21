import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

// Load environment variables from the project root
nextEnv.loadEnvConfig(process.cwd());

const dirname =
  typeof import.meta.dirname !== "undefined"
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary", "json"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "src/**/*.stories.tsx",
        "src/**/*.test.ts",
        "src/app/**",
        "src/**/types.ts",
      ],
    },
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, ".storybook") }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        resolve: {
          alias: {
            "@": path.join(dirname, "src"),
            // "server-only"'s default export throws unconditionally; only
            // Next.js's webpack build resolves it to the no-op "empty.js"
            // (via the "react-server" exports condition it doesn't itself
            // set up here). Alias it directly so unit tests can import
            // server-only modules like a Next.js server build would.
            "server-only": path.join(
              dirname,
              "node_modules/server-only/empty.js",
            ),
          },
        },
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
    ],
  },
});
