import Dexie from "dexie";
import { i18n } from "./i18n";
import { compatible, isElement, isNullOrUndefined, isString, originalAddEventListener, originalNodeAppendChild } from "./env";
import { fetch, ceilDiv, getString, prune, renderNode, } from "./extension";
import { localPathCheck, aria2Check, iwaraDownloaderCheck, EnvCheck, refreshToken, getAuth, newToast, toastNode, getSelectButton, pushDownloadTask, addDownloadTask, injectCheckbox, analyzeDownloadTask, aria2TaskCheck } from "./function";
import { config, db, editConfig, firstRun, rating, selectList } from "./main";

export enum DownloadType {
    Aria2,
    IwaraDownloader,
    Browser,
    Others
}

export enum PageType {
    Video = 'video',
    Image = 'image',
    VideoList = 'videoList',
    ImageList = 'imageList',
    Forum = 'forum',
    ForumSection = 'forumSection',
    ForumThread = 'forumThread',
    Page = 'page',
    Home = 'home',
    Profile = 'profile',
    Subscriptions = 'subscriptions',
    Playlist = 'playlist',
    Favorites = 'favorites',
    Search = 'search',
    Account = 'account'
}

export enum ToastType {
    Log,
    Info,
    Warn,
    Error
}

export enum MessageType {
    Close,
    Request,
    Receive,
    Set,
    Del
}

export enum VersionState {
    Low,
    Equal,
    High
}

export class Version implements IVersion {
    major: number;
    minor: number;
    patch: number;
    preRelease: string[];
    buildMetadata: string;

    constructor(versionString: string) {
        const [version, preRelease, buildMetadata] = versionString.split(/[-+]/);
        const versionParts = version.split('.').map(Number);
        this.major = versionParts[0] || 0;
        this.minor = versionParts.length > 1 ? versionParts[1] : 0;
        this.patch = versionParts.length > 2 ? versionParts[2] : 0;
        this.preRelease = preRelease ? preRelease.split('.') : [];
        this.buildMetadata = buildMetadata;
    }

