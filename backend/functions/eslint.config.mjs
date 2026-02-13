import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // Base recommended rules
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/bin/**",
      "**/obj/**",
      "**/.azurite/**",
      "**/__blobstorage__/**",
      "**/__queuestorage__/**",
      "**/*.d.ts",
    ],
  },

  // TypeScript-specific configuration (excluding test files)
  {
    files: ["**/*.ts"],
    ignores: ["**/*.test.ts", "**/__tests__/**"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true, // Automatically detects all tsconfig.json in monorepo
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },

  // Test files - disable type-checked rules to avoid project service issues
  {
    files: ["**/*.test.ts", "**/__tests__/**/*.ts"],
    ...tseslint.configs.disableTypeChecked,
  },

  // JavaScript/Module files - disable type-checked rules
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
  },

  // Prettier config must be last to override conflicting rules
  prettierConfig
);
