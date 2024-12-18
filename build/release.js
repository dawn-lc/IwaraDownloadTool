import { execSync } from 'child_process';
execSync('npm version patch');
execSync('git add .');
execSync('git commit --amend --no-edit');
execSync('git push');