import { execSync } from 'child_process';

function run(cmd: string) {
    console.log(`$ ${cmd}`);
    return execSync(cmd, { stdio: 'inherit' });
}
function cleanDanglingTags() {
    const allTags = execSync('git tag', { encoding: 'utf-8' }).split('\n').filter(Boolean);
    const mergedTags = execSync('git tag --merged HEAD', { encoding: 'utf-8' }).split('\n').filter(Boolean);

    const danglingTags = allTags.filter(tag => !mergedTags.includes(tag));

    if (danglingTags.length > 0) {
        console.log('⚠️ 检测到悬空 tag：', danglingTags.join(', '));
        danglingTags.forEach(tag => {
            execSync(`git tag -d ${tag}`, { stdio: 'inherit' });
        });
    } else {
        console.log('✅ 没有悬空 tag');
    }
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

cleanDanglingTags();
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
