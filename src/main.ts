import "./env";
import { i18nList } from "./i18n";
import { DownloadType, PageType, ToastType, VersionState } from "./enum";
import { delay, isCacheVideoInfo, isFailVideoInfo, isInitVideoInfo, isNullOrUndefined, isString, isVideoInfo, prune, stringify } from "./env";
import { originalAddEventListener, originalConsole, originalFetch, originalNodeAppendChild, originalHistoryPushState, originalElementRemove, originalNodeRemoveChild, originalHistoryReplaceState, originalStorageSetItem, originalStorageRemoveItem, originalStorageClear } from "./hijack";
import { config, Config } from "./config";
import { Dictionary, MultiPage, SyncDictionary, VCSyncDictionary, Version } from "./class";
import { db } from "./db";
import "./date";
import { findElement, renderNode, unlimitedFetch } from "./extension";
import { analyzeLocalPath, aria2API, aria2Download, aria2TaskCheckAndRestart, aria2TaskExtractVideoID, browserDownload, browserDownloadErrorParse, check, checkIsHaveDownloadLink, getAuth, getDownloadPath, getPlayload, iwaraDownloaderDownload, newToast, othersDownload, refreshToken, toastNode } from "./function";
import mainCSS from "./css/main.css";

import { getDomain } from "./import";

if ((getDomain(unsafeWindow.location.href) !== "iwara.tv" && getDomain(unsafeWindow.location.href) !== "iwara.zip") && unsafeWindow.location.hostname.includes('iwara')) {
    // @ts-ignore
    XMLHttpRequest.prototype.open = undefined
    // @ts-ignore
    unsafeWindow.fetch = undefined
    // @ts-ignore
    unsafeWindow.WebSocket = undefined
    if (!confirm(stringify(i18nList[config.language].notOfficialWarning))) {
        unsafeWindow.location.href = "about:blank"
        unsafeWindow.close()
    } else {
        throw "Not official"
    }
}

if (getDomain(unsafeWindow.location.href) !== "iwara.tv") {
    throw "Not target"
}


export const isPageType = (type: string): type is PageType => new Set(Object.values(PageType)).has(type as PageType)

export var isLoggedIn = () => !(unsafeWindow.localStorage.getItem('token') ?? '').isEmpty()
export var rating = () => localStorage.getItem('rating') ?? 'all'
var mouseTarget: Element | null = null

async function getCommentData(id: string, commentID?: string, page: number = 0): Promise<Iwara.IPage> {
    return await (await unlimitedFetch(`https://api.iwara.tv/video/${id}/comments?page=${page}${!isNullOrUndefined(commentID) && !commentID.isEmpty() ? '&parent=' + commentID : ''}`, { headers: await getAuth() })).json() as Iwara.IPage
}
async function getCommentDatas(id: string, commentID?: string): Promise<Iwara.Comment[]> {
    let comments: Iwara.Comment[] = []
    let base = await getCommentData(id, commentID)
    comments.push(...base.results as Iwara.Comment[])
    for (let page = 1; page < Math.ceil(base.count / base.limit); page++) {
        comments.push(...(await getCommentData(id, commentID, page)).results as Iwara.Comment[])
    }
    let replies: Iwara.Comment[] = []
    for (let index = 0; index < comments.length; index++) {
        const comment = comments[index]
        if (comment.numReplies > 0) {
            replies.push(...await getCommentDatas(id, comment.id))
        }
    }
    comments.push(...replies)
    return comments
}
async function getCDNCache(id: string, info?: VideoInfo) {
    let cache = (await db.videos.where('ID').equals(id).toArray()).pop() ?? info
    let cdnCache = await db.caches.where('ID').equals(id).toArray()
    if (!cdnCache.any() && (cache?.Type === 'partial' || cache?.Type === 'full')) {
        let query = prune({
            author: cache.Alias ?? cache.Author,
            title: cache.Title
        }) as { [key: string]: string; }
        for (const key in query) {
            let dom = new DOMParser().parseFromString(await (await unlimitedFetch(`https://mmdfans.net/?query=${encodeURIComponent(`${key}:${query[key]}`)}`)).text(), "text/html")
            for (let i of [...dom.querySelectorAll('.mdui-col > a')]) {
                let ID = (i.querySelector('.mdui-grid-tile > img') as HTMLImageElement)?.src?.toURL()?.pathname?.split('/')?.pop()?.trimTail('.jpg')
                if (isNullOrUndefined(ID)) continue
                await db.caches.put({
                    ID, href: `https://mmdfans.net${(i as HTMLLinkElement).getAttribute('href')}`
                })
            }
        }
    }
    cdnCache = await db.caches.where('ID').equals(id).toArray()
    if (cdnCache.any()) {
        newToast(
            ToastType.Warn,
            {
                node:
                    toastNode([
                        `${cache?.RAW?.title}[${id}] %#parsingFailed#%`,
                        { nodeType: 'br' },
                        `%#cdnCacheFinded#%`
                    ], '%#createTask#%'),
                onClick() {
                    GM_openInTab(cdnCache[0].href, { active: false, insert: true, setParent: true })
                    this.hide()
                },
            }
        ).show()
        return
    }
    newToast(
        ToastType.Error,
        {
            node:
                toastNode([
                    `${cache?.RAW?.title}[${id}] %#parsingFailed#%`
                ], '%#createTask#%'),
            onClick() {
                this.hide()
            },
        }
    ).show()

}

