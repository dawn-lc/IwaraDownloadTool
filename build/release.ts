/**
 * 发布脚本
 * 职责：编排完整的版本发布流程
 * 通用 Git 操作委托给 git.ts
 */
import {
    run,
    checkCleanWorkingTree,
    cleanDanglingTags,
    checkAndCleanRebase,
    getCurrentCommit,
    getLatestTag,
    getPackageVersion,
    rollback,
} from './git.ts';

function log(message: string): void {
    console.log(`[release] ${message}`);
}

function warn(message: string): void {
    console.warn(`[release] ${message}`);
}

function error(message: string): void {
    console.error(`[release] ${message}`);
}

function main(): void {
    // 1. 前置检查
    checkCleanWorkingTree();
    cleanDanglingTags();

    const backupCommit = getCurrentCommit();
    const backupTag = getLatestTag();
    let newTag = '';

    log(`当前版本: ${backupTag || '无'}`);
    log(`备份提交: ${backupCommit}`);

    try {
        // 2. 升级版本号（patch）
        log('更新版本号...');
        run('npm version patch --no-git-tag-version');

        const version = getPackageVersion();
        newTag = `v${version}`;

        // 3. 提交版本变更
        log('创建版本提交...');
        run('git add package*.json');
        run(`git commit -m "release: ${newTag}"`);

        // 4. 打标签
        log('创建带注释的标签...');
        run(`git tag -a ${newTag} -m "Version ${version}"`);

        // 5. 清理残留 rebase 状态
        log('检查并清理未完成的 rebase 操作...');
        checkAndCleanRebase();

        // 6. 同步远程
        log('拉取远程最新分支以确保快进...');
        run('git pull --rebase');

        // 7. 推送
        log('推送代码...');
        run('git push');

        log('推送新标签...');
        run(`git push origin ${newTag}`);

        log(`成功发布版本 ${newTag}`);
        process.exit(0);
    } catch (err) {
        error(`发布失败: ${err}`);
        rollback(backupCommit, newTag);
        process.exit(1);
    }
}

main();