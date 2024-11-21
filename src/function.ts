import Toastify from "toastify-js"
import { i18n } from "./i18n"
import { isNullOrUndefined, originalNodeAppendChild } from "./env"
import { fetch, getString, prune, renderNode, UUID } from "./extension"
import { Dictionary, ToastType, DownloadType, VideoInfo } from "./class"
import { config, db, pageSelectButtons, selectList } from "./main"

export async function refreshToken(): Promise<string> {
    let refresh = config.authorization
    try {
        refresh = (await (await fetch(`https://api.iwara.tv/user/token`, {
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
export async function getXVersion(urlString: string): Promise<string> {
    let url = urlString.toURL()
    const data = new TextEncoder().encode(`${url.pathname.split("/").pop()}_${url.searchParams.get('expires')}_5nFp9kmbNnHdAFhaqMvt`)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}
export async function getAuth(url?: string) {
    return Object.assign(
        {
            'Cooike': unsafeWindow.document.cookie,
            'Authorization': config.authorization
        },
        !isNullOrUndefined(url) && !url.isEmpty() ? { 'X-Version': await getXVersion(url) } : { 'X-Version': ''}
    )
}
export async function addDownloadTask() {
    let textArea = renderNode({
        nodeType: "textarea",
        attributes: {
            placeholder: i18n[config.language].manualDownloadTips,
            style: 'margin-bottom: 10px;',
            rows: "16",
            cols: "96"
        }
    }) as HTMLTextAreaElement
    let body = renderNode({
        nodeType: "div",
        attributes: {
            id: "pluginOverlay"
        },
        childs: [
            textArea,
            {
                nodeType: "button",
                events: {
                    click: (e: Event) => {
                        if (!isNullOrUndefined(textArea.value) && !textArea.value.isEmpty()) {
                            try {
                                let list = JSON.parse(textArea.value) as Array<[key: string, value: PieceInfo]>
                                analyzeDownloadTask(new Dictionary<PieceInfo>(list))
                            } catch (error) {
                                let IDList = new Dictionary<PieceInfo>()
                                textArea.value.split('|').map(ID => IDList.set(ID, {}))
                                analyzeDownloadTask(IDList)
                            }
                        }
                        body.remove()
                    }
                },
                childs: "确认"
            }
        ]
    }) as Element
    unsafeWindow.document.body.appendChild(body)
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
export function toastNode(body: RenderCode | RenderCode[], title?: string): Element | Node {
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
    params = Object.assign(params,{
        newWindow: true,
        gravity: 'top',
        position: 'left',
        stopOnFocus: true
    })
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
export async function pushDownloadTask(videoInfo: VideoInfo, bypass: boolean = false) {
    if (!videoInfo.State) {
        return
    }
    if (!bypass) {
        if (config.autoFollow && !videoInfo.Following) {
            if ((await fetch(`https://api.iwara.tv/user/${videoInfo.AuthorID}/followers`, {
                method: 'POST',
                headers: await getAuth()
            })).status !== 201) newToast(ToastType.Warn, { text: `${videoInfo.Alias} %#autoFollowFailed#%`, close: true }).showToast()
        }
        if (config.autoLike && !videoInfo.Liked) {
            if ((await fetch(`https://api.iwara.tv/video/${videoInfo.ID}/like`, {
                method: 'POST',
                headers: await getAuth()
            })).status !== 201) newToast(ToastType.Warn, { text: `${videoInfo.Title} %#autoLikeFailed#%`, close: true }).showToast()
        }
        if (config.checkDownloadLink && checkIsHaveDownloadLink(`${videoInfo.Description} ${videoInfo.Comments}`)) {
            let toastBody = toastNode([
                `${videoInfo.Title}[${videoInfo.ID}] %#findedDownloadLink#%`,
                { nodeType: 'br' },
                `%#openVideoLink#%`
            ], '%#createTask#%')
            let toast = newToast(
                ToastType.Warn,
                {
                    node: toastBody,
                    close: config.autoCopySaveFileName,
                    onClick() {
                        GM_openInTab(`https://www.iwara.tv/video/${videoInfo.ID}`, { active: false, insert: true, setParent: true })
                        if (config.autoCopySaveFileName) {
                            GM_setClipboard(analyzeLocalPath(config.downloadPath.replaceVariable(
                                {
                                    NowTime: new Date(),
                                    UploadTime: videoInfo.UploadTime,
                                    AUTHOR: videoInfo.Author,
                                    ID: videoInfo.ID,
                                    TITLE: videoInfo.Title,
                                    ALIAS: videoInfo.Alias,
                                    QUALITY: videoInfo.DownloadQuality
                                }
                            ).trim()).filename, "text")
                            toastBody.appendChild(renderNode({
                                nodeType: 'p',
                                childs: '%#copySucceed#%'
                            }))
                        } else {
                            toast.hideToast()
                        }
                    }
                }
            )
            toast.showToast()
            return
        }
        if (config.checkPriority && videoInfo.DownloadQuality !== config.downloadPriority) {
            let toast = newToast(
                ToastType.Warn,
                {
                    node: toastNode([
                        `${videoInfo.Title}[${videoInfo.ID}] %#downloadQualityError#%`,
                        { nodeType: 'br' },
                        `%#tryReparseDownload#%`
                    ], '%#createTask#%'),
                    async onClick() {
                        toast.hideToast()
                        await pushDownloadTask(await new VideoInfo(videoInfo as PieceInfo).init(videoInfo.ID))
                    }
                }
            )
            toast.showToast()
            return
        }
    }
    switch (config.downloadType) {
        case DownloadType.Aria2:
            aria2Download(videoInfo)
            break
        case DownloadType.IwaraDownloader:
            iwaraDownloaderDownload(videoInfo)
            break
        case DownloadType.Browser:
            browserDownload(videoInfo)
            break
        default:
            othersDownload(videoInfo)
            break
    }
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
        let res = await (await fetch(config.aria2Path, {
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
        let res = await (await fetch(config.iwaraDownloaderPath, {
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
    ( async function (id: string, author: string, name: string, uploadTime: Date, info: string, tag: Array<{
        id: string
        type: string
    }>, quality: string, alias: string, downloadUrl: string) {
        let localPath = analyzeLocalPath(config.downloadPath.replaceVariable(
            {
                NowTime: new Date(),
                UploadTime: uploadTime,
                AUTHOR: author,
                ID: id,
                TITLE: name.normalize('NFKC').replaceAll(/(\P{Mark})(\p{Mark}+)/gu, '_').replaceEmojis('_').replace(/^\.|[\\\\/:*?\"<>|]/img, '_').truncate(72),
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



        console.log(`Aria2 ${name} ${JSON.stringify(res)}`)
        newToast(
            ToastType.Info,
            {
                node: toastNode(`${videoInfo.Title}[${videoInfo.ID}] %#pushTaskSucceed#%`)
            }
        ).showToast()
    }(videoInfo.ID, videoInfo.Author, videoInfo.Title, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.DownloadQuality, videoInfo.Alias, videoInfo.DownloadUrl))
}
export function iwaraDownloaderDownload(videoInfo: VideoInfo) {
    ( async function (videoInfo: VideoInfo) {
        let r = await (await fetch(config.iwaraDownloaderPath, {
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
    ( async function (ID: string, Author: string, Name: string, UploadTime: Date, DownloadQuality: string, Alias: string, DownloadUrl: URL) {
        DownloadUrl.searchParams.set('download', analyzeLocalPath(config.downloadPath.replaceVariable(
            {
                NowTime: new Date(),
                UploadTime: UploadTime,
                AUTHOR: Author,
                ID: ID,
                TITLE: Name.normalize('NFKC').replace(/^\.|[\\\\/:*?\"<>|]/img, '_').truncate(72),
                ALIAS: Alias,
                QUALITY: DownloadQuality
            }
        ).trim()).filename)
        GM_openInTab(DownloadUrl.href, { active: false, insert: true, setParent: true })
    }(videoInfo.ID, videoInfo.Author, videoInfo.Title, videoInfo.UploadTime, videoInfo.DownloadQuality, videoInfo.Alias, videoInfo.DownloadUrl.toURL()))
}
export function browserDownload(videoInfo: VideoInfo) {
    ( async function (ID: string, Author: string, Name: string, UploadTime: Date, Info: string, Tag: Array<{
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
                        `${Name}[${ID}] %#downloadFailed#%`,
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
                    TITLE: Name.normalize('NFKC').replace(/^\.|[\\\\/:*?\"<>|]/img, '_').truncate(72),
                    ALIAS: Alias,
                    QUALITY: DownloadQuality
                }
            ).trim(),
            onerror: (err) => browserDownloadError(err),
            ontimeout: () => browserDownloadError(new Error('%#browserDownloadTimeout#%'))
        })
    }(videoInfo.ID, videoInfo.Author, videoInfo.Title, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.DownloadQuality, videoInfo.Alias, videoInfo.DownloadUrl))
}
export async function aria2API(method: string, params: any) {
    return await (await fetch(config.aria2Path, {
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
    let completed: Array<string> = (await aria2API('aria2.tellStopped', [0, 2048, [
        'gid',
        'status',
        'files',
        'errorCode',
        'bittorrent'
    ]])).result.filter((task: Aria2.Status) => isNullOrUndefined(task.bittorrent) && (task.status === 'complete' || task.errorCode === '13')).map((task: Aria2.Status) => aria2TaskExtractVideoID(task)).filter(Boolean).map((i: string) => i.toLowerCase())

    let active = await aria2API('aria2.tellActive', [[
        'gid',
        'downloadSpeed',
        'files',
        'bittorrent'
    ]])

    let needRestart: Aria2.Status[] = active.result.filter((i: Aria2.Status) => isNullOrUndefined(i.bittorrent) && !Number.isNaN(i.downloadSpeed) && Number(i.downloadSpeed) <= 1024)

    for (let index = 0; index < needRestart.length; index++) {
        const task = needRestart[index]
        let videoID = aria2TaskExtractVideoID(task)
        if (!isNullOrUndefined(videoID) && !videoID.isEmpty()) {
            if (!completed.includes(videoID.toLowerCase())) {
                let cache = (await db.videos.where('ID').equals(videoID).toArray()).pop()
                let videoInfo = await (new VideoInfo(cache)).init(videoID)
                videoInfo.State && await pushDownloadTask(videoInfo)
            }
            await aria2API('aria2.forceRemove', [task.gid])
        }
    }
}

export function uninjectCheckbox(element: Element | Node) {
    if (element instanceof HTMLElement) {
        if (element instanceof HTMLInputElement && element.classList.contains('selectButton')) {
            element.hasAttribute('videoID') && pageSelectButtons.delete(element.getAttribute('videoID')!)
        }
        if (element.querySelector('input.selectButton')) {
            element.querySelectorAll('.selectButton').forEach(i => i.hasAttribute('videoID') && pageSelectButtons.delete(i.getAttribute('videoID')!))
        }
    }
}

export function pageChange() {
    GM_getValue('isDebug') && console.debug(pageSelectButtons)
}

export function getSelectButton(id: string): HTMLInputElement | undefined {
    return pageSelectButtons.has(id) ? pageSelectButtons.get(id) : unsafeWindow.document.querySelector(`input.selectButton[videoid="${id}"]`) as HTMLInputElement
}
export function getPlayload(authorization: string) {
    return JSON.parse(decodeURIComponent(encodeURIComponent(window.atob(authorization.split(' ').pop()!.split('.')[1]))))
}


export function injectCheckbox(element: Element, compatible: boolean) {
    let ID = (element.querySelector('a.videoTeaser__thumbnail') as HTMLLinkElement).href.toURL().pathname.split('/')[2]
    let Name = element.querySelector('.videoTeaser__title')?.getAttribute('title')!.trim()
    let Alias = element.querySelector('a.username')?.getAttribute('title')
    let Author = (element.querySelector('a.username') as HTMLLinkElement)?.href.toURL().pathname.split('/').pop()
    let node = compatible ? element : element.querySelector('.videoTeaser__thumbnail')
    if (isNullOrUndefined(ID) || isNullOrUndefined(Name) || isNullOrUndefined(Alias) || isNullOrUndefined(Author)) return
    let button = renderNode({
        nodeType: 'input',
        attributes: Object.assign(
            selectList.has(ID) ? { checked: true } : {}, {
            type: 'checkbox',
            videoID: ID,
            videoName: Name,
            videoAlias: Alias,
            videoAuthor: Author
        }),
        className: compatible ? ['selectButton', 'selectButtonCompatible'] : 'selectButton',
        events: {
            click: (event: Event) => {
                (event.target as HTMLInputElement).checked ? selectList.set(ID, {
                    Title: Name,
                    Alias: Alias,
                    Author: Author
                }) : selectList.delete(ID)
                event.stopPropagation()
                event.stopImmediatePropagation()
                return false
            }
        }
    }) as HTMLInputElement
    pageSelectButtons.set(ID, button)
    originalNodeAppendChild.call(node, button)
}

export async function analyzeDownloadTask(list: IDictionary<PieceInfo> = selectList) {
    let size = list.size
    let node = renderNode({
        nodeType: 'p',
        childs: `%#parsingProgress#%[${list.size}/${size}]`
    })
    let start = newToast(ToastType.Info, {
        node: node,
        duration: -1
    })
    start.showToast()
    if (GM_getValue('isDebug') && config.downloadType === DownloadType.Aria2) {
        let completed: Array<string> = (await aria2API('aria2.tellStopped', [0, 2048, [
            'gid',
            'status',
            'files',
            'errorCode',
            'bittorrent'
        ]])).result.filter((task: Aria2.Status) => isNullOrUndefined(task.bittorrent) && (task.status === 'complete' || task.errorCode === '13')).map((task: Aria2.Status) => aria2TaskExtractVideoID(task)).filter(Boolean)
        for (let key of list.allKeys().intersect(completed)) {
            let button = getSelectButton(key)
            if (!isNullOrUndefined(button)) button.checked = false
            list.delete(key)
            node.firstChild!.textContent = `${i18n[config.language].parsingProgress}[${list.size}/${size}]`
        }
    }
    let infoList = (await Promise.all(list.allKeys().map(async id => {
        let caches = db.videos.where('ID').equals(id)
        let cache = await caches.first()
        if ((await caches.count()) < 1 || isNullOrUndefined(cache)) {
            let parseToast = newToast(
                ToastType.Info,
                {
                    text: `${list.get(id)?.Title ?? id} %#parsing#%`,
                    duration: -1,
                    close: true,
                    onClick() {
                        parseToast.hideToast()
                    }
                }
            )
            parseToast.showToast()
            cache = await new VideoInfo(list.get(id)).init(id)
            parseToast.hideToast()
        }
        return cache
    }))).sort((a, b) => a.UploadTime.getTime() - b.UploadTime.getTime());
    for (let videoInfo of infoList) {
        let button = getSelectButton(videoInfo.ID)
        let video = videoInfo.State ? videoInfo : await new VideoInfo(list.get(videoInfo.ID)).init(videoInfo.ID);
        video.State && await pushDownloadTask(video)
        if (!isNullOrUndefined(button)) button.checked = false
        list.delete(videoInfo.ID)
        node.firstChild!.textContent = `${i18n[config.language].parsingProgress}[${list.size}/${size}]`
    }
    start.hideToast()
    if (size != 1) {
        let completed = newToast(
            ToastType.Info,
            {
                text: `%#allCompleted#%`,
                duration: -1,
                close: true,
                onClick() {
                    completed.hideToast()
                }
            }
        )
        completed.showToast()
    }
}