export async function parseVideoInfo(info: VideoInfo): Promise<VideoInfo> {
    let ID: string = info.ID
    let Type: VideoInfoType = info.Type
    let RAW: Iwara.Video | undefined = info.RAW
    try {
        switch (info.Type) {
            case "cache":
                RAW = info.RAW
                ID = RAW.id
                Type = 'partial'
                break;
            case "init":
            case "fail":
            case "partial":
            case "full":
                let sourceResult = await (await unlimitedFetch(
                    `https://api.iwara.tv/video/${info.ID}`,
                    {
                        headers: await getAuth()
                    },
                    {
                        retry: true,
                        maxRetries: 3,
                        failStatuses: [403, 404],
                        retryDelay: 1000,
                        onRetry: async () => { await refreshToken() }
                    }
                )).json() as Iwara.IResult
                if (isNullOrUndefined(sourceResult.id)) {
                    Type = 'fail'
                    return {
                        ID, Type, RAW, Msg: sourceResult.message ?? stringify(sourceResult)
                    }
                }
                RAW = sourceResult as Iwara.Video
                ID = RAW.id
                Type = 'full'
                break;
            default:
                Type = 'fail'
                return {
                    ID, Type, RAW, Msg: "Unknown type"
                }
        }
    } catch (error) {
        newToast(
            ToastType.Error,
            {
                node:
                    toastNode([
                        `${info.RAW?.title}[${ID}] %#parsingFailed#%`
                    ], '%#createTask#%'),
                async onClick() {
                    await parseVideoInfo({ Type: 'init', ID, RAW, UploadTime: 0 })
                    this.hide()
                },
            }
        ).show()
        Type = 'fail'
        return {
            ID, Type, RAW, Msg: stringify(error)
        }
    }


    let FileName: string
    let Size: number
    let External: boolean
    let ExternalUrl: string | undefined
    let Description: string | undefined
    let DownloadQuality: string
    let DownloadUrl: string
    let Comments: string
    let UploadTime: number
    let Title: string
    let Tags: Iwara.Tag[]
    let Liked: boolean
    let Alias: string
    let Author: string
    let AuthorID: string
    let Private: boolean
    let Unlisted: boolean
    let Following: boolean
    let Friend: boolean

    UploadTime = new Date(RAW.createdAt ?? 0).getTime()
    Title = RAW.title
    Tags = RAW.tags
    Liked = RAW.liked
    Alias = RAW.user.name
    Author = RAW.user.username
    AuthorID = RAW.user.id
    Private = RAW.private
    Unlisted = RAW.unlisted


    External = !isNullOrUndefined(RAW.embedUrl) && !RAW.embedUrl.isEmpty()
    ExternalUrl = RAW.embedUrl

    if (External) {
        Type = 'fail'
        return {
            Type, RAW, ID, Alias, Author, AuthorID, Private, UploadTime, Title, Tags, Liked, External, ExternalUrl, Description, Unlisted, Msg: "external Video"
        }
    }

    try {
        switch (Type) {
            case "full":
                Following = RAW.user.following
                Friend = RAW.user.friend

                if (Following) {
                    db.follows.put(RAW.user, AuthorID)
                } else {
                    db.follows.delete(AuthorID)
                }

                if (Friend) {
                    db.friends.put(RAW.user, AuthorID)
                } else {
                    db.friends.delete(AuthorID)
                }

                Description = RAW.body
                FileName = RAW.file.name
                Size = RAW.file.size
                let VideoFileSource = (await (await unlimitedFetch(RAW.fileUrl, { headers: await getAuth(RAW.fileUrl) })).json() as Iwara.Source[]).sort((a, b) => (!isNullOrUndefined(config.priority[b.name]) ? config.priority[b.name] : 0) - (!isNullOrUndefined(config.priority[a.name]) ? config.priority[a.name] : 0))
                if (isNullOrUndefined(VideoFileSource) || !(VideoFileSource instanceof Array) || VideoFileSource.length < 1) throw new Error(i18nList[config.language].getVideoSourceFailed.toString())

                DownloadQuality = config.checkPriority ? config.downloadPriority : VideoFileSource[0].name
                let fileList = VideoFileSource.filter(x => x.name === DownloadQuality)
                if (!fileList.any()) throw new Error(i18nList[config.language].noAvailableVideoSource.toString())

                let Source = fileList[Math.floor(Math.random() * fileList.length)].src.download
                if (isNullOrUndefined(Source) || Source.isEmpty()) throw new Error(i18nList[config.language].videoSourceNotAvailable.toString())

                DownloadUrl = decodeURIComponent(`https:${Source}`)
                Comments = `${(await getCommentDatas(ID)).map(i => i.body).join('\n')}`.normalize('NFKC')

                return {
                    Type, RAW, ID, Alias, Author, AuthorID, Private, UploadTime, Title, Tags, Liked, External, FileName, DownloadQuality, ExternalUrl, Description, Comments, DownloadUrl, Size, Following, Unlisted, Friend
                }
            case "partial":
                return {
                    Type, RAW, ID, Alias, Author, AuthorID, UploadTime, Title, Tags, Liked, External, ExternalUrl, Unlisted, Private
                }
            default:
                Type = 'fail'
                return {
                    Type, RAW, ID, Alias, Author, AuthorID, Private, UploadTime, Title, Tags, Liked, External, ExternalUrl, Description, Unlisted, Msg: "Unknown type"
                }
        }
    }
    catch (error) {
        Type = 'fail'
        return {
            Type, RAW, ID, Alias, Author, AuthorID, Private, UploadTime, Title, Tags, Liked, External, ExternalUrl, Description, Unlisted, Msg: stringify(error)
        }
    }
}

