import "./env";
import { isNullOrUndefined, prune, stringify } from "./env";
import { i18nList } from "./i18n";
import { VersionState, MessageType, ToastType } from "./enum";
import { config } from "./config";
import { db } from "./db";
import { unlimitedFetch } from "./extension";
import { originalAddEventListener } from "./hijack";
import { refreshToken, getAuth, newToast, toastNode } from "./function";
import { getSelectButton, pushDownloadTask, selectList } from "./main";
import { Iwara } from "./types/iwara";

export interface PieceInfo {
    Title?: string | null;
    Alias?: string | null;
    Author?: string | null;
}

export interface LocalPath {
    fullPath: string;
    fullName: string;
    directory: string;
    type: 'Windows' | 'Unix' | 'Relative';
    extension: string;
    baseName: string;
}
export class Path implements LocalPath {
    public readonly fullPath: string;   // 归一化后的完整路径
    public readonly directory: string;  // 目录部分
    public readonly fullName: string;   // 文件名（包含拓展名）
    public readonly type: 'Windows' | 'Unix' | 'Relative';
    public readonly extension: string;  // 拓展名（不含点）
    public readonly baseName: string;   // 文件名（不含拓展名）

    constructor(inputPath: string) {
        // 空路径处理
        if (inputPath === "") {
            throw new Error("路径不能为空");
        }

        // 不接受UNC路径（以"\\\\"开头）
        if (this.isUNC(inputPath)) {
            throw new Error("不接受UNC路径");
        }

        // 判断路径类型（Windows绝对、Unix绝对或相对路径）
        const detectedType = this.detectPathType(inputPath);

        // 根据不同平台校验路径基本合法性
        this.validatePath(inputPath, detectedType);

        // 归一化路径：统一分隔符、合并重复分隔符、处理末尾斜杠，并解析导航路径
        const normalized = this.normalizePath(inputPath, detectedType);

        // 从归一化后的路径中提取目录、文件名、基础名与拓展名
        const directory = this.extractDirectory(normalized, detectedType);
        const fileName = this.extractFileName(normalized, detectedType);
        const { baseName, extension } = this.extractBaseAndExtension(fileName);

        this.type = detectedType;
        this.fullPath = normalized;
        this.directory = directory;
        this.fullName = fileName;
        this.baseName = baseName;
        this.extension = extension;
    }

    // 判断是否为UNC路径（以"\\\\"开头）
    private isUNC(path: string): boolean {
        return path.startsWith('\\\\');
    }

    // 判断路径类型：Windows绝对路径、Unix绝对路径或相对路径
    private detectPathType(path: string): 'Windows' | 'Unix' | 'Relative' {
        // Windows绝对路径：如 "C:\xxx" 或 "C:/xxx"
        if (/^[A-Za-z]:[\\/]/.test(path)) {
            return 'Windows';
        }
        // Unix绝对路径：以 "/" 开头
        if (path.startsWith('/')) {
            return 'Unix';
        }
        // 否则视为相对路径
        return 'Relative';
    }

