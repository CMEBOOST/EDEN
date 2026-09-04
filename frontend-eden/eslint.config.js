import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import pluginQuery from "@tanstack/eslint-plugin-query";
import vitest from "@vitest/eslint-plugin";
import testingLibrary from "eslint-plugin-testing-library";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "coverage"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      ...pluginQuery.configs["flat/recommended"],
      eslintConfigPrettier, // ปิด rule ที่ชนกับ Prettier — ต้องอยู่ท้ายสุด
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ["**/*.{test,spec}.{js,jsx}", "src/test/**/*.{js,jsx}"],
    extends: [vitest.configs.recommended, testingLibrary.configs["flat/react"]],
    languageOptions: {
      globals: { ...globals.node, ...vitest.environments.env.globals },
    },
  },
]);
