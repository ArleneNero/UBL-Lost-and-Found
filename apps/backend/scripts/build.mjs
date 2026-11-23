import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(backendRoot, "../..");
const rootPkg = JSON.parse(fs.readFileSync(path.join(monorepoRoot, "package.json"), "utf8"));
const appVersion = typeof rootPkg.version === "string" ? rootPkg.version : "0.0.0";

const outfile = path.join(backendRoot, "index.js");

await esbuild.build({
  entryPoints: [path.join(backendRoot, "src/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  footer: {
    js: "if (module.exports && module.exports.default) { const fn = module.exports.default; module.exports = fn; module.exports.default = fn; }",
  },
  outfile,
});

for (const copyName of ["app.js", "index.cjs", "app.cjs", "bundle.cjs"]) {
  fs.copyFileSync(outfile, path.join(backendRoot, copyName));
}
