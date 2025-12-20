import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: [/@how-much-logs-can-a-keylogger-log-if-a-keylogger-could-log-logs\/.*/],
});
