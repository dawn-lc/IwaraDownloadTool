const path = require('path');
const fs = require('fs');
const root = process.cwd();

const isNull = (obj) => typeof obj === 'undefined' || obj === null;
const isObject = (obj) => !isNull(obj) && typeof obj === 'object' && !Array.isArray(obj);
const hasFunction = (obj, method) => {
    return method.notEmpty() && !isNull(obj) ? method in obj && typeof obj[method] === 'function' : false;
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
Array.prototype.unique = function () {
    return Array.from(new Set(this));
};
Array.prototype.append = function (arr) {
    this.push(...arr);
};
String.prototype.isEmpty = function () {
    return !isNull(this) && this.length === 0;
};
String.prototype.notEmpty = function () {
    return !isNull(this) && this.length !== 0;
};
String.prototype.among = function (start, end) {
    if (this.isEmpty() || start.isEmpty() || end.isEmpty()) {
        throw new Error('Empty');
    }
    let body = this.split(start).pop().notEmpty() ? this.split(start).pop() : '';
    return body.split(end).shift().notEmpty() ? body.split(end).shift() : '';
};
String.prototype.splitLimit = function (separator, limit) {
    if (this.isEmpty() || isNull(separator)) {
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
String.prototype.among = function (start, end) {
    if (this.isEmpty() || start.isEmpty() || end.isEmpty()) {
        throw new Error('Empty');
    }
    let body = this.split(start).pop().notEmpty() ? this.split(start).pop() : '';
    return body.split(end).shift().notEmpty() ? body.split(end).shift() : '';
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
const prune = (obj) => {
    if (isNull(obj))
        return;
    if (isObject(obj))
        return (s => originalObject.entries(s).any() ? s : null)(originalObject.fromEntries(originalObject.entries(obj).map(([k, v]) => [k, prune(v)]).filter(([k, v]) => !isNull(v))));
    if (Array.isArray(obj))
        return ((t => t.any() ? t : null)(obj.map(prune).prune()));
    if (typeof obj === 'string')
        return obj.isEmpty() ? null : obj;
    return obj;
};

function parseMetadata(content) {
    const lines = content
        .among('// ==UserScript==', '// ==/UserScript==')
        .split('\n')
        .filter(i => i.notEmpty())
        .map(line => line.trimHead('// @'));
    if (!lines.any()) {
        throw new Error("No metadata block found");
    }
    let results = {};
    lines.reduce((result, line) => {
        const [key, value] = line.splitLimit(' ', 1).map(i=> i.trim()).filter(i => i.notEmpty());
        key.notEmpty() && value.notEmpty() &&
            (!isNull(result[key])
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
            ? result.append(value.map(v => `// @${key.padEnd(pad, ' ')}${v}`))
            : result.push(`// @${key.padEnd(pad, ' ')}${value}`);
        return result;
    }, results);
    results.push('// ==/UserScript==');
    return results.join('\r\n');
};

function mkdir(path) {
    return fs.existsSync(path) || fs.mkdirSync(path)
}
const tempPath = path.join(root, 'temp');

mkdir(tempPath);

const sourcePath = path.join(root, 'src');

const packagePath = path.join(root, 'package.json');
const mataTemplatePath = path.join(sourcePath, 'userjs.mata');
const mataTempPath= path.join(tempPath, 'mata.js');

let package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
let mataTemplate = parseMetadata(fs.readFileSync(mataTemplatePath, 'utf8'));
let mata = {...mataTemplate};

mata.version = package.version;

mata.updateURL = mata.updateURL.replaceVariable({
    'release_tag': process.argv[2]
});
mata.downloadURL = mata.downloadURL.replaceVariable({
    'release_tag': process.argv[2]
});

fs.writeFileSync(mataTempPath, serializeMetadata(mata));