// ESLint 10 flat config. Replaces .eslintrc.cjs, which ESLint 9 dropped support for.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", "db", "build/*.csv"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Unused args are fine when prefixed, which the catalogue route relies on to
      // drop beer_count from each row.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // This file is not in tsconfig's include, so type-aware parsing cannot cover it.
  // Must come last: it switches off rules the blocks above switch on.
  { files: ["eslint.config.js"], ...tseslint.configs.disableTypeChecked }
);
