const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const root = process.cwd();

function getGitBranch() {
    return childProcess.execSync('git rev-parse --abbrev-ref HEAD', { 'encoding': 'utf8' }).trim();
}

const packagePath = path.join(root, 'package.json');
const scriptsPath = path.join(root, 'scripts');
const scriptMataPath = path.join(scriptsPath, 'mata.ts');

let package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

fs.copyFileSync(path.join(root, 'temp', 'user.js'), path.join(root, 'dist', getGitBranch(), `${package.displayName}.user.js`));
fs.copyFileSync(scriptMataPath, path.join(root, 'dist', getGitBranch(), `${package.displayName}.mata.js`));
