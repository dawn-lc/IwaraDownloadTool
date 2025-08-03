import "./env";
import { isConvertibleToNumber, isNullOrUndefined, prune, stringify, UUID } from "./env"
import { i18nList } from "./i18n"
import { ToastType, DownloadType } from "./enum"
import { config } from "./config"
import { unlimitedFetch, renderNode } from "./extension"
import { Path } from "./class"
import { parseVideoInfo, pushDownloadTask } from "./main"
import { activeToasts, Toast, ToastOptions } from "./toastify";
import { originalConsole } from "./hijack";

/**
 * 刷新Iwara.tv的访问令牌
 * @async
 * @returns {Promise<string>} 返回新的访问令牌或回退到配置中的授权令牌
 */
export async function refreshToken(): Promise<string> {
    const { authorization } = config
    try {
        const res = await unlimitedFetch('https://api.iwara.tv/user/token', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })
        if (!res.ok) {
            throw new Error(`Refresh token failed with status: ${res.status}`);
        }
        const { accessToken } = await res.json()
        return accessToken || authorization
    } catch (error) {
        originalConsole.warn('Failed to refresh token:', error)
    }
    return authorization
}
/**
 * 获取请求认证头信息
 * @async
 * @param {string} [url] - 可选URL参数，用于生成X-Version头
 * @returns 包含Cookie和Authorization的请求头对象
 */
export async function getAuth(url?: string): Promise<{ Cooike: string; Authorization: string; } & { 'X-Version': string; }> {
    return prune({
        'Cooike': unsafeWindow.document.cookie,
        'Authorization': config.authorization,
        'X-Version': !isNullOrUndefined(url) && !url.isEmpty() ? await getXVersion(url) : undefined
    })
}
/**
 * 检查评论中是否包含下载链接
 * @param {string} comment - 要检查的评论内容
 * @returns {boolean} 如果包含下载链接返回true，否则返回false
 */
export function checkIsHaveDownloadLink(comment: string): boolean {
    if (!config.checkDownloadLink || isNullOrUndefined(comment) || comment.isEmpty()) {
        return false
    }
    return [
        'iwara.zip',
        'pan.baidu',
        '/s/',
        'mega.nz',
        'drive.google.com',
        'aliyundrive',
        'uploadgig',
        'katfile',
        'storex',
        'subyshare',
        'rapidgator',
        'filebe',
        'filespace',
        'mexa.sh',
        'mexashare',
        'mx-sh.net',
        'uploaded.',
        'icerbox',
        'alfafile',
        '1drv.ms',
        'onedrive.',
        'gofile.io',
        'workupload.com',
        'pixeldrain.',
        'gigafile.nu'
    ].filter(i => comment.toLowerCase().includes(i)).any()
}
/**
 * 创建Toast通知的DOM节点
 * @param {RenderCode<any>["childs"]} body - 通知主体内容
 * @param {string} [title] - 可选的通知标题
 * @returns {Element|Node} 返回创建的DOM节点
 */
export function toastNode(body: RenderCode<any>["childs"], title?: string): Element | Node {
    return renderNode({
        nodeType: 'div',
        childs: [
            !isNullOrUndefined(title) && !title.isEmpty() ? {
                nodeType: 'h3',
                childs: `%#appName#% - ${title}`
            } : {
                nodeType: 'h3',
                childs: '%#appName#%'
            },
            {
                nodeType: 'p',
                childs: body
            }
        ]
    })
}
/**
 * 从DOM节点中提取文本内容
 * @param {Node|Element} node - 要提取文本的DOM节点
 * @returns {string} 返回提取的文本内容
 */
export function getTextNode(node: Node | Element): string {
    return node.nodeType === Node.TEXT_NODE
        ? node.textContent || ''
        : node.nodeType === Node.ELEMENT_NODE
            ? Array.from(node.childNodes)
                .map(getTextNode)
                .join('')
            : ''
}
/**
 * 创建新的Toast通知
 * @param {ToastType} type - Toast类型(Info/Warn/Error/Log)
 * @param {ToastOptions} params - Toast配置选项
 * @returns {Toast} 返回创建的Toast实例
 */
