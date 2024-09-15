const root = process.cwd();
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { minify } = require('terser');
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
    fs.writeFileSync(path.normalize(fileName), data);
    outputFiles.push({ fileName: path.normalize(fileName), content: data });
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
