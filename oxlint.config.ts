import { defineConfig } from "oxlint";

export default defineConfig({
  ignorePatterns: ["node_modules/**", "dist/**", ".agent/**", ".agents/**", ".claude/**", "docs/**"],
});