    // 校验路径合法性：Windows路径检查非法字符，Unix/相对路径检查空字符及非法字符（相对路径）
    private validatePath(path: string, type: 'Windows' | 'Unix' | 'Relative'): void {
        const invalidChars = /[<>:"|?*]/;
        if (type === 'Windows') {
            if (!/^[A-Za-z]:[\\/]/.test(path)) {
                throw new Error("无效的Windows路径格式");
            }
            const segments = path.split(/[\\/]/);
            // 驱动器部分不检测，从第二段开始
            for (let i = 1; i < segments.length; i++) {
                let segment = segments[i];
                let variables = [...segment.matchAll(/%#(.*?)#%/g)].map(match => {
                    let variable = match[1].split(':')
                    if (variable.length > 1) {
                        if (invalidChars.test(variable[1])) {
                            throw new Error(`路径变量格式化参数 "${variable[1]}" 含有非法字符`);
                        }
                    }
                    return match[1]
                });
                for (let index = 0; index < variables.length; index++) {
                    const variable = variables[index];
                    segment = segment.replaceAll(variable,'')
                }
                if (invalidChars.test(segment)) {
                    throw new Error(`路径段 "${segments[i]}" 含有非法字符`);
                }
            }
        } else if (type === 'Unix') {
            if (path.indexOf('\0') !== -1) {
                throw new Error("路径中包含非法空字符");
            }
            // Unix路径不进行非法字符检测
        } else if (type === 'Relative') {
            if (path.indexOf('\0') !== -1) {
                throw new Error("路径中包含非法空字符");
            }
            if (invalidChars.test(path)) {
                throw new Error("路径含有非法字符");
            }
        }
    }

    // 归一化路径：统一分隔符、合并重复分隔符、处理末尾斜杠，
    // 并解析路径中的 "." 和 ".." 导航，绝对路径越界直接抛错
    private normalizePath(path: string, type: 'Windows' | 'Unix' | 'Relative'): string {
        const sep = type === 'Windows' ? '\\' : '/';

        if (type === 'Windows') {
            // 统一为反斜杠
            path = path.replace(/\//g, '\\');
            path = path.replace(/\\+/g, '\\');
        } else {
            // 对于Unix及相对路径，将反斜杠替换为正斜杠，然后合并重复的斜杠
            path = path.replace(/\\/g, '/');
            path = path.replace(/\/+/g, '/');
        }

        // 拆分路径为段
        let segments: string[];
        if (type === 'Windows') {
            segments = path.split('\\');
        } else {
            segments = path.split('/');
        }

        let isAbsolute = false;
        let prefix = '';
        if (type === 'Windows') {
            // Windows绝对路径的第一段应为驱动器标识，如 "C:"
            if (/^[A-Za-z]:$/.test(segments[0])) {
                isAbsolute = true;
                prefix = segments[0];
                segments = segments.slice(1);
            }
        } else if (type === 'Unix') {
            if (path.startsWith('/')) {
                isAbsolute = true;
                // 去除第一空段（由于首字符为 "/"）
                if (segments[0] === '') {
                    segments = segments.slice(1);
                }
            }
        } else {
            isAbsolute = false;
        }

        // 处理相对导航：解析 "." 与 ".."
        const resolvedSegments = this.resolveSegments(segments, isAbsolute);

        let normalized = '';
        if (type === 'Windows') {
            normalized = prefix ? (prefix + sep + resolvedSegments.join(sep)) : resolvedSegments.join(sep);
            // 保证驱动器路径不为空（如 "C:\"）
            if (prefix && normalized === prefix) {
                normalized += sep;
            }
        } else if (type === 'Unix') {
            normalized = (isAbsolute ? sep : '') + resolvedSegments.join(sep);
            if (isAbsolute && normalized === '') {
                normalized = sep;
            }
        } else {
            normalized = resolvedSegments.join(sep);
        }
        return normalized;
    }

    // 解析路径段，处理 "." 与 ".." 导航
    // 对于绝对路径，如果 ".." 导致越界则抛错
    private resolveSegments(segments: string[], isAbsolute: boolean): string[] {
        const stack: string[] = [];
        for (const segment of segments) {
            if (segment === '' || segment === '.') continue;
            if (segment === '..') {
                if (stack.length > 0 && stack[stack.length - 1] !== '..') {
                    stack.pop();
                } else {
                    if (isAbsolute) {
                        throw new Error("绝对路径不能越界");
                    } else {
                        // 对于相对路径，保留多余的 ".."
                        stack.push('..');
                    }
                }
            } else {
                stack.push(segment);
            }
        }
        return stack;
    }

    // 提取目录部分：返回最后一个分隔符之前的内容
    private extractDirectory(path: string, type: 'Windows' | 'Unix' | 'Relative'): string {
        const sep = type === 'Windows' ? '\\' : '/';

        // 特殊处理根目录
        if (type === 'Windows' && /^[A-Za-z]:\\$/.test(path)) {
            return path;
        }
        if (type === 'Unix' && path === '/') {
            return path;
        }

        const lastIndex = path.lastIndexOf(sep);
        return lastIndex === -1 ? '' : path.substring(0, lastIndex);
    }

    // 提取文件名：返回最后一个分隔符之后的内容
    private extractFileName(path: string, type: 'Windows' | 'Unix' | 'Relative'): string {
        const sep = type === 'Windows' ? '\\' : '/';
        const lastIndex = path.lastIndexOf(sep);
        return lastIndex === -1 ? path : path.substring(lastIndex + 1);
    }

    // 从文件名中分离基础名称和拓展名
    private extractBaseAndExtension(fileName: string): { baseName: string; extension: string } {
        const lastDot = fileName.lastIndexOf('.');
        if (lastDot <= 0) {
            return { baseName: fileName, extension: '' };
        }
        const baseName = fileName.substring(0, lastDot);
        const extension = fileName.substring(lastDot + 1);
        return { baseName, extension };
    }
}

interface IVersion {
    major: number;
    minor: number;
    patch: number;
    preRelease: string[];
    buildMetadata: string;
    compare(other: IVersion): VersionState;
}
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
export interface IChannelMessage<T> {
    type: MessageType;
    data: T;
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
            GM_getValue('isDebug') && console.debug(`Channel message: ${stringify(message)}`)
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
            GM_getValue('isDebug') && console.debug(`Channel message error: ${stringify(event)}`)
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
                    }) as {[key: string]: string;}
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
                                toast.hide()
                            },
                        }
                    )
                    toast.show()
                    let button = getSelectButton(this.ID)
                    button && button.checked && button.click()
                    selectList.delete(this.ID)
                    this.State = false
                    return this
                }
                throw new Error(`${i18nList[config.language].parsingFailed.toString()} ${VideoInfoSource.message}`)
            }
            this.ID = VideoInfoSource.id
            this.Title = VideoInfoSource.title ?? this.Title
            this.External = !isNullOrUndefined(VideoInfoSource.embedUrl) && !VideoInfoSource.embedUrl.isEmpty()
            
            this.Liked = VideoInfoSource.liked
            this.Private = VideoInfoSource.private
            this.Unlisted = VideoInfoSource.unlisted
            this.UploadTime = new Date(VideoInfoSource.createdAt)
            this.Tags = VideoInfoSource.tags
            this.Description = VideoInfoSource.body
            this.ExternalUrl = VideoInfoSource.embedUrl

            if (!isNullOrUndefined(VideoInfoSource.user.following)) {
                this.Following = VideoInfoSource.user.following
            }
            if (!isNullOrUndefined(VideoInfoSource.user.friend)) {
                this.Friend = VideoInfoSource.user.friend
            }

            this.AuthorID = VideoInfoSource.user.id
            this.Alias = VideoInfoSource.user.name
            this.Author = VideoInfoSource.user.username
            await db.videos.put(this)
            if (!isNullOrUndefined(InfoSource)) {
                return this
            }
            if (this.External) {
                throw new Error(i18nList[config.language].externalVideo.toString())
            }

            const getCommentData = async (commentID: string | null = null, page: number = 0): Promise<Iwara.IPage> => {
                return await (await unlimitedFetch(`https://api.iwara.tv/video/${this.ID}/comments?page=${page}${!isNullOrUndefined(commentID) && !commentID.isEmpty() ? '&parent=' + commentID : ''}`, { headers: await getAuth() })).json() as Iwara.IPage
            }
            const getCommentDatas = async (commentID: string | null = null): Promise<Iwara.Comment[]> => {
                let comments: Iwara.Comment[] = []
                let base = await getCommentData(commentID)
                comments.push(...base.results as Iwara.Comment[])
                for (let page = 1; page < Math.ceil(base.count/base.limit); page++) {
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
                return comments
            }

            this.Comments += `${(await getCommentDatas()).map(i => i.body).join('\n')}`.normalize('NFKC')
            this.FileName = VideoInfoSource.file.name
            this.Size = VideoInfoSource.file.size
            let VideoFileSource = (await (await unlimitedFetch(VideoInfoSource.fileUrl, { headers: await getAuth(VideoInfoSource.fileUrl) })).json() as Iwara.Source[]).sort((a, b) => (!isNullOrUndefined(config.priority[b.name]) ? config.priority[b.name] : 0) - (!isNullOrUndefined(config.priority[a.name]) ? config.priority[a.name] : 0))
            if (isNullOrUndefined(VideoFileSource) || !(VideoFileSource instanceof Array) || VideoFileSource.length < 1) {
                throw new Error(i18nList[config.language].getVideoSourceFailed.toString())
            }
            this.DownloadQuality = config.checkPriority ? config.downloadPriority : VideoFileSource[0].name
            let fileList = VideoFileSource.filter(x => x.name === this.DownloadQuality)
            if (!fileList.any()) throw new Error(i18nList[config.language].noAvailableVideoSource.toString())
            let Source = fileList[Math.floor(Math.random() * fileList.length)].src.download
            if (isNullOrUndefined(Source) || Source.isEmpty()) throw new Error(i18nList[config.language].videoSourceNotAvailable.toString())
            this.DownloadUrl = decodeURIComponent(`https:${Source}`)
            this.State = true

            await db.videos.put(this)
            return this
        } catch (error:any) {
            let data = this
            let toast = newToast(
                ToastType.Error,
                {
                    node: toastNode([
                        `${this.Title}[${this.ID}] %#parsingFailed#%`,
                        { nodeType: 'br' },
                        stringify(error),
                        { nodeType: 'br' },
                        this.External ? `%#openVideoLink#%` : `%#tryReparseDownload#%`
                    ], '%#createTask#%'),
                    async onClick() {
                        toast.hide()
                        if (data.External) {
                            GM_openInTab(data.ExternalUrl!, { active: false, insert: true, setParent: true })
                        } else {
                            pushDownloadTask(await new VideoInfo(data as PieceInfo).init(data.ID))
                        }
                    },
                }
            )
            toast.show()
            let button = getSelectButton(this.ID)
            button && button.checked && button.click()
            selectList.delete(this.ID)
            this.State = false
            return this
        }
    }
}