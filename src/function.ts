import "./env";
import { isConvertibleToNumber, isNullOrUndefined, stringify, UUID } from "./env"
import { i18n } from "./i18n"
import { config } from "./config"
import { db } from "./db"
import { DownloadType, ToastType } from "./type"
import { unlimitedFetch, renderNode } from "./extension"
import { Path, VideoInfo } from "./class"
import { pushDownloadTask } from "./main"
import { Toastify } from "./toastify";

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
        console.warn('Failed to refresh token:', error)
    }
    return authorization
}
export async function getAuth(url?: string) {
    return Object.assign(
        {
            'Cooike': unsafeWindow.document.cookie,
            'Authorization': config.authorization
        },
        !isNullOrUndefined(url) && !url.isEmpty() ? { 'X-Version': await getXVersion(url) } : { 'X-Version': '' }
    )
}
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
export function getTextNode(node: Node | Element): string {
    return node.nodeType === Node.TEXT_NODE
        ? node.textContent || ''
        : node.nodeType === Node.ELEMENT_NODE
            ? Array.from(node.childNodes)
                .map(getTextNode)
                .join('')
            : ''
}
export function newToast(type: ToastType, params: Toastify.Options | undefined) {
    const logFunc = {
        [ToastType.Warn]: console.warn,
        [ToastType.Error]: console.error,
        [ToastType.Log]: console.log,
        [ToastType.Info]: console.info,
    }[type] || console.log
    if (isNullOrUndefined(params)) params = {}
    params = Object.assign({
        newWindow: true,
        gravity: 'top',
        position: 'left',
        stopOnFocus: true
    }, params)
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
        params.text = params.text.replaceVariable(i18n[config.language]).toString()
    }
    logFunc((!isNullOrUndefined(params.text) ? params.text : !isNullOrUndefined(params.node) ? getTextNode(params.node) : 'undefined').replaceVariable(i18n[config.language]))
    return new Toastify.Toast(params)
}

