const path = require('path');
const fs = require('fs');
const root = process.cwd();

const packagePath = path.join(root, 'package.json');
const scriptsPath = path.join(root, 'scripts');
const scriptMataPath = path.join(scriptsPath, 'mata.ts');

let package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

fs.copyFileSync(path.join(root, 'temp', 'user.js'), path.join(root, 'dist', `${package.displayName}.user.js`));
fs.copyFileSync(scriptMataPath, path.join(root, 'dist', `${package.displayName}.mata.js`));
