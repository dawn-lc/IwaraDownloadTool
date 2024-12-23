import "./env";
import { isNullOrUndefined } from "./env";
import { i18n } from "./i18n";
import { config } from "./config";
import { db } from "./db";
import { unlimitedFetch, ceilDiv, getString, prune } from "./extension";
import { originalAddEventListener } from "./hijack";
import { refreshToken, getAuth, newToast, toastNode } from "./function";
import { getSelectButton, pushDownloadTask, selectList } from "./main";
import { MessageType, ToastType, VersionState } from "./type";


export class Version implements IVersion {
    major: number;
    minor: number;
    patch: number;
    preRelease: string[];
    buildMetadata: string;
    constructor(versionString: string) {
        if (!versionString || typeof versionString !== 'string') {
            throw new Error("Invalid version string");
        }
        const [version, preRelease, buildMetadata] = versionString.split(/[-+]/);
        const versionParts = version.split('.').map(Number);
        if (versionParts.some(isNaN)) {
            throw new Error("Version string contains invalid numbers");
        }
        this.major = versionParts[0] || 0;
        this.minor = versionParts.length > 1 ? versionParts[1] : 0;
        this.patch = versionParts.length > 2 ? versionParts[2] : 0;
        this.preRelease = preRelease ? preRelease.split('.') : [];
        this.buildMetadata = buildMetadata || '';
    }
    private static compareValues<T extends number | string>(a: T, b: T): VersionState {
        if (a < b) return VersionState.Low;
        if (a > b) return VersionState.High;
        return VersionState.Equal;
    }
    public compare(other: IVersion): VersionState {
        let state = Version.compareValues(this.major, other.major);
        if (state !== VersionState.Equal) return state;
        state = Version.compareValues(this.minor, other.minor);
        if (state !== VersionState.Equal) return state;
        state = Version.compareValues(this.patch, other.patch);
        if (state !== VersionState.Equal) return state;
        for (let i = 0; i < Math.max(this.preRelease.length, other.preRelease.length); i++) {
            const pre1 = this.preRelease[i] ?? '';
            const pre2 = other.preRelease[i] ?? '';
            state = Version.compareValues(
                isNaN(+pre1) ? pre1 : +pre1,
                isNaN(+pre2) ? pre2 : +pre2
            );
            if (state !== VersionState.Equal) return state;
        }
        return VersionState.Equal;
    }
    public toString(): string {
        const version = `${this.major}.${this.minor}.${this.patch}`;
        const preRelease = this.preRelease.length ? `-${this.preRelease.join('.')}` : '';
        const buildMetadata = this.buildMetadata ? `+${this.buildMetadata}` : '';
        return `${version}${preRelease}${buildMetadata}`;
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
            let VideoInfoSource: Iwara.Video = InfoSource ?? await (await unlimitedFetch(`https://api.iwara.tv/video/${this.ID}`, {
                headers: await getAuth()
            })).json()

            if (VideoInfoSource.id === undefined) {
                let cache = (await db.videos.where('ID').equals(this.ID).toArray()).pop()
                Object.assign(this, cache ?? {})
                this.State = false
                let cdnCache = await db.caches.where('ID').equals(this.ID).toArray()
                if (!cdnCache.any()) {
                    let query = prune({
                        author: this.Alias ?? this.Author,
                        title: this.Title
                    })
                    for (const key in query) {
                        let dom = new DOMParser().parseFromString(await (await unlimitedFetch(`https://mmdfans.net/?query=${encodeURIComponent(`${key}:${query[key]}`)}`)).text(), "text/html")
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
                return await (await unlimitedFetch(`https://api.iwara.tv/video/${this.ID}/comments?page=${page}${!isNullOrUndefined(commentID) && !commentID.isEmpty() ? '&parent=' + commentID : ''}`, { headers: await getAuth() })).json() as Iwara.Page
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
            let VideoFileSource = (await (await unlimitedFetch(VideoInfoSource.fileUrl, { headers: await getAuth(VideoInfoSource.fileUrl) })).json() as Iwara.Source[]).sort((a, b) => (!isNullOrUndefined(config.priority[b.name]) ? config.priority[b.name] : 0) - (!isNullOrUndefined(config.priority[a.name]) ? config.priority[a.name] : 0))
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
