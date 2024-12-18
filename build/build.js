const root = process.cwd();
import { promises } from 'fs';
import { join } from 'path';
import esbuild from 'esbuild';
import { readFileSync } from 'fs';

const packagePath = join(root, 'package.json');
const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));

const sourcePath = join(root, 'src');
const distPath = join(root, 'dist');

const mainPath = join(sourcePath, 'main.ts');
const cssPath = join(sourcePath, 'main.css');

const mata = readFileSync(join(distPath, `${packageInfo.displayName}.mata.js`), 'utf8');

const distUncompressPath = join(distPath, `${packageInfo.displayName}.user.js`);
const distCompressPath = join(distPath, `${packageInfo.displayName}.min.user.js`);

let result = esbuild.buildSync({
    entryPoints: [cssPath],
    write: false,
    minify: true,
    loader: {
        '.css': 'css'
    },
    platform: 'browser',
    charset: 'utf8'
});

if (result.errors.length > 0) {
    debugger
    process.exit(1);
}
const css = result.outputFiles.at(0).text.replaceAll(/\r?\n/g, '');


esbuild.build({
    allowOverwrite: true,
    format: 'iife',
    entryPoints: [mainPath],
    bundle: true,
    outfile: distUncompressPath,
    treeShaking: false,
    minify: false,
    sourcemap: false,
    banner: {
        js: mata
    },
    platform: 'browser',
    target: ['es2022'],
    loader: { '.json': 'json' },
    legalComments: 'none', 
    charset: 'utf8'
}).then(() => {
    promises.readFile(distUncompressPath, 'utf8')
        .then(data => {
            const processed = data
                .replaceAll('/* @__PURE__ */','')
                .replaceAll(/\r?\n/g, '\r\n')
                .replaceAll('"@!mainCSS!@"', `\`${css}\``);
            return promises.writeFile(distUncompressPath, processed);
        })
        .catch(err => console.error('Error during file processing:', err));
}).catch(() => process.exit(1));

esbuild.build({
    keepNames: true,
    allowOverwrite: true,
    format: 'iife',
    entryPoints: [mainPath],
    bundle: true,
    outfile: distCompressPath,
    minify: true,
    banner: {
        js: mata
    },
    platform: 'browser',
    loader: { '.json': 'json' },
    target: ['es2022'],
    charset: 'utf8'
}).then(() => {
    promises.readFile(distCompressPath, 'utf8')
        .then(data => {
            const processed = data
                .replaceAll('"@!mainCSS!@"', `\`${css}\``);
            return promises.writeFile(distCompressPath, processed);
        })
        .catch(err => console.error('Error during file processing:', err));
}).catch(() => process.exit(1));