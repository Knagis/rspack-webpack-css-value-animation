import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import webpack from "webpack";
import { rspack } from "@rspack/core";

const dir = path.dirname(fileURLToPath(import.meta.url));

const config = (out) => ({
    mode: "development",
    devtool: false,
    context: dir,
    entry: path.join(dir, "src/index.js"),
    output: { path: path.join(dir, out) },
    experiments: { css: true },
    module: { rules: [{ test: /\.css$/, type: "css/module" }] },
});

function run(name, compiler, out) {
    return new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            if (err || stats.hasErrors()) {
                reject(err ?? new Error(stats.toString({ preset: "errors-only" })));
                return;
            }
            const css = fs.readFileSync(path.join(dir, out, "main.css"), "utf8")
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .trim();
            console.log(`===== ${name} output =====\n${css}\n`);
            resolve();
        });
    });
}

await run("webpack", webpack(config("dist-webpack")), "dist-webpack");
await run("rspack", rspack(config("dist-rspack")), "dist-rspack");
