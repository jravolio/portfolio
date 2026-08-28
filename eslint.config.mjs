import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/**"]),
  {
    // Verbatim React Bits registry copies. The violations are upstream's;
    // rewriting them would mean maintaining a fork. See vendor/README.md.
    files: ["src/components/vendor/**"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/static-components": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  {
    files: ["scripts/**", "*.mjs"],
    rules: {
      "import/no-anonymous-default-export": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);
