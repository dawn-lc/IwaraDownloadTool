import { join } from 'path';
import { existsSync, mkdirSync as _mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
const root = process.cwd();

function mkdirSync(dir) {
    if (!existsSync(dir)) {
        _mkdirSync(dir, { recursive: true });
    }
}

const packagePath = join(root, 'package.json');
const tempPath = join(root, 'temp');
mkdirSync(tempPath);

const paths = {
    main: join(tempPath, 'main.js'),
    minMain: join(tempPath, 'main.min.js'),
    mata: join(tempPath, 'mata.js')
};

const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));

const main = readFileSync(paths.main, 'utf8');
const minMain = readFileSync(paths.minMain, 'utf8');
const mata = readFileSync(paths.mata, 'utf8');

const displayName = packageInfo.displayName;
const fileContents = {
    [`${displayName}.min.user.js`]: [mata, minMain].join('\r\n'),
    [`${displayName}.user.js`]: [mata, main].join('\r\n'),
    [`${displayName}.mata.js`]: mata
};

for (const [fileName, content] of Object.entries(fileContents)) {
    writeFileSync(join(tempPath, fileName), content);
}

for (const file of Object.values(paths)) {
    unlinkSync(file);
}
