import { execSync } from "node:child_process";

async function main() {
  execSync("pnpm data:convert");
  execSync("pnpm data:generate");
  execSync("pnpm data:aggregate");
}

main();
