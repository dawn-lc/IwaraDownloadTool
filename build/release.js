const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const root = process.cwd();
function mkdir(path) {
    return fs.existsSync(path) || fs.mkdirSync(path)
}

function getGitBranch() {
    return childProcess.execSync('git rev-parse --abbrev-ref HEAD', { 'encoding': 'utf8' }).trim();
}

const packagePath = path.join(root, 'package.json');
const tempPath = path.join(root, 'temp');
const distPath = path.join(root, 'dist');
const branchPath = path.join(distPath, getGitBranch());

mkdir(tempPath);
mkdir(distPath);
mkdir(branchPath);
const mainTempPath = path.join(tempPath, 'main.js');
const mataTempPath = path.join(tempPath, 'mata.js');

let package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

let main = fs.readFileSync(mainTempPath, 'utf8');
let mata = fs.readFileSync(mataTempPath, 'utf8');

fs.writeFileSync(path.join(distPath, getGitBranch(), `${package.displayName}.user.js`), [mata, main].join('\n'));
fs.writeFileSync(path.join(distPath, getGitBranch(), `${package.displayName}.mata.js`), mata);
