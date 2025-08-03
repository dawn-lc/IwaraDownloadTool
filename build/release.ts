import { execSync } from 'child_process';
import { readFileSync } from 'fs';

function run(cmd: string) {
    console.log(`$ ${cmd}`);
    try {
        return execSync(cmd, { stdio: 'inherit' });
    } catch (error) {
        console.error(`❌ 命令执行失败: ${cmd}`);
        throw error;
    }
}

function checkCleanWorkingTree() {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (status.trim()) {
        console.error('❌ 检测到未提交的更改，请先提交或暂存后再执行。');
        process.exit(1);
    }
    console.log('✅ 工作区干净');
}

function fetchLatestTags() {
    console.log('🔄 同步远程标签...');
    run('git fetch --tags');
}

function cleanDanglingTags() {
    fetchLatestTags();

    const allTags = execSync('git tag', { encoding: 'utf-8' }).split('\n').filter(Boolean);
    const mergedTags = new Set(execSync('git tag --merged HEAD', { encoding: 'utf-8' }).split('\n').filter(Boolean));

    const danglingTags = allTags.filter(tag => !mergedTags.has(tag));

    if (danglingTags.length > 0) {
        console.log(`⚠️ 检测到 ${danglingTags.length} 个悬空标签`);
        danglingTags.forEach(tag => {
            try {
                run(`git tag -d ${tag}`);
                console.log(`🗑️ 已删除本地标签: ${tag}`);
            } catch {
                console.warn(`⚠️ 删除标签失败: ${tag} (可能已被其他进程删除)`);
            }
        });
    } else {
        console.log('✅ 无悬空标签');
    }
}

function getCurrentCommit(): string {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
}

function getLatestTag(): string {
    try {
        return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
    } catch {
        return ''; // 初始项目可能没有标签
    }
}

function getCurrentBranch(): string {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
}

function getPackageVersion(): string {
    try {
        const raw = readFileSync('package.json', 'utf-8');
        const json = JSON.parse(raw);

        if (!json.version || typeof json.version !== 'string') {
            throw new Error('package.json 中未找到有效的 version 字段');
        }

        return json.version;
    } catch (error) {
        console.error('❌ 读取或解析 package.json 失败');
        throw error;
    }
}

function rollback(commit: string, tag?: string) {
    console.log(`⏪ 回滚到提交: ${commit}`);
    run(`git reset --hard ${commit}`);

    if (tag) {
        try {
            console.log(`🗑️ 删除本地标签: ${tag}`);
            run(`git tag -d ${tag}`);
        } catch {
            console.warn(`⚠️ 本地标签 ${tag} 删除失败 (可能不存在)`);
        }

        try {
            console.log(`🌐 删除远程标签: ${tag}`);
            run(`git push --delete origin ${tag}`);
        } catch {
            console.warn(`⚠️ 远程标签 ${tag} 删除失败 (可能未推送)`);
        }
    }

    // 使用更安全的强制推送方式
    const branch = getCurrentBranch();
    try {
        console.log(`🌐 尝试安全覆盖远程分支 ${branch}...`);
        console.log('ℹ️ 使用 --force-with-lease 防止覆盖他人提交');
        run(`git push --force-with-lease origin ${branch}`);
    } catch {
        console.warn(`⚠️ 安全强制推送失败！`);
        console.warn(`⚠️ 可能原因：远程分支已被他人更新或 CI/CD 正在运行`);
        console.warn(`⚠️ 请手动检查后执行：`);
        console.warn(`    git push --force-with-lease origin ${branch}`);
        console.warn(`或根据情况解决冲突后再推送`);
    }

    console.log('🔄 本地工作区已恢复');
}

function main() {
    checkCleanWorkingTree();
    cleanDanglingTags();

    const backupCommit = getCurrentCommit();
    const backupTag = getLatestTag();
    let newTag = '';

    console.log('🏷️ 当前版本:', backupTag || '无');
    console.log('🔒 备份当前提交:', backupCommit);

    try {
        console.log('🆙 更新版本号...');
        run('npm version patch --no-git-tag-version');

        // 使用健壮的版本号获取函数
        const version = getPackageVersion();
        newTag = `v${version}`;

        console.log('💾 创建版本提交...');
        run('git add package*.json');
        run(`git commit -m "release: ${newTag}"`);

        console.log('🏷️ 创建带注释的标签...');
        run(`git tag -a ${newTag} -m "Version ${version}"`);

        console.log('🚀 推送代码...');
        run('git push');

        console.log('🚀 推送新标签...');
        run(`git push origin ${newTag}`);

        console.log(`🎉 成功发布版本 ${newTag}`);
    } catch (error) {
        console.error('❌ 发布失败:', error);
        rollback(backupCommit, newTag);
        process.exit(1);
    }
}

main();