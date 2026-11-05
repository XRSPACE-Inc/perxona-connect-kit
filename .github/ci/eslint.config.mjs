import js from "@eslint/js";
import globals from "globals";

// Paths are relative to the repository root, which is where CI runs ESLint from.
export default [
  js.configs.recommended,
  {
    files: ["samples/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    files: ["samples/**/public/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
    },
  },
];