class configEdit {
    source!: configEdit;
    target: Config
    interfacePage: HTMLParagraphElement;
    interface: HTMLDivElement;
    constructor(config: Config) {
        this.target = config
        this.target.configChange = (item: string) => { this.configChange.call(this, item) }
        this.interfacePage = renderNode({
            nodeType: 'p'
        })
        let save = renderNode({
            nodeType: 'button',
            childs: '%#save#%',
            attributes: {
                title: i18nList[config.language].save
            },
            events: {
                click: async () => {
                    save.disabled = !save.disabled
                    if (await check()) {
                        unsafeWindow.location.reload()
                    }
                    save.disabled = !save.disabled
                }
            }
        })
        let reset = renderNode({
            nodeType: 'button',
            childs: '%#reset#%',
            attributes: {
                title: i18nList[config.language].reset
            },
            events: {
                click: () => {
                    GM_setValue('isFirstRun', true)
                    unsafeWindow.location.reload()
                }
            }
        })
        this.interface = renderNode({
            nodeType: 'div',
            attributes: {
                id: 'pluginConfig'
            },
            childs: [
                {
                    nodeType: 'div',
                    className: 'main',
                    childs: [
                        {
                            nodeType: 'h2',
                            childs: '%#appName#%'
                        },
                        {
                            nodeType: 'label',
                            childs: [
                                '%#language#% ',
                                {
                                    nodeType: 'input',
                                    className: 'inputRadioLine',
                                    attributes: {
                                        name: 'language',
                                        type: 'text',
                                        value: this.target.language
                                    },
                                    events: {
                                        change: (event: Event) => {
                                            this.target.language = (event.target as HTMLInputElement).value
                                        }
                                    }
                                }
                            ]
                        },
                        this.downloadTypeSelect(),
                        this.interfacePage,
                        this.switchButton('checkPriority'),
                        this.switchButton('checkDownloadLink'),
                        this.switchButton('autoFollow'),
                        this.switchButton('autoLike'),
                        this.switchButton('autoInjectCheckbox'),
                        this.switchButton('autoDownloadMetadata'),
                        this.switchButton('autoCopySaveFileName'),
                        this.switchButton('addUnlistedAndPrivate'),
                        this.switchButton('experimentalFeatures'),
                        this.switchButton('enableUnsafeMode'),
                        this.switchButton('isDebug', GM_getValue, (name: string, e) => {
                            GM_setValue(name, (e.target as HTMLInputElement).checked)
                            unsafeWindow.location.reload()
                        }, false),
                    ]
                },
                {
                    nodeType: 'p',
                    className: 'buttonList',
                    childs: [
                        reset,
                        save
                    ]
                }
            ]
        })

    }
    private switchButton(name: string, get?: (name: string, defaultValue?: any) => any, set?: (name: string, e: Event) => void, defaultValue?: boolean) {
        return renderNode({
            nodeType: 'p',
            className: 'inputRadioLine',
            childs: [
                {
                    nodeType: 'label',
                    childs: `%#${name}#%`,
                    attributes: {
                        for: name
                    }
                }, {
                    nodeType: 'input',
                    className: 'switch',
                    attributes: {
                        type: 'checkbox',
                        name: name,
                        checked: get !== undefined ? get(name, defaultValue) : this.target[name] ?? defaultValue ?? false
                    },
                    events: {
                        change: (e: Event) => {
                            if (set !== undefined) {
                                set(name, e)
                                return
                            } else {
                                this.target[name] = (e.target as HTMLInputElement).checked
                            }
                        }
                    }
                }
            ]
        })
    }
    private inputComponent(name: string, type?: InputType, help?: HTMLElement, get?: (name: string) => void, set?: (name: string, e: Event) => void) {
        return renderNode({
            nodeType: 'label',
            childs: [
                {
                    nodeType: 'span',
                    childs: [
                        `%#${name}#%`,
                        help
                    ],
                },
                {
                    nodeType: 'input',
                    attributes: {
                        name: name,
                        type: type ?? 'text',
                        value: get !== undefined ? get(name) : this.target[name]
                    },
                    events: {
                        change: (e: Event) => {
                            if (set !== undefined) {
                                set(name, e)
                                return
                            } else {
                                this.target[name] = (e.target as HTMLInputElement).value
                            }
                        }
                    }
                }
            ]
        })
    }
    private downloadTypeSelect() {
        return renderNode({
            nodeType: 'fieldset',
            childs: [
                {
                    nodeType: 'legend',
                    childs: '%#downloadType#%'
                },
                ...Object.keys(DownloadType).filter((i: any) => isNaN(Number(i))).map((type: string, index: number) =>
                    renderNode({
                        nodeType: 'label',
                        childs: [
                            {
                                nodeType: 'input',
                                attributes: {
                                    type: 'radio',
                                    name: 'downloadType',
                                    value: index,
                                    checked: index === Number(this.target.downloadType)
                                },
                                events: {
                                    change: (e) => {
                                        this.target.downloadType = Number((e.target as HTMLInputElement).value)
                                    }
                                }
                            },
                            type
                        ]
                    })
                )
            ]
        })
    }
    private configChange(item: string) {
        switch (item) {
            case 'downloadType':
                const radios = this.interface.querySelectorAll(`[name=${item}]`) as NodeListOf<HTMLInputElement>
                radios.forEach(radio => {
                    radio.checked = Number(radio.value) === Number(this.target.downloadType)
                })
                this.pageChange()
                break
            case 'checkPriority':
                this.pageChange()
                break
            default:
                let element = this.interface.querySelector(`[name=${item}]`) as HTMLInputElement
                if (element) {
                    switch (element.type) {
                        case 'radio':
                            element.value = this.target[item]
                            break
                        case 'checkbox':
                            element.checked = this.target[item]
                            break
                        case 'text':
                        case 'password':
                            element.value = this.target[item]
                            break
                        default:
                            break
                    }
                }
                break
        }
    }
    private pageChange() {
        while (this.interfacePage.hasChildNodes()) {
            this.interfacePage.removeChild(this.interfacePage.firstChild!)
        }
        let downloadConfigInput = [
            this.inputComponent('downloadPath', 'text', renderNode({
                nodeType: 'a',
                childs: '%#variable#%',
                className: 'rainbow-text',
                attributes: {
                    style: 'float: inline-end;',
                    href: 'https://github.com/dawn-lc/IwaraDownloadTool/wiki/路径可用变量'
                }
            }))
        ]
        let proxyConfigInput = [
            this.inputComponent('downloadProxy'),
            this.inputComponent('downloadProxyUsername'),
            this.inputComponent('downloadProxyPassword', 'password')
        ]
        let aria2ConfigInput = [
            this.inputComponent('aria2Path'),
            this.inputComponent('aria2Token', 'password'),
            ...proxyConfigInput
        ]
        let iwaraDownloaderConfigInput = [
            this.inputComponent('iwaraDownloaderPath'),
            this.inputComponent('iwaraDownloaderToken', 'password'),
            ...proxyConfigInput
        ]
        switch (this.target.downloadType) {
            case DownloadType.Aria2:
                downloadConfigInput.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                aria2ConfigInput.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break
            case DownloadType.IwaraDownloader:
                downloadConfigInput.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                iwaraDownloaderConfigInput.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break
            default:
                downloadConfigInput.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break
        }
        if (this.target.checkPriority) {
            originalNodeAppendChild.call(this.interfacePage, this.inputComponent('downloadPriority'))
        }
    }
    public inject() {
        if (!unsafeWindow.document.querySelector('#pluginConfig')) {
            originalNodeAppendChild.call(unsafeWindow.document.body, this.interface)
            this.configChange('downloadType')
        }
    }
}
class menu {
    [key: string | symbol]: any
    observer!: MutationObserver;
    pageType!: PageType;
    interface!: HTMLDivElement;
    interfacePage!: HTMLUListElement;
    constructor() {
        let body = new Proxy(this, {
            set: (target, prop, value) => {
                if (prop === 'pageType') {
                    if (isNullOrUndefined(value) || this.pageType === value) return true
                    target[prop] = value
                    this.pageChange()
                    GM_getValue('isDebug') && originalConsole.debug(`[Debug] Page change to ${this.pageType}`)
                    return true
                }
                return target[prop] = value;
            }
        })
        body.interfacePage = renderNode({
            nodeType: 'ul'
        })
        body.interface = renderNode({
            nodeType: 'div',
            attributes: {
                id: 'pluginMenu'
            },
            childs: body.interfacePage
        })

        let mouseoutTimer: number | null = null;

        originalAddEventListener.call(body.interface, 'mouseover', (event: Event) => {
            // 清除之前的计时器
            if (mouseoutTimer !== null) {
                clearTimeout(mouseoutTimer);
                mouseoutTimer = null;
            }
            body.interface.classList.add('expanded');
        })

        originalAddEventListener.call(body.interface, 'mouseout', (event: Event) => {
            const e = event as MouseEvent;
            const relatedTarget = e.relatedTarget as Node;

            // 检查鼠标是否移动到子元素上
            if (relatedTarget && body.interface.contains(relatedTarget)) {
                return; // 鼠标移动到子元素上，不触发收起
            }

            // 设置300毫秒延迟后收起
            mouseoutTimer = setTimeout(() => {
                body.interface.classList.remove('expanded');
                mouseoutTimer = null;
            }, 300);
        })

        originalAddEventListener.call(body.interface, 'click', (event: Event) => {
            if (event.target === body.interface) {
                body.interface.classList.toggle('expanded');
            }
        })

        body.observer = new MutationObserver((mutationsList) => body.pageType = getPageType(mutationsList) ?? body.pageType)
        body.pageType = PageType.Page
        return body
    }
    private button(name: string, click?: (name: string, e: Event) => void) {
        return renderNode({
            nodeType: 'li',
            childs: `%#${name}#%`,
            events: {
                click: (event: Event) => {
                    !isNullOrUndefined(click) && click(name, event)
                    event.stopPropagation()
                    return false
                }
            }
        })
    }

