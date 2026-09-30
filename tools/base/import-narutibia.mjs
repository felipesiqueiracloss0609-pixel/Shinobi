import path from "node:path";
import { fileURLToPath } from "node:url";
import { importNarutibiaBase } from "../../electron/base-importer.mjs";

const [, , sourceArg, outputArg] = process.argv;
if (!sourceArg) {
  console.error("Uso: npm run base:import -- <pasta-da-base> [saida]");
  process.exit(1);
}

const sourceDir = path.resolve(sourceArg);
const outputDir = path.resolve(outputArg ?? "./exports/base-pack");

try {
  await importNarutibiaBase({
    sourceDir,
    outputDir,
    progress(percent, stage, detail) {
      console.log(percent + "% | " + stage + " | " + detail);
    }
  });
} catch (error) {
  console.error(error);
  process.exit(2);
}
