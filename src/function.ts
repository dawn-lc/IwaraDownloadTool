import "./env";
import { isNullOrUndefined } from "./env"
import { i18n } from "./i18n"
import { config } from "./config"
import { db } from "./db"
import { DownloadType, ToastType } from "./type"
import { Toastify } from "./import"
import { unlimitedFetch, getString, prune, renderNode, UUID } from "./extension"
import { VideoInfo } from "./class"
import { pushDownloadTask } from "./main"

export async function refreshToken(): Promise<string> {
    let refresh = config.authorization
    try {
        refresh = (await (await unlimitedFetch(`https://api.iwara.tv/user/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })).json())['accessToken']
    } catch (error) {
        console.warn(`Refresh token error: ${getString(error)}`)
    }
    return refresh
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
            }
            ,
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
        case ToastType.Warn:
            params = Object.assign({
                duration: -1,
                style: {
                    background: 'linear-gradient(-30deg, rgb(119 76 0), rgb(255 165 0))'
                }
            }, params)
            break;

        case ToastType.Error:
            params = Object.assign({
                duration: -1,
                style: {
                    background: 'linear-gradient(-30deg, rgb(108 0 0), rgb(215 0 0))'
                }
            }, params)
        default:
            break;
    }
    if (!isNullOrUndefined(params.text)) {
        params.text = params.text.replaceVariable(i18n[config.language]).toString()
    }
    logFunc((!isNullOrUndefined(params.text) ? params.text : !isNullOrUndefined(params.node) ? getTextNode(params.node) : 'undefined').replaceVariable(i18n[config.language]))
    return Toastify(params)
}
export function analyzeLocalPath(path: string): LocalPath {
    let matchPath = path.replaceAll('//', '/').replaceAll('\\\\', '/').match(/^([a-zA-Z]:)?[\/\\]?([^\/\\]+[\/\\])*([^\/\\]+\.\w+)$/)
    if (isNullOrUndefined(matchPath)) throw new Error(`%#downloadPathError#%["${path}"]`)
    try {
        return {
            fullPath: matchPath[0],
            drive: matchPath[1] || '',
            filename: matchPath[3]
        }
    } catch (error) {
        throw new Error(`%#downloadPathError#% ["${matchPath.join(',')}"]`)
    }
}
export async function EnvCheck(): Promise<boolean> {
    try {
        if (GM_info.downloadMode !== 'browser') {
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
                    getString(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hideToast()
                }
            }
        )
        toast.showToast()
        return false
    }
    return true
}
export async function localPathCheck(): Promise<boolean> {
    try {
        let pathTest = analyzeLocalPath(config.downloadPath)
        for (const key in pathTest) {
            if (!Object.prototype.hasOwnProperty.call(pathTest, key) || pathTest[key]) {
                //todo localPathCheck
            }
        }
    } catch (error: any) {
        let toast = newToast(
            ToastType.Error,
            {
                node: toastNode([
                    `%#downloadPathError#%`,
                    { nodeType: 'br' },
                    getString(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hideToast()
                }
            }
        )
        toast.showToast()
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
                    getString(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hideToast()
                }
            }
        )
        toast.showToast()
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
            body: JSON.stringify(prune({
                'ver': GM_getValue('version', '0.0.0').split('.').map(i => Number(i)),
                'code': 'State',
                'token': config.iwaraDownloaderToken
            }))
        })).json()

        if (res.code !== 0) {
            throw new Error(res.msg)
        }

    } catch (error) {
        let toast = newToast(
            ToastType.Error,
            {
                node: toastNode([
                    `IwaraDownloader RPC %#connectionTest#%`,
                    { nodeType: 'br' },
                    getString(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hideToast()
                }
            }
        )
        toast.showToast()
        return false
    }
    return true
}
export function aria2Download(videoInfo: VideoInfo) {
    (async function (id: string, author: string, title: string, uploadTime: Date, info: string, tag: Array<{
        id: string
        type: string
    }>, quality: string, alias: string, downloadUrl: string) {
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

        let res = await aria2API('aria2.addUri', [
            [downloadUrl],
            prune({
                'all-proxy': config.downloadProxy,
                'out': localPath.filename,
                'dir': localPath.fullPath.replace(localPath.filename, ''),
                'referer': window.location.hostname,
                'header': [
                    'Cookie:' + unsafeWindow.document.cookie
                ]
            })
        ])
        console.log(`Aria2 ${title} ${JSON.stringify(res)}`)
        newToast(
            ToastType.Info,
            {
                node: toastNode(`${videoInfo.Title}[${videoInfo.ID}] %#pushTaskSucceed#%`)
            }
        ).showToast()
    }(videoInfo.ID, videoInfo.Author, videoInfo.Title, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.DownloadQuality, videoInfo.Alias, videoInfo.DownloadUrl))
}
export function iwaraDownloaderDownload(videoInfo: VideoInfo) {
    (async function (videoInfo: VideoInfo) {
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
            console.log(`${videoInfo.Title} %#pushTaskSucceed#% ${r}`)
            newToast(
                ToastType.Info,
                {
                    node: toastNode(`${videoInfo.Title}[${videoInfo.ID}] %#pushTaskSucceed#%`)
                }
            ).showToast()
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
                        toast.hideToast()
                    }
                }
            )
            toast.showToast()
        }
    }(videoInfo))
}
export function othersDownload(videoInfo: VideoInfo) {
    (async function (ID: string, Author: string, Name: string, UploadTime: Date, DownloadQuality: string, Alias: string, DownloadUrl: URL) {
        DownloadUrl.searchParams.set('download', analyzeLocalPath(config.downloadPath.replaceVariable(
            {
                NowTime: new Date(),
                UploadTime: UploadTime,
                AUTHOR: Author,
                ID: ID,
                TITLE: Name.normalize('NFKC').replaceAll(/(\P{Mark})(\p{Mark}+)/gu, '_').replace(/^\.|[\\\\/:*?\"<>|]/img, '_').truncate(72),
                ALIAS: Alias.normalize('NFKC').replaceAll(/(\P{Mark})(\p{Mark}+)/gu, '_').replace(/^\.|[\\\\/:*?\"<>|]/img, '_').truncate(64),
                QUALITY: DownloadQuality
            }
        ).trim()).filename)
        GM_openInTab(DownloadUrl.href, { active: false, insert: true, setParent: true })
    }(videoInfo.ID, videoInfo.Author, videoInfo.Title, videoInfo.UploadTime, videoInfo.DownloadQuality, videoInfo.Alias, videoInfo.DownloadUrl.toURL()))
}
export function browserDownload(videoInfo: VideoInfo) {
    (async function (ID: string, Author: string, Title: string, UploadTime: Date, Info: string, Tag: Array<{
        id: string
        type: string
    }>, DownloadQuality: string, Alias: string, DownloadUrl: string) {
        function browserDownloadError(error: Tampermonkey.DownloadErrorResponse | Error) {
            let errorInfo = getString(Error)
            if (!(error instanceof Error)) {
                errorInfo = {
                    'not_enabled': `%#browserDownloadNotEnabled#%`,
                    'not_whitelisted': `%#browserDownloadNotWhitelisted#%`,
                    'not_permitted': `%#browserDownloadNotPermitted#%`,
                    'not_supported': `%#browserDownloadNotSupported#%`,
                    'not_succeeded': `%#browserDownloadNotSucceeded#% ${error.details ?? getString(error.details)}`
                }[error.error] || `%#browserDownloadUnknownError#%`
            }
            let toast = newToast(
                ToastType.Error,
                {
                    node: toastNode([
                        `${Title}[${ID}] %#downloadFailed#%`,
                        { nodeType: 'br' },
                        errorInfo,
                        { nodeType: 'br' },
                        `%#tryRestartingDownload#%`
                    ], '%#browserDownload#%'),
                    async onClick() {
                        toast.hideToast()
                        await pushDownloadTask(videoInfo)
                    }
                }
            )
            toast.showToast()
        }
        GM_download({
            url: DownloadUrl,
            saveAs: false,
            name: config.downloadPath.replaceVariable(
                {
                    NowTime: new Date(),
                    UploadTime: UploadTime,
                    AUTHOR: Author,
                    ID: ID,
                    TITLE: Title.normalize('NFKC').replaceAll(/(\P{Mark})(\p{Mark}+)/gu, '_').replace(/^\.|[\\\\/:*?\"<>|]/img, '_').truncate(72),
                    ALIAS: Alias.normalize('NFKC').replaceAll(/(\P{Mark})(\p{Mark}+)/gu, '_').replace(/^\.|[\\\\/:*?\"<>|]/img, '_').truncate(64),
                    QUALITY: DownloadQuality
                }
            ).trim(),
            onerror: (err) => browserDownloadError(err),
            ontimeout: () => browserDownloadError(new Error('%#browserDownloadTimeout#%'))
        })
    }(videoInfo.ID, videoInfo.Author, videoInfo.Title, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.DownloadQuality, videoInfo.Alias, videoInfo.DownloadUrl))
}
export async function aria2API(method: string, params: any) {
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
export function aria2TaskExtractVideoID(task: Aria2.Status): string | null {
    if (isNullOrUndefined(task.files)) {
        GM_getValue('isDebug') && console.debug(`check aria2 task files fail! ${JSON.stringify(task)}`)
        return null
    }
    for (let index = 0; index < task.files.length; index++) {
        const file = task.files[index]
        if (isNullOrUndefined(file)) {
            GM_getValue('isDebug') && console.debug(`check aria2 task file fail! ${JSON.stringify(task.files)}`)
            continue
        }
        try {
            // 仅支持路径最后一组[]中包含%#ID#%的路径
            // todo: 支持自定义提取ID表达式 
            let videoID: string | null | undefined = analyzeLocalPath(file?.path)?.filename?.match(/\[([^\[\]]*)\](?=[^\[]*$)/g)?.pop()?.trimHead('[')?.trimTail(']');
            if (isNullOrUndefined(videoID) || videoID.isEmpty()) {
                GM_getValue('isDebug') && console.debug(`check aria2 task videoID fail! ${JSON.stringify(file.path)}`)
                continue
            }
            return videoID
        } catch (error) {
            continue
        }
    }
    return null
}
export async function aria2TaskCheck() {
    let stoped: Array<{ id: string, data: Aria2.Status }> = (
        await aria2API(
            'aria2.tellStopped',
            [
                0,
                2048,
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
                        id: ID.toLowerCase(),
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
                        id: ID.toLowerCase(),
                        data: task
                    }
                }
            }
        )
        .prune();

    let downloadUncompleted: Array<{ id: string, data: Aria2.Status }> = stoped
        .filter(
            (task: { id: string, data: Aria2.Status }) => task.data.status !== 'complete' || task.data.errorCode !== '13'
        )
        .unique('id');

    let downloadToSlowTasks: Array<{ id: string, data: Aria2.Status }> = active
        .filter(
            (task: { id: string, data: Aria2.Status }) => !Number.isNaN(task.data.downloadSpeed) && Number(task.data.downloadSpeed) <= 1024
        )
        .unique('id');

    let needRestart = [...downloadToSlowTasks, ...downloadUncompleted].unique('id');

    for (let index = 0; index < needRestart.length; index++) {
        const task = needRestart[index]
        let cache = (await db.videos.where('ID').equals(task.id).toArray()).pop()
        if (!isNullOrUndefined(cache)) {
            cache.State = false
        }
        let videoInfo = await (new VideoInfo(cache)).init(task.id)
        if (videoInfo.State){
            await pushDownloadTask(videoInfo)
            await aria2API('aria2.forceRemove', [task.data.gid]) 
        }
    }
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
    const data = new TextEncoder().encode(`${url.pathname.split("/").pop()}_${url.searchParams.get('expires')}_5nFp9kmbNnHdAFhaqMvt`)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}