const { execSync } = require('child_process');
execSync('npm version patch --no-git-tag-version');
execSync('git add .');
execSync('git commit --amend --no-edit');