export function getDownloadPath(videoInfo: VideoInfo): Path {
    return analyzeLocalPath(
        config.downloadPath.trim().replaceVariable({
            NowTime: new Date(),
            UploadTime: videoInfo.UploadTime,
            AUTHOR: videoInfo.Author,
            ID: videoInfo.ID,
            TITLE:  videoInfo.Title.normalize('NFKC').replaceAll(/(\P{Mark})(\p{Mark}+)/gu, '_').replace(/^\.|[\\\\/:*?\"<>|]/img, '_').truncate(72),
            ALIAS: videoInfo.Alias.normalize('NFKC').replaceAll(/(\P{Mark})(\p{Mark}+)/gu, '_').replace(/^\.|[\\\\/:*?\"<>|]/img, '_').truncate(64),
            QUALITY: videoInfo.DownloadQuality,
        })
    )
}

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
export async function EnvCheck(): Promise<boolean> {
    try {
        if (GM_info.scriptHandler !== 'ScriptCat' && GM_info.downloadMode !== 'browser') {
            GM_getValue('isDebug') && console.debug(GM_info)
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
export async function localPathCheck(): Promise<boolean> {
    try {
        let pathTest = analyzeLocalPath(config.downloadPath)
        for (const key in pathTest) {
            // todo check path
        }
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
export async function iwaraDownloaderCheck(): Promise<boolean> {
    try {
        let res = await (await unlimitedFetch(config.iwaraDownloaderPath, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                'ver': GM_getValue('version', '0.0.0').split('.').map(i => Number(i)),
                'code': 'State',
                'token': config.iwaraDownloaderToken
            }.prune())
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
export function aria2Download(videoInfo: VideoInfo) {
    (async function (id: string, author: string, title: string, uploadTime: Date, info: string, tag: Array<{
        id: string
        type: string
    }>, quality: string, alias: string, downloadUrl: URL) {
        let localPath = analyzeLocalPath(config.downloadPath.replaceVariable(
            {
                NowTime: new Date(),
                UploadTime: uploadTime,
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
            {
                'all-proxy': config.downloadProxy,
                'all-proxy-passwd': !config.downloadProxy.isEmpty() ? config.downloadProxyPassword : undefined,
                'all-proxy-user': !config.downloadProxy.isEmpty() ? config.downloadProxyUsername: undefined,
                'out': localPath.fullName,
                'dir': localPath.directory,
                'referer': window.location.hostname,
                'header': [
                    'Cookie:' + unsafeWindow.document.cookie
                ]
            }.prune()
        ]
        let res = await aria2API('aria2.addUri', params)
        console.log(`Aria2 ${title} ${JSON.stringify(res)}`)
        newToast(
            ToastType.Info,
            {
                node: toastNode(`${videoInfo.Title}[${videoInfo.ID}] %#pushTaskSucceed#%`)
            }
        ).show()
    }(videoInfo.ID, videoInfo.Author, videoInfo.Title, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.DownloadQuality, videoInfo.Alias, videoInfo.DownloadUrl.toURL()))
}
export function iwaraDownloaderDownload(videoInfo: VideoInfo) {
    (async function (videoInfo: VideoInfo) {
        let r = await (await unlimitedFetch(config.iwaraDownloaderPath, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
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
            }.prune())
        })).json()
        if (r.code === 0) {
            console.log(`${videoInfo.Title} %#pushTaskSucceed#% ${r}`)
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
export function othersDownload(videoInfo: VideoInfo) {
    (async function (DownloadUrl: URL) {
        DownloadUrl.searchParams.set('download',getDownloadPath(videoInfo).fullName)
        GM_openInTab(DownloadUrl.href, { active: false, insert: true, setParent: true })
    }(videoInfo.DownloadUrl.toURL()))
}

export function browserDownloadErrorParse(error: Tampermonkey.DownloadErrorResponse | Error): string{
    let errorInfo = stringify(error)
    if (!(error instanceof Error)) {
        errorInfo = {
            'not_enabled': `%#browserDownloadNotEnabled#%`,
            'not_whitelisted': `%#browserDownloadNotWhitelisted#%`,
            'not_permitted': `%#browserDownloadNotPermitted#%`,
            'not_supported': `%#browserDownloadNotSupported#%`,
            'not_succeeded': `%#browserDownloadNotSucceeded#% ${ isNullOrUndefined(error.details) ? 'UnknownError' : error.details}`,
        }[error.error] || `%#browserDownloadUnknownError#%`
    }
    return errorInfo
}
export function browserDownload(videoInfo: VideoInfo) {
    (async function (ID: string, Author: string, Title: string, UploadTime: Date, Info: string, Tag: Array<{
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
        let path = analyzeLocalPath(file.path)
        if (isNullOrUndefined(path.fullName) || path.fullName.isEmpty()) return 
        videoID = path.fullName.toLowerCase().among('[', '].mp4', false, true)
        if (videoID.isEmpty()) return 
        return videoID
    } catch (error) {
        GM_getValue('isDebug') && console.debug(`check aria2 task file fail! ${stringify(task)}`)
        return
    }
}
export async function aria2TaskCheckAndRestart() {
    let stoped: Array<{ id: string, data: Aria2.Status }> = (
        await aria2API(
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
        .prune();

    let active: Array<{ id: string, data: Aria2.Status }> = (
        await aria2API(
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
        .prune();
    let downloadNormalTasks: Array<{ id: string, data: Aria2.Status }> = active
        .filter(
            (task: { id: string, data: Aria2.Status }) => isConvertibleToNumber(task.data.downloadSpeed) && Number(task.data.downloadSpeed) >= 512
        )
        .unique('id');
    let downloadCompleted: Array<{ id: string, data: Aria2.Status }> = stoped
        .filter(
            (task: { id: string, data: Aria2.Status }) => task.data.status === 'complete' || task.data.errorCode === '13'
        )
        .unique('id');

    let downloadUncompleted: Array<{ id: string, data: Aria2.Status }> = stoped.difference(downloadCompleted, 'id').difference(downloadNormalTasks, 'id');
    let downloadToSlowTasks: Array<{ id: string, data: Aria2.Status }> = active
        .filter(
            (task: { id: string, data: Aria2.Status }) => isConvertibleToNumber(task.data.downloadSpeed) && Number(task.data.downloadSpeed) <= 512
        )
        .unique('id');
    let needRestart = downloadUncompleted.union(downloadToSlowTasks, 'id');

    let toast = newToast(
        ToastType.Warn,
        {
            node: toastNode(
                [
                    `发现 ${needRestart.length} 个需要重启的下载任务！`,
                    { nodeType: 'br' },
                    '%#tryRestartingDownload#%'
                ], '%#aria2TaskCheck#%'),
            async onClick() {
                toast.hide()
                for (let i = 0; i < needRestart.length; i++) {
                    const task = needRestart[i]
                    let cache = (await db.videos.where('ID').equals(task.id).toArray()).pop()
                    let videoInfo = await (new VideoInfo(cache)).init(task.id)
                    if (videoInfo.State){
                        await pushDownloadTask(videoInfo, true)
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
        }
    )
    toast.show()
}
export function getPlayload(authorization: string) {
    return JSON.parse(decodeURIComponent(encodeURIComponent(window.atob(authorization.split(' ').pop()!.split('.')[1]))))
}
export async function check() {
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
async function getXVersion(urlString: string): Promise<string> {
    let url = urlString.toURL()
    const data = new TextEncoder().encode([url.pathname.split("/").pop(),url.searchParams.get('expires'),'5nFp9kmbNnHdAFhaqMvt'].join('_'))
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}