    public compare(other: IVersion): VersionState {
        const compareSegment = (a: number | string, b: number | string): VersionState => {
            if (a < b) {
                return VersionState.Low;
            } else if (a > b) {
                return VersionState.High;
            }
            return VersionState.Equal;
        };

        let state = compareSegment(this.major, other.major);
        if (state !== VersionState.Equal) return state;

        state = compareSegment(this.minor, other.minor);
        if (state !== VersionState.Equal) return state;

        state = compareSegment(this.patch, other.patch);
        if (state !== VersionState.Equal) return state;

        for (let i = 0; i < Math.max(this.preRelease.length, other.preRelease.length); i++) {
            const pre1 = this.preRelease[i];
            const pre2 = other.preRelease[i];
            if (pre1 === undefined && pre2 !== undefined) {
                return VersionState.High;
            } else if (pre1 !== undefined && pre2 === undefined) {
                return VersionState.Low;
            }
            if (pre1 !== undefined && pre2 !== undefined) {
                state = compareSegment(isNaN(+pre1) ? pre1 : +pre1, isNaN(+pre2) ? pre2 : +pre2);
                if (state !== VersionState.Equal) return state;
            }
        }

        return VersionState.Equal;
    }
}
export class Dictionary<T> extends Map<string, T> {
    constructor(data: Array<[key: string, value: T]> = []) {
        super()
        data.forEach(i => this.set(i[0], i[1]))
    }
    public toArray(): Array<[key: string, value: T]> {
        return Array.from(this)
    }
    public allKeys(): Array<string> {
        return Array.from(this.keys())
    }
    public allValues(): Array<T> {
        return Array.from(this.values())
    }
}
export class SyncDictionary<T> extends Dictionary<T> {
    private channel: BroadcastChannel
    private changeTime: number
    private id: string
    private changeCallback: ((event: MessageEvent) => void) | null
    constructor(id: string, data: Array<[key: string, value: T]> = [], changeCallback: ((event: MessageEvent) => void) | null) {
        super(data)
        this.channel = new BroadcastChannel(`${GM_info.script.name}.${id}`)
        this.changeCallback = changeCallback
        this.changeTime = 0
        this.id = id
        if (isNullOrUndefined(GM_getValue(id, { timestamp: 0, value: [] }).timestamp))
            GM_deleteValue(id)
        originalAddEventListener.call(unsafeWindow, 'beforeunload', this.saveData.bind(this))
        originalAddEventListener.call(unsafeWindow, 'pagehide', this.saveData.bind(this))
        originalAddEventListener.call(unsafeWindow, 'unload', this.saveData.bind(this))
        this.channel.onmessage = (event: MessageEvent) => {
            const message = event.data as IChannelMessage<{ timestamp: number, value: Array<[key: string, value: T]> }>
            const { type, data: { timestamp, value } } = message
            GM_getValue('isDebug') && console.debug(`Channel message: ${getString(message)}`)
            if (timestamp <= this.changeTime) return;
            switch (type) {
                case MessageType.Set:
                    value.forEach(item => super.set(item[0], item[1]))
                    break
                case MessageType.Del:
                    value.forEach(item => super.delete(item[0]))
                    break
                case MessageType.Request:
                    if (this.changeTime === timestamp) return
                    if (this.changeTime > timestamp) return this.channel.postMessage({ type: MessageType.Receive, data: { timestamp: this.changeTime, value: super.toArray() } })
                    this.reinitialize(value)
                    break
                case MessageType.Close:
                case MessageType.Receive:
                    if (this.changeTime >= timestamp) return
                    this.reinitialize(value)
                    break
            }
            this.changeTime = timestamp
            this.changeCallback?.(event)
        }
        this.channel.onmessageerror = (event) => {
            GM_getValue('isDebug') && console.debug(`Channel message error: ${getString(event)}`)
        }
        GM_getTabs((tabs) => {
            const tabIds = Object.keys(tabs);
            const isLastTab = tabIds.length <= 1;
            if (isLastTab) {
                let save = GM_getValue(id, { timestamp: 0, value: [] })
                if (save.timestamp > this.changeTime) {
                    this.changeTime = save.timestamp
                    this.reinitialize(save.value)
                }
            } else {
                this.channel.postMessage({ type: MessageType.Request, data: { timestamp: this.changeTime, value: super.toArray() } })
            }
        })
    }
    private saveData() {
        const savedData = GM_getValue(this.id, { timestamp: 0, value: [] });
        if (this.changeTime > savedData.timestamp) {
            GM_getTabs((tabs) => {
                const tabIds = Object.keys(tabs);
                const isLastTab = tabIds.length <= 1;
                if (isLastTab) {
                    GM_setValue(this.id, { timestamp: this.changeTime, value: super.toArray() });
                } else {
                    this.channel.postMessage({ type: MessageType.Close, data: { timestamp: this.changeTime, value: super.toArray() } })
                }
            })
        }
    }
    private reinitialize(data: Array<[key: string, value: T]>) {
        super.clear()
        data.forEach(([key, value]) => super.set(key, value))
    }
    override set(key: string, value: T) {
        super.set(key, value)
        this.changeTime = Date.now()
        this.channel.postMessage({ type: MessageType.Set, data: { timestamp: this.changeTime, value: [[key, value]] } })
        return this
    }
    override delete(key: string) {
        let isDeleted = super.delete(key)
        if (isDeleted) {
            this.changeTime = Date.now()
            this.channel.postMessage({ type: MessageType.Del, data: { timestamp: this.changeTime, value: [[key]] } })
        }
        return isDeleted
    }
}

const DEFAULT_CONFIG = {
    language: 'en',
    autoFollow: false,
    autoLike: false,
    autoCopySaveFileName: false,
    autoInjectCheckbox: true,
    checkDownloadLink: true,
    checkPriority: true,
    addUnlistedAndPrivate: true,
    downloadPriority: 'Source',
    downloadType: DownloadType.Others,
    downloadPath: '/Iwara/%#AUTHOR#%/%#TITLE#%[%#ID#%].mp4',
    downloadProxy: '',
    aria2Path: 'http://127.0.0.1:6800/jsonrpc',
    aria2Token: '',
    iwaraDownloaderPath: 'http://127.0.0.1:6800/jsonrpc',
    iwaraDownloaderToken: '',
    priority: {
        'Source': 100,
        '540': 99,
        '360': 98,
        'preview': 1
    }
};