    public async parseUnlistedAndPrivate() {
        if (!isLoggedIn()) return
        const lastMonthTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000
        const thisMonthUnlistedAndPrivateVideos = await db.videos
            .where('UploadTime')
            .between(lastMonthTimestamp, Infinity)
            .and(i => (!isInitVideoInfo(i) && !isFailVideoInfo(i) && !isCacheVideoInfo(i)) && (i.Private || i.Unlisted))
            .toArray();
        let parseUnlistedAndPrivateVideos: VideoInfo[] = []

        let pageCount = 0;
        const MAX_FIND_PAGES = 64;
        GM_getValue('isDebug') && originalConsole.debug(`[Debug] Starting fetch loop. MAX_PAGES=${MAX_FIND_PAGES}`);

        while (pageCount < MAX_FIND_PAGES) {
            GM_getValue('isDebug') && originalConsole.debug(`[Debug] Fetching page ${pageCount}.`);
            /*
            const response = await unlimitedFetch(`https://api.iwara.tv/search?type=videos&sort=date&limit=50&query=${encodeURIComponent('{private:true}')}&rating=${rating()}&page=${pageCount}`,
                { method: 'GET', headers: await getAuth() },
                {
                    retry: true,
                    retryDelay: 1000,
                    onRetry: async () => { await refreshToken() }
                })
            */
            const response = await unlimitedFetch(
                `https://api.iwara.tv/videos?subscribed=true&limit=50&rating=${rating()}&page=${pageCount}`,
                { method: 'GET', headers: await getAuth() },
                {
                    retry: true,
                    retryDelay: 1000,
                    onRetry: async () => { await refreshToken() }
                }
            );
            GM_getValue('isDebug') && originalConsole.debug('[Debug] Received response, parsing JSON.');
            const data = (await response.json() as Iwara.IPage).results as Iwara.Video[];
            GM_getValue('isDebug') && originalConsole.debug(`[Debug] Page ${pageCount} returned ${data.length} videos.`);
            data.forEach(info => info.user.following = true);
            const videoPromises = data.map(info => parseVideoInfo({
                Type: 'cache',
                ID: info.id,
                RAW: info
            }));
            GM_getValue('isDebug') && originalConsole.debug('[Debug] Initializing VideoInfo promises.');
            const videoInfos = await Promise.all(videoPromises);
            parseUnlistedAndPrivateVideos.push(...videoInfos);
            let test = videoInfos.filter(i => i.Type === 'partial' && (i.Private || i.Unlisted)).any()
            GM_getValue('isDebug') && originalConsole.debug('[Debug] All VideoInfo objects initialized.');
            if (test && thisMonthUnlistedAndPrivateVideos.intersect(videoInfos, 'ID').any()) {
                GM_getValue('isDebug') && originalConsole.debug(`[Debug] Found private video on page ${pageCount}.`);
                break;
            }
            GM_getValue('isDebug') && originalConsole.debug(`[Debug] Latest private video not found on page ${pageCount}, continuing.`);
            pageCount++;

            GM_getValue('isDebug') && originalConsole.debug(`[Debug] Incremented page to ${pageCount}, delaying next fetch.`);
            await delay(100);
        }
        GM_getValue('isDebug') && originalConsole.debug('[Debug] Fetch loop ended. Start updating the database');
        const toUpdate = parseUnlistedAndPrivateVideos.difference(
            (
                await db.videos.where('ID').anyOf(
                    parseUnlistedAndPrivateVideos.map(v => v.ID)
                ).toArray()
            ).filter(v => v.Type === 'full'), 'ID')
        if (toUpdate.any()) {
            GM_getValue('isDebug') && originalConsole.debug(`[Debug] Need to update ${toUpdate.length} pieces of data.`);
            await db.videos.bulkPut(toUpdate)
            GM_getValue('isDebug') && originalConsole.debug(`[Debug] Update Completed.`);
        } else {
            GM_getValue('isDebug') && originalConsole.debug(`[Debug] No need to update data.`);
        }
    }

    public async pageChange() {
        while (this.interfacePage.hasChildNodes()) {
            this.interfacePage.removeChild(this.interfacePage.firstChild!)
        }
        let manualDownloadButton = this.button('manualDownload', (name, event) => {
            addDownloadTask()
        })
        let settingsButton = this.button('settings', (name, event) => {
            editConfig.inject()
        })

        let exportConfigButton = this.button('exportConfig', (name, event) => {
            GM_setClipboard(stringify(config));
            newToast(
                ToastType.Info,
                {
                    node: toastNode(i18nList[config.language].exportConfigSucceed),
                    duration: 3000,
                    gravity: 'bottom',
                    position: 'center',
                    onClick() {
                        this.hide();
                    }
                }
            ).show()
        })

        let baseButtons = [
            manualDownloadButton,
            exportConfigButton,
            settingsButton
        ];

        let injectCheckboxButton = this.button('injectCheckbox', (name, event) => {
            if (unsafeWindow.document.querySelector('.selectButton')) {
                unsafeWindow.document.querySelectorAll('.selectButton').forEach((element) => {
                    element.remove()
                })
            } else {
                unsafeWindow.document.querySelectorAll(`.videoTeaser`).forEach((element: Element) => {
                    injectCheckbox(element)
                })
            }
        })

        let deselectAllButton = this.button('deselectAll', (name, event) => {
            for (const id of selectList.keys()) {
                selectList.delete(id)
            }
        })
        let reverseSelectButton = this.button('reverseSelect', (name, event) => {
            unsafeWindow.document.querySelectorAll('.selectButton').forEach((element) => {
                (element as HTMLInputElement).click()
            })
        })
        let selectThisButton = this.button('selectThis', (name, event) => {
            unsafeWindow.document.querySelectorAll('.selectButton').forEach((element) => {
                let button = element as HTMLInputElement
                !button.checked && button.click()
            })
        })
        let deselectThisButton = this.button('deselectThis', (name, event) => {
            unsafeWindow.document.querySelectorAll('.selectButton').forEach((element) => {
                let button = element as HTMLInputElement
                button.checked && button.click()
            })
        })
        let downloadSelectedButton = this.button('downloadSelected', (name, event) => {
            analyzeDownloadTask()
            newToast(ToastType.Info, {
                text: `%#${name}#%`,
                close: true
            }).show()
        })

        let selectButtons = [
            injectCheckboxButton,
            deselectAllButton,
            reverseSelectButton,
            selectThisButton,
            deselectThisButton,
            downloadSelectedButton
        ]

        let downloadThisButton = this.button('downloadThis', async (name, event) => {
            let ID = unsafeWindow.location.href.toURL().pathname.split('/')[2]
            await pushDownloadTask(await parseVideoInfo({
                Type: 'init', ID
            }), true)
        })

        let aria2TaskCheckButton = this.button('aria2TaskCheck', (name, event) => {
            aria2TaskCheckAndRestart()
        })
        config.experimentalFeatures && originalNodeAppendChild.call(this.interfacePage, aria2TaskCheckButton)

        switch (this.pageType) {
            case PageType.Video:
                originalNodeAppendChild.call(this.interfacePage, downloadThisButton)
                selectButtons.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                baseButtons.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break
            case PageType.Search:
            case PageType.Profile:
            case PageType.Home:
            case PageType.VideoList:
            case PageType.Subscriptions:
            case PageType.Playlist:
            case PageType.Favorites:
            case PageType.Account:
                selectButtons.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                baseButtons.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break;
            case PageType.Page:
            case PageType.Forum:
            case PageType.Image:
            case PageType.ImageList:
            case PageType.ForumSection:
            case PageType.ForumThread:
            default:
                baseButtons.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break;
        }


        if (config.addUnlistedAndPrivate && this.pageType === PageType.VideoList) {
            this.parseUnlistedAndPrivate()
        } else {
            GM_getValue('isDebug') && originalConsole.debug('[Debug] Conditions not met: addUnlistedAndPrivate or pageType mismatch.');
        }
    }
    public inject() {
        this.observer.observe(unsafeWindow.document.getElementById('app')!, { childList: true, subtree: true });
        if (!unsafeWindow.document.querySelector('#pluginMenu')) {
            originalNodeAppendChild.call(unsafeWindow.document.body, this.interface)
            this.pageType = getPageType() ?? this.pageType
        }
    }
}

var pluginMenu = new menu()
var editConfig = new configEdit(config)

export var selectList = new VCSyncDictionary<VideoInfo>('selectList');
export var pageStatus = new MultiPage()
export var pageSelectButtons = new Dictionary<HTMLInputElement>()

