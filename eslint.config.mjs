import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Next.js defaults
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Recovery snapshot (not part of the production app)
    "snapshot-restore/**",
  ]),
]);

export default eslintConfig;