export class Config {
    configChange?: Function;
    language: string
    autoFollow: boolean
    autoLike: boolean
    addUnlistedAndPrivate: boolean
    autoInjectCheckbox: boolean
    autoCopySaveFileName: boolean
    checkDownloadLink: boolean
    checkPriority: boolean
    downloadPriority: string
    downloadType: DownloadType
    downloadPath: string
    downloadProxy: string
    aria2Path: string
    aria2Token: string
    iwaraDownloaderPath: string
    iwaraDownloaderToken: string
    authorization!: string;
    priority: Record<string, number>
    [key: string]: any
    constructor() {
        this.language = DEFAULT_CONFIG.language
        this.autoFollow = DEFAULT_CONFIG.autoFollow
        this.autoLike = DEFAULT_CONFIG.autoLike
        this.autoCopySaveFileName = DEFAULT_CONFIG.autoCopySaveFileName
        this.autoInjectCheckbox = DEFAULT_CONFIG.autoInjectCheckbox
        this.checkDownloadLink = DEFAULT_CONFIG.checkDownloadLink
        this.checkPriority = DEFAULT_CONFIG.checkPriority
        this.addUnlistedAndPrivate = DEFAULT_CONFIG.addUnlistedAndPrivate
        this.downloadPriority = DEFAULT_CONFIG.downloadPriority
        this.downloadType = DEFAULT_CONFIG.downloadType
        this.downloadPath = DEFAULT_CONFIG.downloadPath
        this.downloadProxy = DEFAULT_CONFIG.downloadProxy
        this.aria2Path = DEFAULT_CONFIG.aria2Path
        this.aria2Token = DEFAULT_CONFIG.aria2Token
        this.iwaraDownloaderPath = DEFAULT_CONFIG.iwaraDownloaderPath
        this.iwaraDownloaderToken =DEFAULT_CONFIG.iwaraDownloaderToken
        this.priority = DEFAULT_CONFIG.priority
        let body = new Proxy(this, {
            get: function (target, property: string) {
                if (property === 'configChange') {
                    return target.configChange
                }
                let value = GM_getValue(property, target[property])
                GM_getValue('isDebug') && console.debug(`get: ${property} ${getString(value)}`)
                return value
            },
            set: function (target, property: string, value) {
                if (property === 'configChange') {
                    target.configChange = value
                    return true
                }
                GM_setValue(property, value)
                GM_getValue('isDebug') && console.debug(`set: ${property} ${getString(value)}`)
                if (!isNullOrUndefined(target.configChange)) target.configChange(property)
                return true
            }
        })
        GM_listValues().forEach((value) => {
            GM_addValueChangeListener(value, (name: string, old_value: any, new_value: any, remote: boolean) => {
                GM_getValue('isDebug') && console.debug(`$Is Remote: ${remote} Change Value: ${name}`)//old: ${getString(old_value)} new: ${getString(new_value)}
                if (remote && !isNullOrUndefined(body.configChange)) body.configChange(name)
            })
        })
        return body
    }
    public async check() {
        if (await localPathCheck()) {
            switch (this.downloadType) {
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
}

export class configEdit {
    source!: configEdit;
    target: Config
    interface: HTMLElement
    interfacePage: HTMLElement
    constructor(config: Config) {
        this.target = config
        this.target.configChange = (item: string) => { this.configChange.call(this, item) }
        this.interfacePage = renderNode({
            nodeType: 'p'
        }) as HTMLElement
        let save = renderNode({
            nodeType: 'button',
            childs: '%#save#%',
            attributes: {
                title: i18n[config.language].save
            },
            events: {
                click: async () => {
                    save.disabled = !save.disabled
                    if (await this.target.check()) {
                        unsafeWindow.location.reload()
                    }
                    save.disabled = !save.disabled
                }
            }
        }) as HTMLButtonElement
        let reset = renderNode({
            nodeType: 'button',
            childs: '%#reset#%',
            attributes: {
                title: i18n[config.language].reset
            },
            events: {
                click: () => {
                    firstRun()
                    unsafeWindow.location.reload()
                }
            }
        }) as HTMLButtonElement
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
                                    attributes: Object.assign(
                                        {
                                            name: 'language',
                                            type: 'text',
                                            value: this.target.language
                                        }
                                    ),
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
                        this.switchButton('autoCopySaveFileName'),
                        this.switchButton('addUnlistedAndPrivate'),
                        this.switchButton('isDebug', GM_getValue, (name: string, e) => { GM_setValue(name, (e.target as HTMLInputElement).checked) }, false),
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
        }) as HTMLElement

    }
    private switchButton(name: string, get?: (name: string, defaultValue?: any) => any, set?: (name: string, e: Event) => void, defaultValue?: boolean): RenderCode {
        let button = renderNode({
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
        }) as HTMLElement
        (button.querySelector(`[name='${name}']`) as HTMLInputElement).checked = get !== undefined ? get(name, defaultValue) : this.target[name] ?? defaultValue ?? false
        return button
    }
    private inputComponent(name: string, type?: string, get?: (name: string) => void, set?: (name: string, e: Event) => void): RenderCode {
        return {
            nodeType: 'label',
            childs: [
                `%#${name}#% `,
                {
                    nodeType: 'input',
                    attributes: Object.assign(
                        {
                            name: name,
                            type: type ?? 'text',
                            value: get !== undefined ? get(name) : this.target[name]
                        }
                    ),
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
        }
    }
    private downloadTypeSelect(): RenderCode {
        let select = renderNode({
            nodeType: 'p',
            className: 'inputRadioLine',
            childs: [
                `%#downloadType#%`,
                {
                    nodeType: 'select',
                    childs: Object.keys(DownloadType).filter((i: any) => isNaN(Number(i))).map((i: string) => renderNode({
                        nodeType: 'option',
                        childs: i
                    })),
                    attributes: {
                        name: 'downloadType'
                    },
                    events: {
                        change: (e) => {
                            this.target.downloadType = (e.target as HTMLSelectElement).selectedIndex
                        }
                    }
                }
            ]
        }) as HTMLSelectElement
        select.selectedIndex = Number(this.target.downloadType)

        return select
    }
    private configChange(item: string) {
        switch (item) {
            case 'downloadType':
                (this.interface.querySelector(`[name=${item}]`) as HTMLSelectElement).selectedIndex = Number(this.target.downloadType)
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
        let variableInfo = renderNode({
            nodeType: 'a',
            childs: '%#variable#%',
            attributes: {
                href: 'https://github.com/dawn-lc/IwaraDownloadTool#路径可用变量'
            }
        })
        let downloadConfigInput = [
            variableInfo,
            renderNode(this.inputComponent('downloadPath')),
            renderNode(this.inputComponent('downloadProxy'))
        ]
        let aria2ConfigInput = [
            renderNode(this.inputComponent('aria2Path')),
            renderNode(this.inputComponent('aria2Token', 'password'))
        ]
        let iwaraDownloaderConfigInput = [
            renderNode(this.inputComponent('iwaraDownloaderPath')),
            renderNode(this.inputComponent('iwaraDownloaderToken', 'password'))
        ]
        let BrowserConfigInput = [
            variableInfo,
            renderNode(this.inputComponent('downloadPath'))
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
                BrowserConfigInput.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break
        }
        if (this.target.checkPriority) {
            originalNodeAppendChild.call(this.interfacePage, renderNode(this.inputComponent('downloadPriority')))
        }
    }
    public inject() {
        if (!unsafeWindow.document.querySelector('#pluginConfig')) {
            originalNodeAppendChild.call(unsafeWindow.document.body, this.interface)
            this.configChange('downloadType')
        }
    }
}


export class VideoInfo {
    ID!: string;
    UploadTime!: Date;
    Title!: string;
    FileName!: string;
    Size!: number;
    Tags!: Array<Iwara.Tag>;
    Liked!: boolean;
    Following!: boolean;
    Friend!: boolean;
    Alias!: string;
    Author!: string;
    AuthorID!: string;
    Private!: boolean;
    Unlisted!: boolean;
    DownloadQuality!: string;
    External!: boolean;
    ExternalUrl: string | null | undefined
    State!: boolean;
    Description!: string | null | undefined
    Comments!: string;
    DownloadUrl!: string;
    RAW!: Iwara.Video;
    constructor(info?: PieceInfo) {
        if (!isNullOrUndefined(info)) {
            if (!isNullOrUndefined(info.Title) && !info.Title.isEmpty()) this.Title = info.Title
            if (!isNullOrUndefined(info.Alias) && !info.Alias.isEmpty()) this.Alias = info.Alias
            if (!isNullOrUndefined(info.Author) && !info.Author.isEmpty()) this.Author = info.Author
        }
        return this
    }
    async init(ID: string, InfoSource?: Iwara.Video) {
        try {
            this.ID = ID
            if (isNullOrUndefined(InfoSource)) {
                config.authorization = `Bearer ${await refreshToken()}`
            } else {
                this.RAW = InfoSource
                await db.videos.put(this)
            }
            let VideoInfoSource: Iwara.Video = InfoSource ?? await (await fetch(`https://api.iwara.tv/video/${this.ID}`, {
                headers: await getAuth()
            })).json()

            if (VideoInfoSource.id === undefined) {
                let cache = await db.videos.where('ID').equals(this.ID).toArray()
                if (cache.any()) {
                    Object.assign(this, cache.pop())
                }
                let cdnCache = await db.caches.where('ID').equals(this.ID).toArray()
                if (!cdnCache.any()) {
                    let query = prune({
                        author: this.Alias ?? this.Author,
                        title: this.Title
                    })
                    for (const key in query) {
                        let dom = new DOMParser().parseFromString(await (await fetch(`https://mmdfans.net/?query=${encodeURIComponent(`${key}:${query[key]}`)}`)).text(), "text/html")
                        for (let i of [...dom.querySelectorAll('.mdui-col > a')]) {
                            let imgID = (i.querySelector('.mdui-grid-tile > img') as HTMLImageElement)?.src?.toURL()?.pathname?.split('/')?.pop()?.trimTail('.jpg')
                            if (isNullOrUndefined(imgID)) continue
                            await db.caches.put({
                                ID: imgID,
                                href: `https://mmdfans.net${(i as HTMLLinkElement).getAttribute('href')}`
                            })
                        }
                    }
                }
                cdnCache = await db.caches.where('ID').equals(this.ID).toArray()
                if (cdnCache.any()) {
                    let toast = newToast(
                        ToastType.Warn,
                        {
                            node:
                                toastNode([
                                    `${this.Title}[${this.ID}] %#parsingFailed#%`,
                                    { nodeType: 'br' },
                                    `%#cdnCacheFinded#%`
                                ], '%#createTask#%'),
                            onClick() {
                                GM_openInTab(cdnCache.pop()!.href, { active: false, insert: true, setParent: true })
                                toast.hideToast()
                            },
                        }
                    )
                    toast.showToast()
                    let button = getSelectButton(this.ID)
                    button && button.checked && button.click()
                    selectList.delete(this.ID)
                    this.State = false
                    return this
                }
                throw new Error(`${i18n[config.language].parsingFailed.toString()} ${VideoInfoSource.message}`)
            }
            this.ID = VideoInfoSource.id
            this.Title = VideoInfoSource.title ?? this.Title
            this.External = !isNullOrUndefined(VideoInfoSource.embedUrl) && !VideoInfoSource.embedUrl.isEmpty()
            this.AuthorID = VideoInfoSource.user.id
            this.Following = VideoInfoSource.user.following
            this.Liked = VideoInfoSource.liked
            this.Friend = VideoInfoSource.user.friend
            this.Private = VideoInfoSource.private
            this.Unlisted = VideoInfoSource.unlisted
            this.Alias = VideoInfoSource.user.name
            this.Author = VideoInfoSource.user.username
            this.UploadTime = new Date(VideoInfoSource.createdAt)
            this.Tags = VideoInfoSource.tags
            this.Description = VideoInfoSource.body
            this.ExternalUrl = VideoInfoSource.embedUrl
            await db.videos.put(this)
            if (!isNullOrUndefined(InfoSource)) {
                return this
            }
            if (this.External) {
                throw new Error(i18n[config.language].externalVideo.toString())
            }

            const getCommentData = async (commentID: string | null = null, page: number = 0): Promise<Iwara.Page> => {
                return await (await fetch(`https://api.iwara.tv/video/${this.ID}/comments?page=${page}${!isNullOrUndefined(commentID) && !commentID.isEmpty() ? '&parent=' + commentID : ''}`, { headers: await getAuth() })).json() as Iwara.Page
            }
            const getCommentDatas = async (commentID: string | null = null): Promise<Iwara.Comment[]> => {
                let comments: Iwara.Comment[] = []
                let base = await getCommentData(commentID)
                comments.push(...base.results as Iwara.Comment[])
                for (let page = 1; page < ceilDiv(base.count, base.limit); page++) {
                    comments.push(...(await getCommentData(commentID, page)).results as Iwara.Comment[])
                }
                let replies: Iwara.Comment[] = []
                for (let index = 0; index < comments.length; index++) {
                    const comment = comments[index]
                    if (comment.numReplies > 0) {
                        replies.push(...await getCommentDatas(comment.id))
                    }
                }
                comments.push(...replies)
                return comments.prune()
            }

            this.Comments += `${(await getCommentDatas()).map(i => i.body).join('\n')}`.normalize('NFKC')
            this.FileName = VideoInfoSource.file.name
            this.Size = VideoInfoSource.file.size
            let VideoFileSource = (await (await fetch(VideoInfoSource.fileUrl, { headers: await getAuth(VideoInfoSource.fileUrl) })).json() as Iwara.Source[]).sort((a, b) => (!isNullOrUndefined(config.priority[b.name]) ? config.priority[b.name] : 0) - (!isNullOrUndefined(config.priority[a.name]) ? config.priority[a.name] : 0))
            if (isNullOrUndefined(VideoFileSource) || !(VideoFileSource instanceof Array) || VideoFileSource.length < 1) {
                throw new Error(i18n[config.language].getVideoSourceFailed.toString())
            }
            this.DownloadQuality = config.checkPriority ? config.downloadPriority : VideoFileSource[0].name
            let fileList = VideoFileSource.filter(x => x.name === this.DownloadQuality)
            if (!fileList.any()) throw new Error(i18n[config.language].noAvailableVideoSource.toString())
            let Source = fileList[Math.floor(Math.random() * fileList.length)].src.download
            if (isNullOrUndefined(Source) || Source.isEmpty()) throw new Error(i18n[config.language].videoSourceNotAvailable.toString())
            this.DownloadUrl = decodeURIComponent(`https:${Source}`)
            this.State = true

            await db.videos.put(this)
            return this
        } catch (error) {
            let data = this
            let toast = newToast(
                ToastType.Error,
                {
                    node: toastNode([
                        `${this.Title}[${this.ID}] %#parsingFailed#%`,
                        { nodeType: 'br' },
                        `${getString(error)}`,
                        { nodeType: 'br' },
                        this.External ? `%#openVideoLink#%` : `%#tryReparseDownload#%`
                    ], '%#createTask#%'),
                    async onClick() {
                        toast.hideToast()
                        if (data.External) {
                            GM_openInTab(data.ExternalUrl!, { active: false, insert: true, setParent: true })
                        } else {
                            pushDownloadTask(await new VideoInfo(data as PieceInfo).init(data.ID))
                        }
                    },
                }
            )
            toast.showToast()
            let button = getSelectButton(this.ID)
            button && button.checked && button.click()
            selectList.delete(this.ID)
            this.State = false
            return this
        }
    }
}

export class Database extends Dexie {
    videos: Dexie.Table<VideoInfo, string>;
    caches: Dexie.Table<{ ID: string, href: string }, string>;
    aria2Tasks!: Dexie.Table<VideoInfo, Aria2.Result>;
    constructor() {
        super("VideoDatabase");
        this.version(2).stores({
            videos: 'ID',
            caches: 'ID'
        })
        this.version(3).stores({
            videos: 'ID, UploadTime',
            caches: 'ID'
        }).upgrade((trans) => {
            return trans.table('videos').toCollection().modify(video => {
                if (isNullOrUndefined(video.UploadTime)) {
                    video.UploadTime = new Date(0);
                } else if (typeof video.UploadTime === 'string') {
                    video.UploadTime = new Date(video.UploadTime);
                }
                if (isNullOrUndefined(video.RAW)) {
                    video.RAW = undefined;
                }
            })
        })
        this.videos = this.table("videos")
        this.caches = this.table("caches")
    }
    async getFilteredVideos(startTime: Date | string | undefined, endTime: Date | string | undefined ) {
        if (isNullOrUndefined(startTime) || isNullOrUndefined(endTime)) return [];
        startTime = isString(startTime) ? new Date(startTime) : startTime
        endTime = isString(endTime) ? new Date(endTime) : endTime
        return this.videos
            .where('UploadTime')
            .between(startTime, endTime, true, true)
            .and(video => !isNullOrUndefined(video.RAW))
            .and(video => video.Private !== false || video.Unlisted !== false)
            .toArray()
    }
}

export class menu {
    source!: menu;
    interface: HTMLElement
    interfacePage: HTMLElement
    constructor() {
        this.interfacePage = renderNode({
            nodeType: 'ul'
        }) as HTMLElement
        this.interface = renderNode({
            nodeType: 'div',
            attributes: {
                id: 'pluginMenu'
            },
            childs: this.interfacePage
        }) as HTMLElement
    }
    private button(name: string, click?: (name: string, e: Event) => void) {
        return renderNode(prune({
            nodeType: 'li',
            childs: `%#${name}#%`,
            events: {
                click: (event: Event) => {
                    !isNullOrUndefined(click) && click(name, event)
                    event.stopPropagation()
                    return false
                }
            }
        }))
    }
    private async pageChange(pageType: PageType) {
        while (this.interfacePage.hasChildNodes()) {
            this.interfacePage.removeChild(this.interfacePage.firstChild!)
        }

        let manualDownloadButton = this.button('manualDownload', (name, event) => {
            addDownloadTask()
        })
        let settingsButton = this.button('settings', (name, event) => {
            editConfig.inject()
        })
        let baseButtons = [manualDownloadButton, settingsButton]

        let injectCheckboxButton = this.button('injectCheckbox', (name, event) => {
            if (unsafeWindow.document.querySelector('.selectButton')) {
                unsafeWindow.document.querySelectorAll('.selectButton').forEach((element) => {
                    element.remove()
                })
            } else {
                unsafeWindow.document.querySelectorAll(`.videoTeaser`).forEach((element: Element) => {
                    injectCheckbox(element, compatible)
                })
            }
        })

        let deselectAllButton = this.button('deselectAll', (name, event) => {
            for (const id of selectList.keys()) {
                let button = getSelectButton(id)
                if (button && button.checked) button.checked = false
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
            }).showToast()
        })
        let selectButtons = [injectCheckboxButton, deselectAllButton, reverseSelectButton, selectThisButton, deselectThisButton, downloadSelectedButton]

        let downloadThisButton = this.button('downloadThis', async (name, event) => {
            let ID = unsafeWindow.location.href.toURL().pathname.split('/')[2]
            let Title = unsafeWindow.document.querySelector('.page-video__details')?.childNodes[0]?.textContent
            let videoInfo = await (new VideoInfo(prune({ Title: Title, }))).init(ID)
            videoInfo.State && await pushDownloadTask(videoInfo, true)
        })

        let aria2TaskCheckButton = this.button('aria2TaskCheck', (name, event) => {
            aria2TaskCheck()
        })
        GM_getValue('isDebug') && originalNodeAppendChild.call(this.interfacePage, aria2TaskCheckButton)

        switch (pageType) {
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

        if (config.addUnlistedAndPrivate && pageType === PageType.VideoList) {
            for (let page = 0; page < 10; page++) {
                const response = await fetch(`https://api.iwara.tv/videos?subscribed=true&limit=50&rating=${rating}&page=${page}`, {
                    method: 'GET',
                    headers: await getAuth()
                });
                const data = (await response.json() as Iwara.Page).results as Iwara.Video[];
                data.forEach(info => new VideoInfo().init(info.id, info));
            }
        }
    }
    public inject() {
        if (!unsafeWindow.document.querySelector('#pluginMenu')) {
            new MutationObserver((mutationsList) => {
                for (let mutation of mutationsList) {
                    if (mutation.type !== 'childList' || mutation.addedNodes.length < 1) {
                        continue;
                    }
                    let pages = ([...mutation.addedNodes].filter(i => isElement(i)) as Element[]).filter(i => i.classList.contains('page'))
                    if (pages.length < 1) {
                        continue;
                    }
                    if (unsafeWindow.location.pathname.toLowerCase().split('/').pop() === 'search') {
                        this.pageChange(PageType.Search)
                        continue;
                    }
                    let page = pages.find(i => i.classList.length > 1)
                    if (!page) {
                        continue;
                    }
                    this.pageChange(page.classList[1].split('-').pop() as PageType)
                }
            }).observe(unsafeWindow.document.getElementById('app')!, { childList: true, subtree: true });
            originalNodeAppendChild.call(unsafeWindow.document.body, this.interface)
            this.pageChange(PageType.Page)
        }
    }
}