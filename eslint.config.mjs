import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Domain modules under modules/ — used to make each module's data/ folder
// private to every other module (its public surface is domain/ + ui/).
const domains = [
  "auth", "tenancy", "batches", "documents", "attendance", "lamr", "billing",
  "import-export", "analytics", "activity", "notifications", "settings",
  "reports", "shell",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Architecture import boundaries: app -> modules -> shared -> lib/supabase.
  // See CLAUDE.md "Code layout — domain modules".
  {
    files: [
      "app/**/*.{ts,tsx}",
      "modules/**/*.{ts,tsx}",
      "shared/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
    ],
    rules: {
      "import/no-restricted-paths": ["error", {
        basePath: import.meta.dirname,
        zones: [
          {
            // Raw generated DB row types are data-layer only.
            target: ["./app/**", "./shared/**", "./modules/*/ui/**", "./modules/*/domain/**"],
            from: "./lib/supabase/database.types.ts",
            message: "Raw DB row types are data-layer only. Import domain types (shared/types or a module's domain/) instead.",
          },
          { target: "./shared/**", from: "./modules/**", message: "shared/ is the leaf level and must not import modules/." },
          { target: "./shared/**", from: "./app/**", message: "shared/ must not import app/." },
          { target: "./modules/**", from: "./app/**", message: "modules/ must not import app/." },
          // Another module's data/ is private; its public surface is domain/ + ui/.
          // app/ Server Components may still fetch from any module's data/.
          ...domains.map((d) => ({
            target: `./modules/!(${d})/**`,
            from: `./modules/${d}/data/**`,
            message: `modules/${d}/data is private to that module; import its domain/ or ui/ surface, or fetch in app/.`,
          })),
        ],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "assets/**",
    "preview/**",
    "screenshots/**",
    "ui_kits/**",
    "uploads/**",
    "tesda-compliance-manager-design-system-v0/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
