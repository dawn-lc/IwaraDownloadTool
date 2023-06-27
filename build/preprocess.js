const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const root = process.cwd();

const isNull = function (obj) {
    return typeof obj === 'undefined' || obj === null;
};
const notNull = function (obj) {
    return typeof obj !== 'undefined' && obj !== null;
};
String.prototype.isEmpty = function () {
    return notNull(this) && this.trim().length === 0;
};
String.prototype.notEmpty = function () {
    return notNull(this) && this.trim().length !== 0;
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
String.prototype.trimHead = function (prefix) {
    return this.startsWith(prefix) ? this.slice(prefix.length) : this.toString();
};
String.prototype.trimTail = function (suffix) {
    return this.endsWith(suffix) ? this.slice(0, -suffix.length) : this.toString();
};
const hasFunction = function (obj, method) {
    return method.notEmpty() && notNull(obj) ? method in obj && typeof obj[method] === 'function' : false;
};
const getString = function (obj) {
    obj = obj instanceof Error ? String(obj) : obj;
    return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj);
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
Array.prototype.any = function () {
    return this.prune().length > 0;
};
Array.prototype.prune = function () {
    return this.filter(i => i !== null && typeof i !== 'undefined');
};
Array.prototype.append = function (arr) {
    this.push(...arr);
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
            (notNull(result[key])
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
    return results.join('\n');
};

function getGitHash() {
    return childProcess.execSync('git rev-parse --short HEAD', { 'encoding': 'utf8' }).trim();
}

function getGitBranch() {
    return childProcess.execSync('git rev-parse --abbrev-ref HEAD', { 'encoding': 'utf8' }).trim();
}
function addVersion(versionString) {
    let version = versionString.split('.').map(Number);
    version[version.length - 1] = version[version.length - 1] + 1;
    return version.join('.');
}
const packagePath = path.join(root, 'package.json');
const scriptsPath = path.join(root, 'scripts');
const scriptMataPath = path.join(scriptsPath, 'mata.ts');

let package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
let scriptMata = parseMetadata(fs.readFileSync(scriptMataPath, 'utf8'));

package.version = addVersion(package.version);
scriptMata.version = package.version;

scriptMata.updateURL = scriptMata.updateURL.replaceVariable({
    'branch': getGitBranch(),
    'hash': getGitHash()
});
scriptMata.downloadURL = scriptMata.downloadURL.replaceVariable({
    'branch': getGitBranch(),
    'hash': getGitHash()
});

fs.writeFileSync(packagePath, JSON.stringify(package, null, 2));
fs.writeFileSync(scriptMataPath, serializeMetadata(scriptMata));