const root = process.cwd();
import esbuild from 'esbuild';
import { promises,existsSync, mkdirSync, readFileSync, writeFileSync  } from 'fs';
import { join } from 'path';
import { isNullOrUndefined, UUID } from "../src/env.ts";
import inlineCSS from './inlineCSS.ts';
import removeComments from './removeComments.ts';

function parseMetadata(content: string): any {
    const lines = content
        .among('// ==UserScript==', '// ==/UserScript==')
        .split('\n')
        .filter(i => !i.isEmpty())
        .map(line => line.trimHead('// @'));
    if (!lines.any()) {
        throw new Error("No metadata block found");
    }
    let results = {};
    lines.reduce((result, line) => {
        const [key, value] = line.splitLimit(' ', 1).map(i => i.trim()).filter(i => !i.isEmpty());
        !isNullOrUndefined(key) && !isNullOrUndefined(value) &&
            !key.isEmpty() && !value.isEmpty()
            &&
            (!isNullOrUndefined(result[key])
                ? Array.isArray(result[key])
                    ? result[key].push(value)
                    : result[key] = [result[key], value]
                : result[key] = value
            );
        return result;
    }, results);
    return results;
};
function serializeMetadata(metadata: any): string {
    let pad = Object.keys(metadata).reduce((a, b) => a.length > b.length ? a : b).length + 1;
    let results = ['// ==UserScript=='];
    Object.entries(metadata).reduce((result, [key, value]) => {
        Array.isArray(value)
            ? result.push(...value.map(v => `// @${key.padEnd(pad, ' ')}${v}`))
            : result.push(`// @${key.padEnd(pad, ' ')}${value}`);
        return result;
    }, results);
    results.push('// ==/UserScript==');
    return results.join('\r\n');
};

function mkdir(path) {
    return existsSync(path) || mkdirSync(path)
}

const distPath = join(root, 'dist');

mkdir(distPath);

const sourcePath = join(root, 'src');

const packagePath = join(root, 'package.json');
let packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));

const tsconfigPath = join(root, 'tsconfig.json');
let tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));

const mataTemplatePath = join(sourcePath, 'mata', 'userjs.mata');

const mataTempPath = join(distPath, `${packageInfo.displayName}.mata.js`);

let mataTemplate = parseMetadata(readFileSync(mataTemplatePath, 'utf8'));
let mata = { ...mataTemplate };

const releaseTag = process.argv[2] ?? 'dev';
mata.version = `${packageInfo.version}${releaseTag === 'dev' ? '-dev.' + UUID() : ''}`;

console.log(mata.version);

mata.updateURL = mata.updateURL.replaceVariable({
    'release_tag': releaseTag
});
mata.downloadURL = mata.downloadURL.replaceVariable({
    'release_tag': releaseTag
});

const matadata = serializeMetadata(mata)

writeFileSync(mataTempPath, matadata);


const mainPath = join(sourcePath, 'main.ts');

const distCompressPath = join(distPath, `${packageInfo.displayName}.min.user.js`);
const distUncompressPath = join(distPath, `${packageInfo.displayName}.user.js`);
esbuild.build({
    keepNames: true,
    allowOverwrite: true,
    format: 'iife',
    entryPoints: [mainPath],
    bundle: true,
    outfile: distCompressPath,
    minify: true,
    banner: {
        js: matadata
    },
    platform: 'browser',
    loader: { '.json': 'json'},
    target: ['es2022'],
    plugins: [inlineCSS, removeComments],
    charset: 'utf8',
    tsconfigRaw: tsconfig
}).catch(() => process.exit(1));


esbuild.build({
    entryPoints: [mainPath],
    format: 'iife',
    bundle: true,
    write: false,
    treeShaking: false,
    minify: false,
    sourcemap: false,
    banner: {
        js: matadata
    },
    platform: 'browser',
    target: ['es2022'],
    loader: { '.json': 'json'},
    plugins: [inlineCSS, removeComments],
    charset: 'utf8',
    tsconfigRaw: tsconfig
}).then(async (result)=>{
    if (result.outputFiles.any()) {
        let output = result.outputFiles[0].text
            .replace(/\r?\n/gm, '\r\n')
            .replaceAll('/* @__PURE__ */', '')
            .replace(/.*\/\/ (?![=@]).*$/gm,'')
            .replace(/^\s*$/gm,'');
        await promises.writeFile(distUncompressPath, output);
    } else {
        process.exit(1);
    }
}).catch(() => process.exit(1));
