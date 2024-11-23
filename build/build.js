const root = process.cwd();
import { promises } from 'fs';
import { join } from 'path';
import esbuild from 'esbuild';
import { readFileSync} from 'fs';

const packagePath = join(root, 'package.json');
const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));

const sourcePath = join(root, 'src');
const outPath = join(root, 'temp');

const mainPath = join(sourcePath, 'main.ts');
const cssPath = join(sourcePath, 'main.css');

const mata = readFileSync(join(outPath, `${packageInfo.displayName}.mata.js`), 'utf8');

const distPath = join(outPath, `${packageInfo.displayName}.user.js`);
const distCompressPath = join(outPath, `${packageInfo.displayName}.min.user.js`);

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
    entryPoints: [mainPath],
    bundle: true,
    outfile: distPath,
    minify: false,
    banner: {
        js: mata
    },
    platform: 'browser',
    target: ['es2022'],
    loader: { '.json': 'json' },
    charset: 'utf8'
})
.then(() => {
    promises.readFile(distPath, 'utf8')
        .then(data => {
            const processed = data
                .replaceAll(/\r?\n/g, '\r\n')
                .replaceAll('"@!mainCSS!@"', `\`${css}\``);
            return promises.writeFile(distPath, processed);
        })
        .catch(err => console.error('Error during file processing:', err));
})
.catch(() => process.exit(1));

esbuild.build({
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
})
.then(() => {
    promises.readFile(distCompressPath, 'utf8')
        .then(data => {
            const processed = data
                .replaceAll('"@!mainCSS!@"', `\`${css}\``);
            return promises.writeFile(distCompressPath, processed);
        })
        .catch(err => console.error('Error during file processing:', err));
})
.catch(() => process.exit(1));



/*
const configPath = path.resolve(root, 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

if (configFile.error) {
    console.error('Error reading tsconfig.json:', configFile.error.messageText);
    process.exit(1);
}

const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
);


const program = ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
});

let outputFiles = [];

const emitResult = program.emit(undefined, (fileName, data) => {
    let code = data.replaceAll('`!mainCSS!`', `\`${css}\``);
    fs.writeFileSync(path.normalize(fileName), code);
    outputFiles.push({ fileName: path.normalize(fileName), content: code });
});

const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
        console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
});

const exitCode = emitResult.emitSkipped ? 1 : 0;
if (exitCode !== 0) {
    console.error('Compilation failed.');
    process.exit(exitCode);
}

async function minifyOutputFiles() {
    for (const file of outputFiles) {
        console.log(`Minifying ${file.fileName}...`);
        const result = await minify(file.content, { compress: true, sourceMap: false });
        if (result.code) {
            const minifiedFileName = path.format({
                dir: path.parse(file.fileName).dir,
                name: path.parse(file.fileName).name,
                ext: '.min.js',
                base: undefined
            });
            fs.writeFileSync(minifiedFileName, result.code);
            console.log(`Minified file written to ${minifiedFileName}`);
        }
    }
}

minifyOutputFiles().then(() => {
    console.log('All files have been minified.');
    process.exit(exitCode);
}).catch(err => {
    console.error('Error during minification:', err);
    process.exit(1);
});
*/