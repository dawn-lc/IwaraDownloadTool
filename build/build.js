const root = process.cwd();
import { promises } from 'fs';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import esbuild from 'esbuild';

var isNull = (obj) => obj === null;
var isUndefined = (obj) => typeof obj === "undefined";
var isNullOrUndefined = (obj) => isUndefined(obj) || isNull(obj);
var isObject = (obj) => !isNull(obj) && typeof obj === "object" && !Array.isArray(obj);
var isString = (obj) => !isNull(obj) && typeof obj === "string";
var isNumber = (obj) => !isNull(obj) && typeof obj === "number";
var isArray = (obj) => Array.isArray(obj);
var isElement = (obj) => !isNull(obj) && obj instanceof Element;
var isNode = (obj) => !isNull(obj) && obj instanceof Node;
const hasFunction = (obj, method) => {
    return !method.isEmpty() && !isNullOrUndefined(obj) ? method in obj && typeof obj[method] === 'function' : false;
};
const getString = (obj) => {
    obj = obj instanceof Error ? String(obj) : obj;
    return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj);
};
Array.prototype.any = function () {
    return this.prune().length > 0;
};
Array.prototype.prune = function () {
    return this.filter(i => i !== null && typeof i !== 'undefined');
};
Array.prototype.unique = function (prop) {
    return this.filter((item, index, self) => index === self.findIndex((t) => (prop ? t[prop] === item[prop] : t === item)));
};
Array.prototype.union = function (that, prop) {
    return [...this, ...that].unique(prop);
};
Array.prototype.intersect = function (that, prop) {
    return this.filter((item) => that.some((t) => prop ? t[prop] === item[prop] : t === item)).unique(prop);
};
Array.prototype.difference = function (that, prop) {
    return this.filter((item) => !that.some((t) => prop ? t[prop] === item[prop] : t === item)).unique(prop);
};
Array.prototype.complement = function (that, prop) {
    return this.union(that, prop).difference(this.intersect(that, prop), prop);
};
String.prototype.isEmpty = function () {
    return !isNullOrUndefined(this) && this.length === 0;
};
String.prototype.among = function (start, end, greedy = false) {
    if (this.isEmpty() || start.isEmpty() || end.isEmpty())
        return '';
    const startIndex = this.indexOf(start);
    if (startIndex === -1)
        return '';
    const adjustedStartIndex = startIndex + start.length;
    const endIndex = greedy ? this.lastIndexOf(end) : this.indexOf(end, adjustedStartIndex);
    if (endIndex === -1 || endIndex < adjustedStartIndex)
        return '';
    return this.slice(adjustedStartIndex, endIndex);
};
String.prototype.splitLimit = function (separator, limit) {
    if (this.isEmpty() || isNullOrUndefined(separator)) {
        throw new Error('Empty');
    }
    let body = this.split(separator);
    return limit ? body.slice(0, limit).concat(body.slice(limit).join(separator)) : body;
};
String.prototype.truncate = function (maxLength) {
    return this.length > maxLength ? this.substring(0, maxLength) : this.toString();
};
String.prototype.trimHead = function (prefix) {
    return this.startsWith(prefix) ? this.slice(prefix.length) : this.toString();
};
String.prototype.trimTail = function (suffix) {
    return this.endsWith(suffix) ? this.slice(0, -suffix.length) : this.toString();
};
String.prototype.replaceEmojis = function (replace) {
    return this.replaceAll(emojiRegex, replace ?? '');
};
String.prototype.replaceVariable = function (replacements, count = 0) {
    let replaceString = Object.entries(replacements).reduce(
        (str, [key, value]) => {
            if (str.includes(`%#${key}:`)) {
                let format = str.among(`%#${key}:`, '#%').toString();
                return str.replaceAll(`%#${key}:${format}#%`, getString(hasFunction(value, 'format') ? value.format(format) : value));
            } else {
                return str.replaceAll(`%#${key}#%`, getString(value));
            }
        },
        this.toString()
    );
    count++;
    return Object.keys(replacements).map(key => this.includes(`%#${key}#%`)).includes(true) && count < 128 ?
        replaceString.replaceVariable(replacements, count) : replaceString;
};
function prune(obj) {
    if (isArray(obj)) {
        return obj.filter(isNotEmpty).map(prune);
    }
    if (isElement(obj) || isNode(obj)) {
        return obj;
    }
    if (isObject(obj)) {
        return Object.fromEntries(Object.entries(obj)
            .filter(([key, value]) => isNotEmpty(value))
            .map(([key, value]) => [key, prune(value)]));
    }
    return isNotEmpty(obj) ? obj : undefined;
}
function isNotEmpty(obj) {
    if (isNullOrUndefined(obj)) {
        return false;
    }
    if (isArray(obj)) {
        return obj.some(isNotEmpty);
    }
    if (isString(obj)) {
        return !obj.isEmpty();
    }
    if (isNumber(obj)) {
        return !Number.isNaN(obj);
    }
    if (isElement(obj) || isNode(obj)) {
        return true;
    }
    if (isObject(obj)) {
        return Object.values(obj).some(isNotEmpty);
    }
    return true;
}
function parseMetadata(content) {
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
        const [key, value] = line.splitLimit(' ', 1).map(i=> i.trim()).filter(i => !i.isEmpty());
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
function serializeMetadata(metadata) {
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
const UUID = function () {
    return isNullOrUndefined(crypto) ? Array.from({ length: 8 }, () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)).join('') : crypto.randomUUID().replaceAll('-','')
}

function mkdir(path) {
    return existsSync(path) || mkdirSync(path)
}

const distPath = join(root, 'dist');

mkdir(distPath);

const sourcePath = join(root, 'src');

const packagePath = join(root, 'package.json');
let packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));

const mataTemplatePath = join(sourcePath, 'userjs.mata');

const mataTempPath= join(distPath, `${packageInfo.displayName}.mata.js`);

let mataTemplate = parseMetadata(readFileSync(mataTemplatePath, 'utf8'));
let mata = {...mataTemplate};

mata.version = `${packageInfo.version}${process.argv[2] === 'dev' ? '-dev.' + UUID() : '' }`;

console.log(mata.version);

mata.updateURL = mata.updateURL.replaceVariable({
    'release_tag': process.argv[2]
});
mata.downloadURL = mata.downloadURL.replaceVariable({
    'release_tag': process.argv[2]
});

const matadata = serializeMetadata(mata)

writeFileSync(mataTempPath, matadata);


const mainPath = join(sourcePath, 'main.ts');
const cssPath = join(sourcePath, 'main.css');

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
        js: matadata
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
        js: matadata
    },
    platform: 'browser',
    loader: { '.json': 'json' },
    target: ['es2022'],
    legalComments: 'none',
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