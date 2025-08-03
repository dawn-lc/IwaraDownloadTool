import { execSync } from 'child_process';

function run(cmd: string) {
    console.log(`$ ${cmd}`);
    return execSync(cmd, { stdio: 'inherit' });
}

function getCurrentCommit(): string {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
}

function getLatestTag(): string {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
}

function rollback(to: string, tag?: string) {
    console.log(`⚠️ 回滚到 ${to}...`);
    execSync(`git reset --hard ${to}`, { stdio: 'inherit' });

    if (tag) {
        console.log(`⚠️ 删除 tag: ${tag}`);
        execSync(`git tag -d ${tag}`, { stdio: 'inherit' });
    }
}

const backup = getCurrentCommit();

try {
    run('npm version patch');
    const newTag = getLatestTag();

    run('git add .');
    run('git commit --amend --no-edit');
    run('git push --follow-tags');

    console.log('✅ 成功！');

} catch (error) {
    console.error('❌ 出错: ', (error as Error).message);

    const newTag = getLatestTag();
    rollback(backup, newTag);

    process.exit(1);
}
