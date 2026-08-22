import { defineConfig } from "tsup";

// Dual output. ESM is where the ecosystem is going, but a CommonJS agent
// that cannot require() this package simply cannot use it, and that is a
// worse outcome than shipping two builds.
export default defineConfig({
  entry: ["src/index.ts", "src/testing.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node20",
  outExtension: ({ format }) => ({ js: format === "cjs" ? ".cjs" : ".js" }),
});
