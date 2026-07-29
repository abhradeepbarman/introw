import globals from "globals";
import { config as baseConfig } from "./base.js";

/**
 * A shared ESLint configuration for server-side (Node/Bun) apps.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