var selected = renderNode({
    nodeType: 'span',
    childs: ` %#selected#% ${selectList.size} `
})

var watermark = renderNode({
    nodeType: 'p',
    className: 'fixed-bottom-right',
    childs: [
        `%#appName#% ${GM_getValue('version')} `,
        selected,
        GM_getValue('isDebug') ? `%#isDebug#%` : ''
    ]
})

export function getSelectButton(id: string): HTMLInputElement | undefined {
    return pageSelectButtons.has(id) ? pageSelectButtons.get(id) : unsafeWindow.document.querySelector(`input.selectButton[videoid="${id}"]`) as HTMLInputElement
}
function saveSelectList(): void {
    GM_getTabs((tabs) => {
        if (Object.keys(tabs).length > 1) return;
        selectList.save()
    });
}
function updateSelected() {
    selected.textContent = ` ${i18nList[config.language].selected} ${selectList.size} `
}
function updateButtonState(videoID: string) {
    const selectButton = getSelectButton(videoID)
    if (selectButton) selectButton.checked = selectList.has(videoID)
}

originalAddEventListener.call(unsafeWindow.document, "visibilitychange", saveSelectList)
pageStatus.onPageLeave = () => {
    saveSelectList()
}
selectList.onSet = (key) => {
    updateButtonState(key);
    saveSelectList();
    updateSelected();
};
selectList.onDel = (key) => {
    updateButtonState(key);
    saveSelectList();
    updateSelected();
};
selectList.onSync = () => {
    pageSelectButtons.forEach((value, key) => {
        updateButtonState(key);
    })
    saveSelectList();
    updateSelected();
};

