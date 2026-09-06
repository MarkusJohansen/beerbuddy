// ESLint 10 flat config. Replaces .eslintrc.cjs, which ESLint 9 dropped support for.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", "**/__snapshots__"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      /*
       * The two classic hook rules, which is what plugin:react-hooks/recommended
       * meant on the v4 this project used.
       *
       * v7's recommended preset adds the React Compiler rules — set-state-in-effect,
       * refs-during-render and friends. They flag ten pre-existing patterns here:
       * the `ref.current = prop` assignment in BeerList, Filters and App, and the
       * setState-then-fetch shape in every data hook. Those are worth addressing,
       * but rewriting the data-fetching layer is a separate change from a version
       * bump, and this config should not smuggle one in.
       */
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Contexts export a provider component and the context object together, which
    // costs fast refresh in this file only.
    files: ["src/context/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["eslint.config.js", "vite.config.ts", "playwright.config.ts"],
    languageOptions: { globals: globals.node },
  }
);
