import { execSync } from 'child_process';

function run(cmd: string) {
    console.log(`$ ${cmd}`);
    return execSync(cmd, { stdio: 'inherit' });
}

function checkCleanWorkingTree() {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (status.trim()) {
        console.error('❌ 检测到未提交的更改，请先提交或暂存后再执行。');
        process.exit(1);
    } else {
        console.log('✅ 工作区干净，开始执行...');
    }
}

function cleanDanglingTags() {
    const allTags = execSync('git tag', { encoding: 'utf-8' }).split('\n').filter(Boolean);
    const mergedTags = execSync('git tag --merged HEAD', { encoding: 'utf-8' }).split('\n').filter(Boolean);
    const danglingTags = allTags.filter(tag => !mergedTags.includes(tag));
    if (danglingTags.length > 0) {
        console.log('⚠️ 检测到悬空 tag：', danglingTags.join(', '));
        danglingTags.forEach(tag => {
            run(`git tag -d ${tag}`);
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
    console.log(`⚠️ 正在回滚到 ${to} ...`);
    run(`git reset --hard ${to}`);
    if (tag) {
        console.log(`⚠️ 删除本地 tag: ${tag}`);
        run(`git tag -d ${tag}`);
        console.log(`⚠️ 删除远程 tag: ${tag}`);
        run(`git push origin :refs/tags/${tag}`);
    }
}

function main() {
    checkCleanWorkingTree();
    cleanDanglingTags();

    const backup = getCurrentCommit();
    let newTag = '';

    try {
        run('npm version patch');
        newTag = getLatestTag();
        console.log(`✅ 新 tag: ${newTag}`);
        run('git push --follow-tags');

        console.log('🎉 发布成功！');
    } catch (error) {
        console.error('❌ 出错: ', (error as Error).message);
        rollback(backup, newTag);
        process.exit(1);
    }
}

main();