function generateMatadataURL(videoInfo: FullVideoInfo): string {
    const metadataContent = generateMetadataContent(videoInfo);
    const blob = new Blob([metadataContent], { type: 'text/plain' });
    return URL.createObjectURL(blob);
}
function getMatadataPath(videoInfo: FullVideoInfo): string {
    const videoPath = getDownloadPath(videoInfo);
    return `${videoPath.directory}/${videoPath.baseName}.json`;
}
function generateMetadataContent(videoInfo: FullVideoInfo): string {
    const metadata = Object.assign(videoInfo, {
        DownloadPath: getDownloadPath(videoInfo).fullPath,
        MetaDataVersion: GM_info.script.version,
    });
    return JSON.stringify(metadata, (key, value) => {
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value;
    }, 2);
}
function browserDownloadMetadata(videoInfo: FullVideoInfo): void {
    const url = generateMatadataURL(videoInfo);
    function toastError(error: Tampermonkey.DownloadErrorResponse | Error) {
        newToast(
            ToastType.Error,
            {
                node: toastNode([
                    `${videoInfo.Title}[${videoInfo.ID}] %#videoMetadata#% %#downloadFailed#%`,
                    { nodeType: 'br' },
                    browserDownloadErrorParse(error)
                ], '%#browserDownload#%'),
                close: true
            }
        ).show()
    }
    GM_download({
        url: url,
        saveAs: false,
        name: getMatadataPath(videoInfo),
        onerror: (err) => toastError(err),
        ontimeout: () => toastError(new Error('%#browserDownloadTimeout#%')),
        onload: () => URL.revokeObjectURL(url)
    });
}
function othersDownloadMetadata(videoInfo: FullVideoInfo): void {
    const url = generateMatadataURL(videoInfo);
    const metadataFile = analyzeLocalPath(getMatadataPath(videoInfo)).fullName
    const downloadHandle = renderNode({
        nodeType: 'a',
        attributes: {
            href: url,
            download: metadataFile
        }
    });
    downloadHandle.click();
    downloadHandle.remove();
    URL.revokeObjectURL(url);
}
async function addDownloadTask() {
    let textArea = renderNode({
        nodeType: "textarea",
        attributes: {
            placeholder: i18nList[config.language].manualDownloadTips,
            style: 'margin-bottom: 10px;',
            rows: "16",
            cols: "96"
        }
    })
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
                            let list: Array<[string, VideoInfo]> = [];
                            try {
                                const parsed = JSON.parse(textArea.value);
                                if (Array.isArray(parsed)) {
                                    list = parsed.map(item => {
                                        if (Array.isArray(item) && isString(item[0]) && !item[0].isEmpty()) {
                                            if (!isVideoInfo(item[1])) {
                                                item[1].Type = 'init'
                                                item[1].ID = item[1].ID ?? item[0]
                                                item[1].UpdateTime = item[1].UpdateTime ?? Date.now()
                                            }
                                        }
                                        return [...item]
                                    }) as Array<[string, VideoInfo]>;
                                } else {
                                    throw new Error('解析结果不是符合预期的列表');
                                }
                            } catch (error) {
                                list = textArea.value.split('|').map(ID => [ID.trim(), {
                                    Type: 'init',
                                    ID: ID.trim(),
                                    UpdateTime: Date.now()
                                }]);
                            }
                            if (list.length > 0) {
                                analyzeDownloadTask(new Dictionary<VideoInfo>(list));
                            }
                        }
                        body.remove()
                    }
                },
                childs: i18nList[config.language].ok
            }
        ]
    })
    unsafeWindow.document.body.appendChild(body)
}
async function downloadTaskUnique(taskList: Dictionary<VideoInfo>) {
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
    let downloadCompleted: Array<{ id: string, data: Aria2.Status }> = stoped.filter(
        (task: { id: string, data: Aria2.Status }) => task.data.status === 'complete'
    ).unique('id');
    let startedAndCompleted = [...active, ...downloadCompleted].map(i => i.id);
    for (let key of taskList.keysArray().intersect(startedAndCompleted)) {
        taskList.delete(key)
    }
}
async function analyzeDownloadTask(taskList: Dictionary<VideoInfo> = selectList) {
    let size = taskList.size
    let node = renderNode({
        nodeType: 'p',
        childs: `${i18nList[config.language].parsingProgress}[${taskList.size}/${size}]`
    })

    let parsingProgressToast = newToast(ToastType.Info, {
        node: node,
        duration: -1
    })

    function updateParsingProgress() {
        node.firstChild!.textContent = `${i18nList[config.language].parsingProgress}[${taskList.size}/${size}]`
    }

    parsingProgressToast.show()
    if (config.experimentalFeatures && config.downloadType === DownloadType.Aria2) {
        await downloadTaskUnique(taskList)
        updateParsingProgress()
    }

    for (let [id, info] of taskList) {
        await pushDownloadTask(await parseVideoInfo(info))
        taskList.delete(id)
        updateParsingProgress()
        !config.enableUnsafeMode && await delay(3000)
    }

    parsingProgressToast.hide()
    newToast(
        ToastType.Info,
        {
            text: `%#allCompleted#%`,
            duration: -1,
            close: true,
            onClick() {
                this.hide()
            }
        }
    ).show()
}
export async function pushDownloadTask(videoInfo: VideoInfo, bypass: boolean = false) {
    switch (videoInfo.Type) {
        case "full":
            await db.videos.put(videoInfo, videoInfo.ID)
            if (!bypass) {
                const authorInfo = await db.follows.get(videoInfo.AuthorID);
                if (config.autoFollow && (!authorInfo?.following || !videoInfo.Following)) {
                    await unlimitedFetch(
                        `https://api.iwara.tv/user/${videoInfo.AuthorID}/followers`,
                        {
                            method: 'POST',
                            headers: await getAuth()
                        },
                        {
                            retry: true,
                            successStatus: 201,
                            failStatuses: [404],
                            onFail: async (res) => {
                                newToast(ToastType.Warn, {
                                    text: `${videoInfo.Alias} %#autoFollowFailed#% ${res.status}`,
                                    close: true,
                                    onClick() { this.hide() }
                                }).show();
                            },
                            onRetry: async () => { await refreshToken() }
                        }
                    );
                }
                if (config.autoLike && !videoInfo.Liked) {
                    await unlimitedFetch(
                        `https://api.iwara.tv/video/${videoInfo.ID}/like`,
                        {
                            method: 'POST',
                            headers: await getAuth()
                        },
                        {
                            retry: true,
                            successStatus: 201,
                            failStatuses: [404],
                            onFail: async (res) => {
                                newToast(ToastType.Warn, {
                                    text: `${videoInfo.Alias} %#autoLikeFailed#% ${res.status}`,
                                    close: true,
                                    onClick() { this.hide() }
                                }).show();
                            },
                            onRetry: async () => { await refreshToken() }
                        }
                    )
                }
                if (config.checkDownloadLink && checkIsHaveDownloadLink(`${videoInfo.Description} ${videoInfo.Comments}`)) {
                    let toastBody = toastNode([
                        `${videoInfo.Title}[${videoInfo.ID}] %#findedDownloadLink#%`,
                        { nodeType: 'br' },
                        `%#openVideoLink#%`
                    ], '%#createTask#%')
                    newToast(
                        ToastType.Warn,
                        {
                            node: toastBody,
                            close: config.autoCopySaveFileName,
                            onClick() {
                                GM_openInTab(`https://www.iwara.tv/video/${videoInfo.ID}`, { active: false, insert: true, setParent: true })
                                if (config.autoCopySaveFileName) {
                                    GM_setClipboard(getDownloadPath(videoInfo).fullName, "text")
                                    toastBody.appendChild(renderNode({
                                        nodeType: 'p',
                                        childs: '%#copySucceed#%'
                                    }))
                                } else {
                                    this.hide()
                                }
                            }
                        }
                    ).show()
                    return
                }
            }
            if (config.checkPriority && videoInfo.DownloadQuality !== config.downloadPriority) {
                newToast(
                    ToastType.Warn,
                    {
                        node: toastNode([
                            `${videoInfo.Title.truncate(64)}[${videoInfo.ID}] %#downloadQualityError#%`,
                            { nodeType: 'br' },
                            `%#tryReparseDownload#%`
                        ], '%#createTask#%'),
                        async onClick() {
                            this.hide()
                            await pushDownloadTask(await parseVideoInfo(videoInfo))
                        }
                    }
                ).show()
                return
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
            if (config.autoDownloadMetadata) {
                switch (config.downloadType) {
                    case DownloadType.Others:
                        othersDownloadMetadata(videoInfo)
                        break
                    case DownloadType.Browser:
                        browserDownloadMetadata(videoInfo)
                        break
                    default:
                        break
                }
                GM_getValue('isDebug') && originalConsole.debug('[Debug] Download task pushed:', videoInfo);
            }
            selectList.delete(videoInfo.ID)
            break;
        case "partial":
            const partialCache = await db.videos.get(videoInfo.ID)
            if (!isNullOrUndefined(partialCache) && partialCache.Type !== 'full') await db.videos.put(videoInfo, videoInfo.ID)
        case "cache":
        case "init":
            return await pushDownloadTask(await parseVideoInfo(videoInfo))
        case "fail":
            const cache = await db.videos.get(videoInfo.ID)
            newToast(
                ToastType.Error,
                {
                    close: true,
                    node: toastNode([
                        `${videoInfo.Title ?? videoInfo.RAW?.title ?? cache?.RAW?.title}[${videoInfo.ID}] %#parsingFailed#%`,
                        { nodeType: 'br' },
                        videoInfo.Msg,
                        { nodeType: 'br' },
                        videoInfo.External ? `%#openVideoLink#%` : `%#tryReparseDownload#%`
                    ], '%#createTask#%'),
                    async onClick() {
                        this.hide()
                        if (videoInfo.External && !isNullOrUndefined(videoInfo.ExternalUrl) && !videoInfo.ExternalUrl.isEmpty()) {
                            GM_openInTab(videoInfo.ExternalUrl, { active: false, insert: true, setParent: true })
                        } else {
                            await pushDownloadTask(await parseVideoInfo({ Type: 'init', ID: videoInfo.ID, RAW: videoInfo.RAW ?? cache?.RAW }))
                        }
                    },
                }
            ).show()
            break;
        default:
            GM_getValue('isDebug') && originalConsole.debug('[Debug] Unknown type:', videoInfo);
            break;
    }
}

function uninjectCheckbox(element: Element | Node) {
    if (element instanceof HTMLElement) {
        if (element instanceof HTMLInputElement && element.classList.contains('selectButton')) {
            element.hasAttribute('videoID') && pageSelectButtons.delete(element.getAttribute('videoID')!)
        }
        if (element.querySelector('input.selectButton')) {
            element.querySelectorAll('.selectButton').forEach(i => i.hasAttribute('videoID') && pageSelectButtons.delete(i.getAttribute('videoID')!))
        }
    }
}
async function injectCheckbox(element: Element) {
    let ID = (element.querySelector('a.videoTeaser__thumbnail') as HTMLLinkElement).href.toURL().pathname.split('/')[2]
    if (isNullOrUndefined(ID)) return
    let info = await db.videos.get(ID)
    let Title = info?.Type === 'full' || info?.Type === 'partial' ? info?.Title : info?.RAW?.title ?? element.querySelector('.videoTeaser__title')?.getAttribute('title') ?? undefined;
    let Alias = info?.Type === 'full' || info?.Type === 'partial' ? info?.Alias : info?.RAW?.user.name ?? element.querySelector('a.username')?.getAttribute('title') ?? undefined;
    let Author = info?.Type === 'full' || info?.Type === 'partial' ? info?.Author : info?.RAW?.user.username ?? (element.querySelector('a.username') as HTMLLinkElement)?.href.toURL().pathname.split('/').pop()
    let UploadTime = info?.Type === 'full' || info?.Type === 'partial' ? info?.UploadTime : new Date(info?.RAW?.updatedAt ?? 0).getTime()

    let button = renderNode({
        nodeType: 'input',
        attributes: {
            type: 'checkbox',
            videoID: ID,
            checked: selectList.has(ID) ? true : undefined,
            videoName: Title,
            videoAlias: Alias,
            videoAuthor: Author,
            videoUploadTime: UploadTime
        },
        className: 'selectButton',
        events: {
            click: (event: Event) => {
                (event.target as HTMLInputElement).checked ? selectList.set(ID, {
                    Type: 'init',
                    ID,
                    Title,
                    Alias,
                    Author,
                    UploadTime
                }) : selectList.delete(ID)
                event.stopPropagation()
                event.stopImmediatePropagation()
                return false
            }
        }
    })
    let item = element.querySelector('.videoTeaser__thumbnail')?.parentElement
    item?.style.setProperty('position', 'relative')
    pageSelectButtons.set(ID, button)
    originalNodeAppendChild.call(item, button)

    if (!isNullOrUndefined(Author)) {
        const AuthorInfo = await db.follows.where('username').equals(Author).first()
        if (AuthorInfo?.following && element.querySelector('.videoTeaser__thumbnail')?.querySelector('.follow') === null) {
            originalNodeAppendChild.call(element.querySelector('.videoTeaser__thumbnail'), renderNode(
                {
                    nodeType: 'div',
                    className: 'follow',
                    childs: {
                        nodeType: 'div',
                        className: ['text', 'text--white', 'text--tiny', 'text--bold'],
                        childs: '%#following#%'
                    }
                }
            ))
        }
    }

    if (pluginMenu.pageType === PageType.Playlist) {
        let deletePlaylistItme = renderNode({
            nodeType: 'button',
            attributes: {
                videoID: ID
            },
            childs: '%#delete#%',
            className: 'deleteButton',
            events: {
                click: async (event: Event) => {
                    if ((await unlimitedFetch(`https://api.iwara.tv/playlist/${unsafeWindow.location.pathname.split('/')[2]}/${ID}`, {
                        method: 'DELETE',
                        headers: await getAuth()
                    })).ok) {
                        newToast(ToastType.Info, { text: `${Title} %#deleteSucceed#%`, close: true }).show()
                        deletePlaylistItme.remove()
                    }
                    event.preventDefault()
                    event.stopPropagation()
                    event.stopImmediatePropagation()
                    return false
                }
            }
        })
        originalNodeAppendChild.call(item, deletePlaylistItme)
    }
}
function getPageType(mutationsList?: MutationRecord[]): PageType | undefined {
    if (unsafeWindow.location.pathname.toLowerCase().endsWith('/search')) {
        return PageType.Search;
    }

    const extractPageType = (page: Element | null | undefined): PageType | undefined => {
        if (isNullOrUndefined(page)) return undefined;
        if (page.classList.length < 2) return PageType.Page;
        const pageClass = page.classList[1]?.split('-').pop();
        return !isNullOrUndefined(pageClass) && isPageType(pageClass) ? (pageClass as PageType) : PageType.Page;
    };

    if (isNullOrUndefined(mutationsList)) {
        return extractPageType(unsafeWindow.document.querySelector('.page'));
    }

    for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            return extractPageType(Array.from(mutation.addedNodes).find((node): node is Element => node instanceof Element && node.classList.contains('page')))
        }
    }
}
function pageChange() {
    pluginMenu.pageType = getPageType() ?? pluginMenu.pageType
    GM_getValue('isDebug') && originalConsole.debug('[Debug]', pageSelectButtons)
}

