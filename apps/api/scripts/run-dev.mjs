import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, "..");
const require = createRequire(resolve(apiRoot, "package.json"));

function bin(name) {
  try {
    return require.resolve(`.bin/${name}`);
  } catch {
    const candidates = [
      resolve(apiRoot, "node_modules/.bin", name),
      resolve(apiRoot, "../../node_modules/.bin", name),
    ];
    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
    throw new Error(`Cannot find binary: ${name}`);
  }
}

const tscAlias = bin("tsc-alias");
const alias = spawnSync(tscAlias, ["-p", "tsconfig.build.json"], {
  cwd: apiRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (alias.status !== 0) process.exit(alias.status ?? 1);

const main = resolve(apiRoot, "dist/apps/api/src/main.js");
const node = spawnSync(process.execPath, [main], {
  cwd: apiRoot,
  stdio: "inherit",
});
process.exit(node.status ?? 1);
