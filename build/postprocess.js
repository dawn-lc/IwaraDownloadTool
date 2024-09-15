const path = require('path');
const fs = require('fs');
const root = process.cwd();

function mkdirSync(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

const packagePath = path.join(root, 'package.json');
const tempPath = path.join(root, 'temp');
mkdirSync(tempPath);

const paths = {
    main: path.join(tempPath, 'main.js'),
    minMain: path.join(tempPath, 'main.min.js'),
    mata: path.join(tempPath, 'mata.js')
};

const package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const main = fs.readFileSync(paths.main, 'utf8');
const minMain = fs.readFileSync(paths.minMain, 'utf8');
const mata = fs.readFileSync(paths.mata, 'utf8');

const displayName = package.displayName;
const fileContents = {
    [`${displayName}.min.user.js`]: [mata, minMain].join('\r\n'),
    [`${displayName}.user.js`]: [mata, main].join('\r\n'),
    [`${displayName}.mata.js`]: mata
};

for (const [fileName, content] of Object.entries(fileContents)) {
    fs.writeFileSync(path.join(tempPath, fileName), content);
}

for (const file of Object.values(paths)) {
    fs.unlinkSync(file);
}