function hijackAddEventListener() {
    unsafeWindow.EventTarget.prototype.addEventListener = function (type, listener, options) {
        originalAddEventListener.call(this, type, listener, options)
    }
}
function hijackNodeAppendChild() {
    Node.prototype.appendChild = function <T extends Node>(node: T): T {
        if (node instanceof HTMLElement && node.classList.contains('videoTeaser')) {
            injectCheckbox(node)
        }
        return originalNodeAppendChild.call(this, node) as T
    }
}
function hijackNodeRemoveChild() {
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
        uninjectCheckbox(child)
        return originalNodeRemoveChild.apply(this, [child]) as T
    }

}
function hijackElementRemove() {
    Element.prototype.remove = function () {
        uninjectCheckbox(this)
        return originalElementRemove.apply(this)
    }
}
function hijackHistoryPushState() {
    unsafeWindow.history.pushState = function (...args) {
        originalHistoryPushState.apply(this, args)
        pageChange()
    }
}
function hijackHistoryReplaceState() {
    unsafeWindow.history.replaceState = function (...args) {
        originalHistoryReplaceState.apply(this, args)
        pageChange()
    }
}
function hijackStorage() {
    unsafeWindow.Storage.prototype.setItem = function (key, value) {
        originalStorageSetItem.call(this, key, value)
        if (key === 'token') pluginMenu.pageChange()
    }
    unsafeWindow.Storage.prototype.removeItem = function (key) {
        originalStorageRemoveItem.call(this, key)
        if (key === 'token') pluginMenu.pageChange()
    }
    unsafeWindow.Storage.prototype.clear = function () {
        originalStorageClear.call(this)
        pluginMenu.pageChange()
    }
}

function firstRun() {
    originalConsole.log('First run config reset!')
    GM_listValues().forEach(i => GM_deleteValue(i))
    Config.destroyInstance()
    editConfig = new configEdit(config)
    let confirmButton = renderNode({
        nodeType: 'button',
        attributes: {
            disabled: true,
            title: i18nList[config.language].ok
        },
        childs: '%#ok#%',
        events: {
            click: () => {
                GM_setValue('isFirstRun', false)
                GM_setValue('version', GM_info.script.version)
                unsafeWindow.document.querySelector('#pluginOverlay')?.remove()
                editConfig.inject()
            }
        }
    })
    originalNodeAppendChild.call(unsafeWindow.document.body, renderNode({
        nodeType: 'div',
        attributes: {
            id: 'pluginOverlay'
        },
        childs: [
            {
                nodeType: 'div',
                className: 'main',
                childs: [
                    { nodeType: 'p', childs: i18nList[config.language].useHelpForBase },
                    { nodeType: 'p', childs: '%#useHelpForInjectCheckbox#%' },
                    { nodeType: 'p', childs: '%#useHelpForCheckDownloadLink#%' },
                    { nodeType: 'p', childs: i18nList[config.language].useHelpForManualDownload },
                    { nodeType: 'p', childs: i18nList[config.language].useHelpForBugreport }
                ]
            },
            {
                nodeType: 'div',
                className: 'checkbox-container',
                childs: {
                    nodeType: 'label',
                    className: ['checkbox-label', 'rainbow-text'],
                    childs: [{
                        nodeType: 'input',
                        className: 'checkbox',
                        attributes: {
                            type: 'checkbox',
                            name: 'agree-checkbox'
                        },
                        events: {
                            change: (event: Event) => {
                                confirmButton.disabled = !(event.target as HTMLInputElement).checked
                            }
                        }
                    }, '%#alreadyKnowHowToUse#%'
                    ]
                }
            },
            confirmButton
        ]
    }))
}

