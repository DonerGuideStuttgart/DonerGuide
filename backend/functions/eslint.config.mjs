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

  // TypeScript-specific configuration
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true, // Automatically detects all tsconfig.json in monorepo
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Azure Functions best practices
      "@typescript-eslint/no-explicit-any": "warn", // Allow any but warn
      "@typescript-eslint/explicit-function-return-type": "off", // Azure Functions use inference
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // Strict promise handling for reliability
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",

      // Helpful type-safety rules
      "@typescript-eslint/strict-boolean-expressions": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
    },
  },

  // JavaScript/Module files - disable type-checked rules
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
  },

  // Prettier config must be last to override conflicting rules
  prettierConfig
);