export function newToast(type: ToastType, params?: ToastOptions): Toast {
    const logFunc = {
        [ToastType.Warn]: originalConsole.warn,
        [ToastType.Error]: originalConsole.error,
        [ToastType.Log]: originalConsole.log,
        [ToastType.Info]: originalConsole.info,
    }[type] || originalConsole.log
    if (isNullOrUndefined(params)) params = {}
    if (!isNullOrUndefined(params.id) && activeToasts.has(params.id)) activeToasts.get(params.id)?.hide()
    switch (type) {
        case ToastType.Info:
            params = Object.assign({
                duration: 2000,
                style: {
                    background: 'linear-gradient(-30deg, rgb(0, 108, 215), rgb(0, 180, 255))'
                }
            }, params)
        case ToastType.Warn:
            params = Object.assign({
                duration: -1,
                style: {
                    background: 'linear-gradient(-30deg, rgb(119, 76, 0), rgb(255, 165, 0))'
                }
            }, params)
            break;

        case ToastType.Error:
            params = Object.assign({
                duration: -1,
                style: {
                    background: 'linear-gradient(-30deg, rgb(108, 0, 0), rgb(215, 0, 0))'
                }
            }, params)
        default:
            break;
    }
    if (!isNullOrUndefined(params.text)) {
        params.text = params.text.replaceVariable(i18nList[config.language]).toString()
    }
    logFunc((!isNullOrUndefined(params.text) ? params.text : !isNullOrUndefined(params.node) ? getTextNode(params.node) : 'undefined').replaceVariable(i18nList[config.language]))
    return new Toast(params)
}

/**
 * 根据视频信息生成下载路径
 * @param {FullVideoInfo} videoInfo - 视频信息对象
 * @returns {Path} 返回生成的路径对象
 */
