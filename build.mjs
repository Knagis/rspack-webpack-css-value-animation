import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import webpack from "webpack";
import { rspack } from "@rspack/core";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nativeConfig = (out) => ({
    mode: "development",
    devtool: false,
    context: dir,
    entry: path.join(dir, "src/index.js"),
    output: { path: path.join(dir, out) },
    experiments: { css: true },
    module: { rules: [{ test: /\.css$/, type: "css/module" }] },
});

// classic pipeline for comparison: css-loader implements @value itself and emits the
// CSS as a string inside the JS bundle (no extract plugin needed for this repro)
const cssLoaderConfig = (out) => ({
    mode: "development",
    devtool: false,
    context: dir,
    entry: path.join(dir, "src/index.js"),
    output: { path: path.join(dir, out) },
    module: { rules: [{ test: /\.css$/, use: [{ loader: "css-loader", options: { modules: true } }] }] },
});

const readMainCss = (out) => fs.readFileSync(path.join(dir, out, "main.css"), "utf8");

const readCssFromJsBundle = (out) => {
    const js = fs.readFileSync(path.join(dir, out, "main.js"), "utf8");
    const match = /___CSS_LOADER_EXPORT___\.push\(\[module\.id, ("(?:[^"\\]|\\.)*")/.exec(js);
    if (!match) throw new Error("Could not find the CSS string in the css-loader JS bundle.");
    return JSON.parse(match[1]);
};

function run(name, compiler, readCss) {
    return new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            if (err || stats.hasErrors()) {
                reject(err ?? new Error(stats.toString({ preset: "errors-only" })));
                return;
            }
            const css = readCss()
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .trim();
            console.log(`===== ${name} output =====\n${css}\n`);
            resolve();
        });
    });
}

console.log(`===== input =====\n${fs.readFileSync(path.join(dir, "src/index.css"), "utf8").trim()}\n`);

await run("webpack (native css/module)", webpack(nativeConfig("dist-webpack")), () => readMainCss("dist-webpack"));
await run("rspack (native css/module)", rspack(nativeConfig("dist-rspack")), () => readMainCss("dist-rspack"));
await run("webpack + css-loader", webpack(cssLoaderConfig("dist-css-loader")), () => readCssFromJsBundle("dist-css-loader"));
