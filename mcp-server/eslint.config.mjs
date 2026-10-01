import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  { rules: { "@typescript-eslint/consistent-type-definitions": ["error", "interface"] } },
  globalIgnores(["dist/**", "node_modules/**"]),
]);