async function main() {
    if (new Version(GM_getValue('version', '0.0.0')).compare(new Version('3.3.0')) === VersionState.Low) {
        GM_setValue('isFirstRun', true)
        alert(i18nList[config.language].configurationIncompatible)
    }
    if (GM_getValue('isFirstRun', true)) {
        firstRun()
        return
    }
    if (new Version(GM_getValue('version', '0.0.0')).compare(new Version('3.3.22')) === VersionState.Low) {
        alert(i18nList[config.language].configurationIncompatible)
        try {
            pageStatus.suicide()
            selectList.clear()
            GM_deleteValue('selectList')
            await db.delete()
            GM_setValue('version', GM_info.script.version)
            unsafeWindow.location.reload()
        } catch (error) {
            originalConsole.error(error)
        }
        return
    }
    if (!await check()) {
        newToast(ToastType.Info, {
            text: `%#configError#%`,
            duration: 60 * 1000,
        }).show()
        editConfig.inject()
        return
    }
    GM_setValue('version', GM_info.script.version)
    hijackAddEventListener()
    if (config.autoInjectCheckbox) hijackNodeAppendChild()
    hijackNodeRemoveChild()
    hijackElementRemove()
    hijackStorage()
    hijackHistoryPushState()
    hijackHistoryReplaceState()
    originalAddEventListener('mouseover', (event: Event) => {
        mouseTarget = (event as MouseEvent).target instanceof Element ? (event as MouseEvent).target as Element : null
    })
    originalAddEventListener('keydown', (event: Event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (keyboardEvent.code === 'Space' && !isNullOrUndefined(mouseTarget)) {
            let element = findElement(mouseTarget, '.videoTeaser')
            let button = element && (element.matches('.selectButton') ? element : element.querySelector('.selectButton'))
            button && (button as HTMLInputElement).click()
            button && keyboardEvent.preventDefault()
        }
    })
    new MutationObserver(async (m, o) => {
        if (m.some(m => m.type === 'childList' && unsafeWindow.document.getElementById('app'))) {
            pluginMenu.inject()
            o.disconnect()
        }
    }).observe(unsafeWindow.document.body, { childList: true, subtree: true })
    originalNodeAppendChild.call(unsafeWindow.document.body, watermark)
    if (isLoggedIn()) {
        let user = await (await unlimitedFetch('https://api.iwara.tv/user', {
            method: 'GET',
            headers: await getAuth()
        })).json() as Iwara.LocalUser
        let authorProfile = await db.follows.where('username').equals('dawn').first()
        if (isNullOrUndefined(authorProfile)) {
            authorProfile = (await (await unlimitedFetch('https://api.iwara.tv/profile/dawn', {
                method: 'GET',
                headers: await getAuth()
            })).json() as Iwara.Profile).user
            if (user.user.id !== authorProfile.id) {
                if (!authorProfile.following) {
                    unlimitedFetch(`https://api.iwara.tv/user/${authorProfile.id}/followers`, {
                        method: 'POST',
                        headers: await getAuth()
                    })
                }
                if (!authorProfile.friend) {
                    unlimitedFetch(`https://api.iwara.tv/user/${authorProfile.id}/friends`, {
                        method: 'POST',
                        headers: await getAuth()
                    })
                }
            }
        }
    }
    newToast(
        ToastType.Info,
        {
            node: toastNode(i18nList[config.language].notice),
            duration: 10000,
            gravity: 'bottom',
            position: 'center',
            onClick() {
                this.hide();
            }
        }
    ).show()
}

if (!unsafeWindow.IwaraDownloadTool) {
    unsafeWindow.IwaraDownloadTool = true;
    if (GM_getValue('isDebug')) {
        debugger
        // @ts-ignore
        unsafeWindow.pageStatus = pageStatus
        originalConsole.debug(stringify(GM_info))
    }

    unsafeWindow.fetch = async (input: Request | string | URL, init?: RequestInit) => {
        GM_getValue('isDebug') && originalConsole.debug(`[Debug] Fetch ${input}`)
        let url = (input instanceof Request ? input.url : input instanceof URL ? input.href : input).toURL()
        if (!isNullOrUndefined(init) && !isNullOrUndefined(init.headers)) {
            let authorization = null
            if (init.headers instanceof Headers) {
                authorization = init.headers.has('Authorization') ? init.headers.get('Authorization') : null
            } else {
                if (Array.isArray(init.headers)) {
                    let index = init.headers.findIndex(([key, value]) => key.toLowerCase() !== "authorization")
                    if (!(index < 0)) authorization = init.headers[index][1]
                } else {
                    for (const key in init.headers) {
                        if (key.toLowerCase() !== "authorization") continue
                        authorization = init.headers[key]
                        break
                    }
                }
            }
            if (!isNullOrUndefined(authorization)) {
                let playload = getPlayload(authorization)
                let token = authorization.split(' ').pop() ?? ''
                if (playload['type'] === 'refresh_token' && !token.isEmpty()) {
                    localStorage.setItem('token', token)
                    config.authorization = token
                    GM_getValue('isDebug') && originalConsole.debug(`[Debug] refresh_token: 凭证已隐藏`)
                }
            }
        }
        return new Promise((resolve, reject) => originalFetch(input, init)
            .then(async (response) => {
                if (url.hostname !== 'api.iwara.tv' || url.pathname.isEmpty()) return resolve(response)
                let path = url.pathname.toLowerCase().split('/').slice(1)
                switch (path[0]) {
                    case 'user':
                        if (path[1] === 'token') {
                            const cloneResponse = response.clone()
                            if (!cloneResponse.ok) break;
                            const { accessToken } = await cloneResponse.json()
                            let token = localStorage.getItem('accessToken')
                            if (isNullOrUndefined(token) || token !== accessToken) localStorage.setItem('accessToken', accessToken)
                        }
                        break
                    case 'videos':
                        const cloneResponse = response.clone()
                        if (!cloneResponse.ok) break;

                        const cloneBody = await cloneResponse.json() as Iwara.IPage
                        const list = (await Promise.allSettled((cloneBody.results as Iwara.Video[]).map(info => parseVideoInfo({ Type: 'cache', ID: info.id, RAW: info })))).filter(i => i.status === 'fulfilled').map(i => i.value).filter(i => i.Type === 'partial' || i.Type === 'full');
                        const toUpdate = list.difference((await db.videos.where('ID').anyOf(list.map(v => v.ID)).toArray()).filter(v => v.Type === 'full'), 'ID')
                        if (toUpdate.any()) {
                            await db.videos.bulkPut(toUpdate)
                        }

                        if (!config.addUnlistedAndPrivate) break
                        GM_getValue('isDebug') && originalConsole.debug('[Debug]', url.searchParams)
                        if (url.searchParams.has('user')) break
                        if (url.searchParams.has('subscribed')) break
                        if (url.searchParams.has('sort') ? url.searchParams.get('sort') !== 'date' : false) break

                        const sortedList = list.sort((a, b) => a.UploadTime - b.UploadTime)
                        const minTime = sortedList.at(0)!.UploadTime
                        const maxTime = sortedList.at(-1)!.UploadTime
                        const startTime = new Date(minTime).sub({ hours: 4 }).getTime()
                        const endTime = new Date(maxTime).add({ hours: 4 }).getTime()
                        const cache = (await db.getFilteredVideos(startTime, endTime)).filter(i => i.Type === 'partial' || i.Type === 'full').sort((a, b) => a.UploadTime - b.UploadTime).map(i => i.RAW)
                        if (!cache.any()) break
                        cloneBody.count += cache.length
                        cloneBody.limit += cache.length
                        cloneBody.results.push(...cache)
                        return resolve(new Response(JSON.stringify(cloneBody), {
                            status: cloneResponse.status,
                            statusText: cloneResponse.statusText,
                            headers: Object.fromEntries(cloneResponse.headers.entries())
                        }))
                    default:
                        break
                }
                return resolve(response)
            })
            .catch((err) => reject(err))) as Promise<Response>
    }

    GM_getTabs((tabs) => {
        if (Object.keys(tabs).length != 1) return;
        try {
            selectList = VCSyncDictionary.load('selectList') ?? new VCSyncDictionary<VideoInfo>('selectList');
        } catch (error) {
            console.error('load selectList failed, resetting:', error);
            GM_deleteValue('selectList');
            selectList = new VCSyncDictionary<VideoInfo>('selectList');
        }

    });
    GM_addStyle(mainCSS);
    (unsafeWindow.document.body ? Promise.resolve() : new Promise(resolve => originalAddEventListener.call(unsafeWindow.document, "DOMContentLoaded", resolve))).then(main)
}
