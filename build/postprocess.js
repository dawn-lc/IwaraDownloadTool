const path = require('path');
const fs = require('fs');
const root = process.cwd();
function mkdir(path) {
    return fs.existsSync(path) || fs.mkdirSync(path)
}

const packagePath = path.join(root, 'package.json');
const tempPath = path.join(root, 'temp');
mkdir(tempPath);

const mainTempPath = path.join(tempPath, 'main.js');
const mataTempPath = path.join(tempPath, 'mata.js');

let package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

let main = fs.readFileSync(mainTempPath, 'utf8');
let mata = fs.readFileSync(mataTempPath, 'utf8');

fs.writeFileSync(path.join(tempPath, `${package.displayName}.user.js`), [mata, main].join('\n'));
fs.writeFileSync(path.join(tempPath, `${package.displayName}.mata.js`), mata);
