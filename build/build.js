const root = process.cwd();
const childProcess = require('child_process');
return childProcess.execSync(`node ./node_modules/typescript/lib/tsc.js --newLine crlf --removeComments --project ${root}`);