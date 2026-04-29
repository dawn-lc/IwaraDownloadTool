import { execSync } from 'child_process';
import { readFileSync, existsSync, rmSync } from 'fs';

// #region 命令执行

/**
 * 执行命令并输出到 stdio（用于有副作用的操作）
 */
export function run(cmd: string): void {
    try {
        execSync(cmd, { stdio: 'inherit' });
    } catch (error) {
        console.error(`命令执行失败: ${cmd}`);
        throw error;
    }
}

/**
 * 执行命令并返回去首尾空白的字符串结果
 */
export function exec(cmd: string): string {
    return execSync(cmd, { encoding: 'utf-8' }).trim();
}

// #endregion

// #region 仓库信息查询

export function getCurrentCommit(): string {
    return exec('git rev-parse --short HEAD');
}

export function getLatestTag(): string {
    try {
        return exec('git describe --tags --abbrev=0');
    } catch {
        return ''; // 初始项目可能没有标签
    }
}

export function getCurrentBranch(): string {
    return exec('git rev-parse --abbrev-ref HEAD');
}

export function getPackageVersion(): string {
    try {
        const raw = readFileSync('package.json', 'utf-8');
        const json = JSON.parse(raw) as Record<string, unknown>;

        if (!json.version || typeof json.version !== 'string') {
            throw new Error('package.json 中未找到有效的 version 字段');
        }

        return json.version;
    } catch (error) {
        console.error('读取或解析 package.json 失败');
        throw error;
    }
}

// #endregion

// #region 工作区检查与清理

export function checkCleanWorkingTree(): void {
    const status = exec('git status --porcelain');
    if (status) {
        console.error('检测到未提交的更改，请先提交或暂存后再执行。');
        process.exit(1);
    }
    console.log('工作区干净');
}

export function fetchLatestTags(): void {
    console.log('同步远程标签...');
    run('git fetch --tags --force');
}

export function cleanDanglingTags(): void {
    fetchLatestTags();

    const allTags = exec('git tag').split('\n').filter(Boolean);
    const mergedTags = new Set(exec('git tag --merged HEAD').split('\n').filter(Boolean));
    const danglingTags = allTags.filter((tag) => !mergedTags.has(tag));

    if (danglingTags.length > 0) {
        console.log(`检测到 ${danglingTags.length} 个悬空标签`);
        danglingTags.forEach((tag) => {
            try {
                run(`git tag -d ${tag}`);
                console.log(`已删除本地标签: ${tag}`);
            } catch {
                console.warn(`删除标签失败: ${tag} (可能已被其他进程删除)`);
            }
        });
    } else {
        console.log('无悬空标签');
    }
}

/**
 * 检查并清理未完成的 rebase 操作（跨平台兼容）
 */
export function checkAndCleanRebase(): void {
    const rebaseMergePath = '.git/rebase-merge';
    const rebaseApplyPath = '.git/rebase-apply';

    if (!existsSync(rebaseMergePath) && !existsSync(rebaseApplyPath)) {
        console.log('无未完成的 rebase 操作');
        return;
    }

    console.log('检测到未完成的 rebase 操作，正在清理...');

    try {
        execSync('git rebase --abort', { stdio: 'pipe' });
        console.log('已中止 rebase 操作');
    } catch {
        try {
            if (existsSync(rebaseMergePath)) {
                rmSync(rebaseMergePath, { recursive: true, force: true });
            }
            if (existsSync(rebaseApplyPath)) {
                rmSync(rebaseApplyPath, { recursive: true, force: true });
            }
            console.log('已清理 rebase 目录');
        } catch {
            console.warn('清理 rebase 目录失败，可能需要手动处理');
        }
    }
}

// #endregion

// #region 回滚

export function rollback(commit: string, tag?: string): void {
    console.log(`回滚到提交: ${commit}`);
    run(`git reset --hard ${commit}`);

    if (tag) {
        try {
            console.log(`删除本地标签: ${tag}`);
            run(`git tag -d ${tag}`);
        } catch {
            console.warn(`本地标签 ${tag} 删除失败 (可能不存在)`);
        }

        try {
            console.log(`删除远程标签: ${tag}`);
            run(`git push --delete origin ${tag}`);
        } catch {
            console.warn(`远程标签 ${tag} 删除失败 (可能未推送)`);
        }
    }

    const branch = getCurrentBranch();
    try {
        console.log(`尝试安全覆盖远程分支 ${branch}...`);
        console.log('使用 --force-with-lease 防止覆盖他人提交');
        run(`git push --force-with-lease origin ${branch}`);
    } catch {
        console.warn('安全强制推送失败！');
        console.warn('可能原因：远程分支已被他人更新或 CI/CD 正在运行');
        console.warn('请手动检查后执行：');
        console.warn(`    git push --force-with-lease origin ${branch}`);
        console.warn('或根据情况解决冲突后再推送');
    }

    console.log('本地工作区已恢复');
}

// #endregion