export function getDownloadPath(videoInfo: FullVideoInfo): Path {
    return analyzeLocalPath(
        config.downloadPath.trim().replaceVariable({
            NowTime: new Date(),
            UploadTime: new Date(videoInfo.UploadTime),
            AUTHOR: videoInfo.Author,
            ID: videoInfo.ID,
            TITLE: videoInfo.Title.normalize('NFKC').replaceAll(/(\P{Mark})(\p{Mark}+)/gu, '_').replace(/^\.|[\\\\/:*?\"<>|]/img, '_').truncate(72),
            ALIAS: videoInfo.Alias.normalize('NFKC').replaceAll(/(\P{Mark})(\p{Mark}+)/gu, '_').replace(/^\.|[\\\\/:*?\"<>|]/img, '_').truncate(64),
            QUALITY: videoInfo.DownloadQuality,
        })
    )
}

/**
 * 分析本地路径并返回Path对象
 * @param {string} path - 要分析的路径字符串
 * @returns {Path} 返回Path对象
 * @throws {Error} 如果路径无效会抛出错误并显示Toast通知
 */
export function analyzeLocalPath(path: string): Path {
    try {
        return new Path(path)
    } catch (error) {
        let toast = newToast(
            ToastType.Error,
            {
                node: toastNode([
                    `%#downloadPathError#%`,
                    { nodeType: 'br' },
                    stringify(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hide()
                }
            }
        )
        toast.show()
        throw new Error(`%#downloadPathError#% ["${path}"]`)
    }
}
/**
 * 检查浏览器环境是否支持下载
 * @async
 * @returns {Promise<boolean>} 如果环境检查通过返回true，否则返回false
 */
export async function EnvCheck(): Promise<boolean> {
    try {
        if (GM_info.scriptHandler !== 'ScriptCat' && GM_info.downloadMode !== 'browser') {
            GM_getValue('isDebug') && originalConsole.debug('[Debug]', GM_info)
            throw new Error('%#browserDownloadModeError#%')
        }
    } catch (error: any) {
        let toast = newToast(
            ToastType.Error,
            {
                node: toastNode([
                    `%#configError#%`,
                    { nodeType: 'br' },
                    stringify(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hide()
                }
            }
        )
        toast.show()
        return false
    }
    return true
}
/**
 * 检查本地下载路径是否有效
 * @async
 * @returns {Promise<boolean>} 如果路径有效返回true，否则返回false
 */
export async function localPathCheck(): Promise<boolean> {
    try {
        let pathTest = analyzeLocalPath(config.downloadPath.replaceVariable({
            NowTime: new Date(),
            UploadTime: new Date(),
            AUTHOR: 'test',
            ID: 'test',
            TITLE: 'test',
            ALIAS: 'test',
            QUALITY: 'test'
        }))
        if (isNullOrUndefined(pathTest)) throw 'analyzeLocalPath error'
        if (pathTest.fullPath.isEmpty()) throw 'analyzeLocalPath isEmpty'
    } catch (error: any) {
        let toast = newToast(
            ToastType.Error,
            {
                node: toastNode([
                    `%#downloadPathError#%`,
                    { nodeType: 'br' },
                    stringify(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hide()
                }
            }
        )
        toast.show()
        return false
    }
    return true
}
/**
 * 检查Aria2 RPC连接是否正常
 * @async
 * @returns {Promise<boolean>} 如果连接正常返回true，否则返回false
 */
export async function aria2Check(): Promise<boolean> {
    try {
        let res = await (await unlimitedFetch(config.aria2Path, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                'jsonrpc': '2.0',
                'method': 'aria2.tellActive',
                'id': UUID(),
                'params': ['token:' + config.aria2Token]
            })
        })).json()
        if (res.error) {
            throw new Error(res.error.message)
        }
    } catch (error: any) {
        let toast = newToast(
            ToastType.Error,
            {
                node: toastNode([
                    `Aria2 RPC %#connectionTest#%`,
                    { nodeType: 'br' },
                    stringify(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hide()
                }
            }
        )
        toast.show()
        return false
    }
    return true
}
/**
 * 检查IwaraDownloader RPC连接是否正常
 * @async
 * @returns {Promise<boolean>} 如果连接正常返回true，否则返回false
 */
export async function iwaraDownloaderCheck(): Promise<boolean> {
    try {
        let res = await (await unlimitedFetch(config.iwaraDownloaderPath, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: JSON.stringify(prune({
                'ver': GM_getValue('version', '0.0.0').split('.').map(i => Number(i)),
                'code': 'State',
                'token': config.iwaraDownloaderToken
            }))
        })).json()

        if (res.code !== 0) {
            throw new Error(res.msg)
        }

    } catch (error: any) {
        let toast = newToast(
            ToastType.Error,
            {
                node: toastNode([
                    `IwaraDownloader RPC %#connectionTest#%`,
                    { nodeType: 'br' },
                    stringify(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hide()
                }
            }
        )
        toast.show()
        return false
    }
    return true
}
/**
 * 通过Aria2下载视频
 * @param {FullVideoInfo} videoInfo - 视频信息对象
 */
export function aria2Download(videoInfo: FullVideoInfo) {
    (async function (id: string, author: string, title: string, uploadTime: number, info: string, tag: Array<{
        id: string
        type: string
    }>, quality: string, alias: string, downloadUrl: URL) {
        let localPath = analyzeLocalPath(config.downloadPath.replaceVariable(
            {
                NowTime: new Date(),
                UploadTime: new Date(uploadTime),
                AUTHOR: author,
                ID: id,
                TITLE: title.normalize('NFKC').replaceAll(/(\P{Mark})(\p{Mark}+)/gu, '_').replaceEmojis('_').replace(/^\.|[\\\\/:*?\"<>|]/img, '_').truncate(72),
                ALIAS: alias,
                QUALITY: quality
            }
        ).trim())
        downloadUrl.searchParams.set('videoid', id)
        downloadUrl.searchParams.set('download', localPath.fullName)
        let params = [
            [downloadUrl.href],
            prune({

                'allow-overwrite': "true",
                'all-proxy': config.downloadProxy,
                'all-proxy-passwd': !config.downloadProxy.isEmpty() ? config.downloadProxyPassword : undefined,
                'all-proxy-user': !config.downloadProxy.isEmpty() ? config.downloadProxyUsername : undefined,
                'out': localPath.fullName,
                'dir': localPath.directory,
                'referer': window.location.hostname,
                'header': [
                    'Cookie:' + unsafeWindow.document.cookie
                ]
            })
        ]
        let res = await aria2API('aria2.addUri', params)
        originalConsole.log(`Aria2 ${title} ${JSON.stringify(res)}`)
        newToast(
            ToastType.Info,
            {
                node: toastNode(`${videoInfo.Title}[${videoInfo.ID}] %#pushTaskSucceed#%`)
            }
        ).show()
    }(videoInfo.ID, videoInfo.Author, videoInfo.Title, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.DownloadQuality, videoInfo.Alias, videoInfo.DownloadUrl.toURL()))
}
/**
 * 通过IwaraDownloader下载视频
 * @param {FullVideoInfo} videoInfo - 视频信息对象
 */
export function iwaraDownloaderDownload(videoInfo: FullVideoInfo) {
    (async function (videoInfo: FullVideoInfo) {
        let r = await (await unlimitedFetch(config.iwaraDownloaderPath, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: JSON.stringify(prune({
                'ver': GM_getValue('version', '0.0.0').split('.').map(i => Number(i)),
                'code': 'add',
                'token': config.iwaraDownloaderToken,
                'data': {
                    'info': {
                        'title': videoInfo.Title,
                        'url': videoInfo.DownloadUrl,
                        'size': videoInfo.Size,
                        'source': videoInfo.ID,
                        'alias': videoInfo.Alias,
                        'author': videoInfo.Author,
                        'uploadTime': videoInfo.UploadTime,
                        'comments': videoInfo.Comments,
                        'tags': videoInfo.Tags,
                        'path': config.downloadPath.replaceVariable(
                            {
                                NowTime: new Date(),
                                UploadTime: videoInfo.UploadTime,
                                AUTHOR: videoInfo.Author,
                                ID: videoInfo.ID,
                                TITLE: videoInfo.Title,
                                ALIAS: videoInfo.Alias,
                                QUALITY: videoInfo.DownloadQuality
                            }
                        )
                    },
                    'option': {
                        'proxy': config.downloadProxy,
                        'cookies': unsafeWindow.document.cookie
                    }
                }
            }))
        })).json()
        if (r.code === 0) {
            originalConsole.log(`${videoInfo.Title} %#pushTaskSucceed#% ${r}`)
            newToast(
                ToastType.Info,
                {
                    node: toastNode(`${videoInfo.Title}[${videoInfo.ID}] %#pushTaskSucceed#%`)
                }
            ).show()
        } else {
            let toast = newToast(
                ToastType.Error,
                {
                    node: toastNode([
                        `${videoInfo.Title}[${videoInfo.ID}] %#pushTaskFailed#% `,
                        { nodeType: 'br' },
                        r.msg
                    ], '%#iwaraDownloaderDownload#%'),
                    onClick() {
                        toast.hide()
                    }
                }
            )
            toast.show()
        }
    }(videoInfo))
}
/**
 * 通过浏览器直接下载视频
 * @param {FullVideoInfo} videoInfo - 视频信息对象
 */
export function othersDownload(videoInfo: FullVideoInfo) {
    (async function (DownloadUrl: URL) {
        DownloadUrl.searchParams.set('download', getDownloadPath(videoInfo).fullName)
        GM_openInTab(DownloadUrl.href, { active: false, insert: true, setParent: true })
    }(videoInfo.DownloadUrl.toURL()))
}

/**
 * 解析浏览器下载错误信息
 * @param {Tampermonkey.DownloadErrorResponse|Error} error - 错误对象
 * @returns {string} 返回解析后的错误信息
 */
export function browserDownloadErrorParse(error: Tampermonkey.DownloadErrorResponse | Error): string {
    let errorInfo = stringify(error)
    if (!(error instanceof Error)) {
        errorInfo = {
            'not_enabled': `%#browserDownloadNotEnabled#%`,
            'not_whitelisted': `%#browserDownloadNotWhitelisted#%`,
            'not_permitted': `%#browserDownloadNotPermitted#%`,
            'not_supported': `%#browserDownloadNotSupported#%`,
            'not_succeeded': `%#browserDownloadNotSucceeded#% ${isNullOrUndefined(error.details) ? 'UnknownError' : error.details}`,
        }[error.error] || `%#browserDownloadUnknownError#%`
    }
    return errorInfo
}
/**
 * 通过浏览器下载视频
 * @param {FullVideoInfo} videoInfo - 视频信息对象
 */
export function browserDownload(videoInfo: FullVideoInfo) {
    (async function (ID: string, Author: string, Title: string, UploadTime: number, Info: string, Tag: Array<{
        id: string
        type: string
    }>, DownloadQuality: string, Alias: string, DownloadUrl: string) {
        function toastError(error: Tampermonkey.DownloadErrorResponse | Error) {
            let toast = newToast(
                ToastType.Error,
                {
                    node: toastNode([
                        `${Title}[${ID}] %#downloadFailed#%`,
                        { nodeType: 'br' },
                        browserDownloadErrorParse(error),
                        { nodeType: 'br' },
                        `%#tryRestartingDownload#%`
                    ], '%#browserDownload#%'),
                    async onClick() {
                        toast.hide()
                        await pushDownloadTask(videoInfo)
                    }
                }
            )
            toast.show()
        }
        GM_download({
            url: DownloadUrl,
            saveAs: false,
            name: getDownloadPath(videoInfo).fullPath,
            onerror: (err) => toastError(err),
            ontimeout: () => toastError(new Error('%#browserDownloadTimeout#%'))
        })
    }(videoInfo.ID, videoInfo.Author, videoInfo.Title, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.DownloadQuality, videoInfo.Alias, videoInfo.DownloadUrl))
}
/**
 * 调用Aria2 RPC API
 * @async
 * @param {string} method - API方法名
 * @param {any} params - API参数
 * @returns {Promise<Aria2.Result>} 返回API调用结果
 */
export async function aria2API(method: string, params: any): Promise<Aria2.Result> {
    return await (await unlimitedFetch(config.aria2Path, {
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: method,
            id: UUID(),
            params: [`token:${config.aria2Token}`, ...params]
        }),
        method: 'POST'
    })).json()
}
/**
 * 从Aria2任务中提取视频ID
 * @param {Aria2.Status} task - Aria2任务状态
 * @returns {string|undefined} 返回提取的视频ID，如果提取失败返回undefined
 */
export function aria2TaskExtractVideoID(task: Aria2.Status): string | undefined {
    try {
        if (isNullOrUndefined(task.files) || task.files.length !== 1) return
        const file = task.files[0]
        if (isNullOrUndefined(file)) return
        if (file.uris.length < 1) return
        let downloadUrl = file.uris[0].uri.toURL()
        if (isNullOrUndefined(downloadUrl)) return
        let videoID: string | undefined | null
        if (downloadUrl.searchParams.has('videoid')) videoID = downloadUrl.searchParams.get('videoid')
        if (!isNullOrUndefined(videoID) && !videoID.isEmpty()) return videoID
        if (isNullOrUndefined(file.path) || file.path.isEmpty()) return
        let path = analyzeLocalPath(file.path)
        if (isNullOrUndefined(path.fullName) || path.fullName.isEmpty()) return
        videoID = path.fullName.toLowerCase().among('[', '].mp4', false, true)
        if (videoID.isEmpty()) return
        return videoID
    } catch (error) {
        GM_getValue('isDebug') && originalConsole.debug(`[Debug] check aria2 task file fail! ${stringify(task)}`)
        return
    }
}
/**
 * 检查并重启异常的Aria2下载任务
 */
export async function aria2TaskCheckAndRestart() {
    let stoped: Array<{ id: string, data: Aria2.Status }> = prune(
        (await aria2API(
            'aria2.tellStopped',
            [
                0,
                4096,
                [
                    'gid',
                    'status',
                    'files',
                    'errorCode',
                    'bittorrent'
                ]
            ]
        ))
            .result
            .filter(
                (task: Aria2.Status) => isNullOrUndefined(task.bittorrent)
            )
            .map(
                (task: Aria2.Status) => {
                    let ID = aria2TaskExtractVideoID(task)
                    if (!isNullOrUndefined(ID) && !ID.isEmpty()) {
                        return {
                            id: ID,
                            data: task
                        }
                    }
                }
            )
    );
    let active: Array<{ id: string, data: Aria2.Status }> = prune(
        (await aria2API(
            'aria2.tellActive',
            [
                [
                    'gid',
                    'status',
                    'files',
                    'downloadSpeed',
                    'bittorrent'
                ]
            ]
        ))
            .result
            .filter(
                (task: Aria2.Status) =>
                    isNullOrUndefined(task.bittorrent)
            )
            .map(
                (task: Aria2.Status) => {
                    let ID = aria2TaskExtractVideoID(task)
                    if (!isNullOrUndefined(ID) && !ID.isEmpty()) {
                        return {
                            id: ID,
                            data: task
                        }
                    }
                }
            )
    );
    let downloadNormalTasks: Array<{ id: string, data: Aria2.Status }> = active
        .filter(
            (task: { id: string, data: Aria2.Status }) => isConvertibleToNumber(task.data.downloadSpeed) && Number(task.data.downloadSpeed) >= 512
        )
        .unique('id');
    let downloadCompleted: Array<{ id: string, data: Aria2.Status }> = stoped
        .filter(
            (task: { id: string, data: Aria2.Status }) => task.data.status === 'complete'
        )
        .unique('id');

    let downloadUncompleted: Array<{ id: string, data: Aria2.Status }> = stoped.difference(downloadCompleted, 'id').difference(downloadNormalTasks, 'id');
    let downloadToSlowTasks: Array<{ id: string, data: Aria2.Status }> = active
        .filter(
            (task: { id: string, data: Aria2.Status }) => isConvertibleToNumber(task.data.downloadSpeed) && Number(task.data.downloadSpeed) <= 512
        )
        .unique('id');
    let needRestart = downloadUncompleted.union(downloadToSlowTasks, 'id');
    if (needRestart.length !== 0) {
        newToast(
            ToastType.Warn,
            {
                id: 'aria2TaskCheckAndRestart',
                node: toastNode(
                    [
                        `发现 ${needRestart.length} 个需要重启的下载任务！`,
                        { nodeType: 'br' },
                        '%#tryRestartingDownload#%'
                    ], '%#aria2TaskCheck#%'),
                async onClick() {
                    this.hide()
                    for (let i = 0; i < needRestart.length; i++) {
                        const task = needRestart[i]
                        await pushDownloadTask(await parseVideoInfo({
                            Type: "init",
                            ID: task.id,
                            UpdateTime: 0
                        }), true)
                        let activeTasks = active.filter(
                            (activeTask: { id: string, data: Aria2.Status }) => activeTask.id === task.id
                        )
                        for (let t = 0; t < activeTasks.length; t++) {
                            const element = activeTasks[t];
                            await aria2API('aria2.forceRemove', [element.data.gid])
                        }
                    }
                }
            }
        ).show()
    } else {
        newToast(ToastType.Info, {
            id: 'aria2TaskCheckAndRestart',
            duration: 10000,
            node: toastNode(
                `未发现需要重启的下载任务！`
            )
        }).show()
    }
}
/**
 * 解析JWT令牌的payload部分
 * @param {string} authorization - 授权令牌字符串
 * @returns {Object} 返回解析后的payload对象
 */
export function getPlayload(authorization: string): { [key: string]: any } {
    return JSON.parse(decodeURIComponent(encodeURIComponent(window.atob(authorization.split(' ').pop()!.split('.')[1]))))
}
/**
 * 根据配置的下载类型执行相应的环境检查
 * @async
 * @returns {Promise<boolean>} 如果检查通过返回true，否则返回false
 */
export async function check(): Promise<boolean> {
    if (await localPathCheck()) {
        switch (config.downloadType) {
            case DownloadType.Aria2:
                return await aria2Check()
            case DownloadType.IwaraDownloader:
                return await iwaraDownloaderCheck()
            case DownloadType.Browser:
                return await EnvCheck()
            default:
                break
        }
        return true
    } else {
        return false
    }
}
/**
 * 根据URL生成X-Version头值
 * @async
 * @private
 * @param {string} urlString - 请求URL
 * @returns {Promise<string>} 返回生成的X-Version值
 */
async function getXVersion(urlString: string): Promise<string> {
    let url = urlString.toURL()
    const data = new TextEncoder().encode([url.pathname.split("/").pop(), url.searchParams.get('expires'), '5nFp9kmbNnHdAFhaqMvt'].join('_'))
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}
