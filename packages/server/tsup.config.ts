import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node24",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // The package ships TypeScript source, so bundle it.
  noExternal: [/^@euchre\/game/],
});
