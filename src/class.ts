import "./env";
import { isNullOrUndefined, prune, stringify, UUID } from "./env";
import { i18nList } from "./i18n";
import { VersionState, ToastType } from "./enum";
import { config } from "./config";
import { db } from "./db";
import { unlimitedFetch } from "./extension";
import { refreshToken, getAuth, newToast, toastNode } from "./function";
import { getSelectButton, pushDownloadTask, selectList } from "./main";
import { Iwara } from "./types/iwara";

/**
 * 视频片段基本信息接口
 * 用于存储视频的标题、别名和作者信息
 */
export interface PieceInfo {
    Title?: string | null;
    Alias?: string | null;
    Author?: string | null;
}

/**
 * 本地路径信息接口
 * 描述文件路径的各个组成部分
 */
export interface LocalPath {
    fullPath: string;
    fullName: string;
    directory: string;
    type: 'Windows' | 'Unix' | 'Relative';
    extension: string;
    baseName: string;
}
/**
 * 路径处理类
 * 实现LocalPath接口，提供路径解析和规范化功能
 * 支持Windows、Unix和相对路径
 */
export class Path implements LocalPath {
    public readonly fullPath: string;   // 归一化后的完整路径
    public readonly directory: string;  // 目录部分
    public readonly fullName: string;   // 文件名（包含拓展名）
    public readonly type: 'Windows' | 'Unix' | 'Relative';
    public readonly extension: string;  // 拓展名（不含点）
    public readonly baseName: string;   // 文件名（不含拓展名）

    /**
     * 构造函数
     * @param inputPath 输入路径字符串
     * @throws 如果路径为空或无效
     */
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
    /**
     * 判断是否为UNC路径
     * @param path 路径字符串
     * @returns 如果是UNC路径返回true
     */
    private isUNC(path: string): boolean {
        return path.startsWith('\\\\');
    }

    // 判断路径类型：Windows绝对路径、Unix绝对路径或相对路径
    /**
     * 检测路径类型
     * @param path 路径字符串
     * @returns 路径类型: Windows、Unix或Relative
     */
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
    /**
     * 验证路径合法性
     * @param path 路径字符串 
     * @param type 路径类型
     * @throws 如果路径包含非法字符或格式不正确
     */
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
                    segment = segment.replaceAll(variable, '')
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

    // 
    // 
    /**
     * 规范化路径
     * @param path 原始路径
     * @param type 路径类型
     * @returns 规范化后的路径
     * 
     * 统一分隔符、合并重复分隔符、处理末尾斜杠，并解析路径中的 "." 和 ".." 导航，绝对路径越界直接抛错。
     */
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

    // 
    // 
    /**
     * 解析路径段，处理"."和".."导航
     * @param segments 路径段数组
     * @param isAbsolute 是否为绝对路径
     * @returns 处理后的路径段数组
     * @throws 如果是绝对路径且导航越界
     * 
     * 解析路径段，处理 "." 与 ".." 导航，对于绝对路径，如果 ".." 导致越界则抛错
     */
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

    /**
     * 提取目录部分
     * @param path 完整路径
     * @param type 路径类型
     * @returns 目录部分字符串
     * 
     * 返回最后一个分隔符之前的内容
     */
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

    /**
     * 提取文件名部分
     * @param path 完整路径
     * @param type 路径类型
     * @returns 文件名部分字符串
     * 
     * 返回最后一个分隔符之后的内容
     */
    private extractFileName(path: string, type: 'Windows' | 'Unix' | 'Relative'): string {
        const sep = type === 'Windows' ? '\\' : '/';
        const lastIndex = path.lastIndexOf(sep);
        return lastIndex === -1 ? path : path.substring(lastIndex + 1);
    }

    /**
     * 分离文件名和扩展名
     * @param fileName 完整文件名
     * @returns 包含baseName和extension的对象
     * 
     * 从文件名中分离基础名称和拓展名
     */
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

/**
 * 版本号接口
 * 遵循语义化版本规范(SemVer)
 */
interface IVersion {
    major: number;
    minor: number;
    patch: number;
    preRelease: string[];
    buildMetadata: string;
    compare(other: IVersion): VersionState;
}
/**
 * 版本号实现类
 * 支持语义化版本比较和解析
 */
export class Version implements IVersion {
    major: number;
    minor: number;
    patch: number;
    preRelease: string[];
    buildMetadata: string;
    /**
     * 构造函数
     * @param versionString 版本号字符串
     * @throws 如果版本号格式无效
     */
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
    /**
     * 比较版本号
     * @param other 要比较的版本号
     * @returns 比较结果状态
     */
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
    /**
     * 转换为字符串
     * @returns 语义化版本字符串
     */
    public toString(): string {
        const version = `${this.major}.${this.minor}.${this.patch}`;
        const preRelease = this.preRelease.length ? `-${this.preRelease.join('.')}` : '';
        const buildMetadata = this.buildMetadata ? `+${this.buildMetadata}` : '';
        return `${version}${preRelease}${buildMetadata}`;
    }
}

/**
 * 字典类
 * 扩展原生Map，提供更方便的转换方法
 * @template T 值类型
 */
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
    /** 当通过 set 或接收消息设置时触发 */
    public onSet?: (key: string, value: T) => void;
    /** 当删除时触发 */
    public onDel?: (key: string) => void;
    /** 完成初次或增量同步后触发 */
    public onSync?: () => void;

    public timestamp = 0;
    private id = UUID();
    private bc: BroadcastChannel;

    /**
     * @param channelName 通信通道，同一名称标签页间同步
     * @param initial 初始纯值列表，会附加当前时戳
     */
    constructor(channelName: string, initial: Array<[string, T]> = []) {
        super(initial);
        this.bc = new BroadcastChannel(channelName);
        this.bc.onmessage = ({ data: msg }: { data: Message<T> }) => this.handleMessage(msg);
        this.bc.postMessage({ type: 'sync', id: this.id, timestamp: this.timestamp });
    }
    /**
     * 重写：设置值并广播，同时记录时间戳
     */
    public override set(key: string, value: T): this {
        this.timestamp = Date.now();
        super.set(key, value);
        this.bc.postMessage({ type: 'set', key, value, timestamp: this.timestamp, id: this.id });
        this.onSet?.(key, value);
        return this;
    }
    /**
     * 重写：删除并广播，同时记录时间戳
     */
    public override delete(key: string): boolean {
        this.timestamp = Date.now();
        const existed = super.delete(key);
        this.bc.postMessage({ type: 'delete', key, timestamp: this.timestamp, id: this.id });
        if (existed) this.onDel?.(key);
        return existed;
    }
    /**
     * 处理同步消息
     */
    private handleMessage(msg: Message<T>) {
        if (msg.id === this.id) return;
        if (msg.type === 'sync'){
            this.bc.postMessage({ timestamp: this.timestamp, id: this.id, type: 'state', state: super.toArray() });
            return;
        }
        if (msg.timestamp < this.timestamp) return;
        this.timestamp = Date.now();
        switch (msg.type) {
            case 'state': {
                for (let index = 0; index < msg.state.length; index++) {
                    const [key, value] = msg.state[index];
                    super.set(key, value);
                }
                this.onSync?.();
                break;
            }
            case 'set': {
                const { key, value } = msg;
                super.set(key, value);
                this.onSet?.(key, value);
                break;
            }
            case 'delete': {
                const { key } = msg;
                if (super.delete(key)) this.onDel?.(key);
                break;
            }
        }
    }
}
/**
 * 视频信息类
 * 封装Iwara视频的元数据和操作
 */
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
    /**
     * 构造函数
     * @param info 可选的视频基本信息
     */
    constructor(info?: PieceInfo) {
        if (!isNullOrUndefined(info)) {
            if (!isNullOrUndefined(info.Title) && !info.Title.isEmpty()) this.Title = info.Title
            if (!isNullOrUndefined(info.Alias) && !info.Alias.isEmpty()) this.Alias = info.Alias
            if (!isNullOrUndefined(info.Author) && !info.Author.isEmpty()) this.Author = info.Author
        }
        return this
    }
    /**
     * 初始化视频信息
     * @param ID 视频ID
     * @param InfoSource 可选的视频源数据
     * @returns 当前VideoInfo实例
     * @throws 如果初始化失败
     */
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
                    }) as { [key: string]: string; }
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
                for (let page = 1; page < Math.ceil(base.count / base.limit); page++) {
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
        } catch (error: any) {
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



export class PageLifeManager {
    private readonly pageId: string;
    private readonly activePages = new Map<string, PageStatus>();
    private readonly channel: BroadcastChannel;

    private heartbeatIntervalId?: number;
    private checkIntervalId?: number;
    private readonly beforeUnloadHandler: () => void;

    constructor(options: PageLifeManagerOptions = {}) {
        this.pageId = UUID();
        this.channel = new BroadcastChannel('page-status-channel');

        // 配置参数处理
        this.heartbeatInterval = options.heartbeatInterval ?? 2000;
        this.timeout = options.timeout ?? 5000;

        // 绑定事件处理器以便后续移除
        this.beforeUnloadHandler = () => this.cleanup();
        this.init();
    }

    private heartbeatInterval: number;
    private timeout: number;

    public onPageJoin?: PageEventCallback;
    public onPageLeave?: PageEventCallback;

    private init() {
        this.setupMessageListener();
        this.startHeartbeat();
        this.startTimeoutChecker();
        this.setupUnloadHandler();

        console.log(`[PageLifeManager] 页面 ${this.pageId} 启动`);
    }

    private setupMessageListener() {
        const handler = (event: MessageEvent<BroadcastMessage>) => this.handleMessage(event.data);
        this.channel.addEventListener('message', handler);
    }

    private startHeartbeat() {
        this.sendHeartbeat(); // 立即发送初始心跳
        this.heartbeatIntervalId = window.setInterval(
            () => this.sendHeartbeat(),
            this.heartbeatInterval
        );
    }

    private startTimeoutChecker() {
        this.checkIntervalId = window.setInterval(
            () => this.checkTimeouts(),
            Math.min(this.heartbeatInterval, this.timeout / 2)
        );
    }

    private setupUnloadHandler() {
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }

    private sendHeartbeat() {
        const message: BroadcastMessage = {
            type: 'heartbeat',
            pageId: this.pageId,
            timestamp: Date.now(),
        };
        this.channel.postMessage(message);
        this.updatePageStatus(message); // 更新自身状态
    }

    private sendGoodbye() {
        try {
            const message: BroadcastMessage = { type: 'goodbye', pageId: this.pageId };
            this.channel.postMessage(message);
        } catch (e) {
            console.error('[PageLifeManager] 发送关闭消息失败:', e);
        }
    }

    private handleMessage(message: BroadcastMessage) {
        switch (message.type) {
            case 'heartbeat':
                this.handleHeartbeat(message);
                break;
            case 'goodbye':
                this.handleGoodbye(message);
                break;
        }
    }

    private handleHeartbeat(message: Extract<BroadcastMessage, { type: 'heartbeat' }>) {
        const isNewPage = !this.activePages.has(message.pageId);

        this.activePages.set(message.pageId, {
            pageId: message.pageId,
            lastHeartbeat: message.timestamp,
        });

        if (isNewPage && message.pageId !== this.pageId) {
            console.log(`[PageLifeManager] 发现新页面: ${message.pageId}`);
            this.onPageJoin?.(message.pageId);
        }
    }

    private handleGoodbye(message: Extract<BroadcastMessage, { type: 'goodbye' }>) {
        if (this.activePages.delete(message.pageId)) {
            console.log(`[PageLifeManager] 页面离开: ${message.pageId}`);
            this.onPageLeave?.(message.pageId);
        }
    }

    private checkTimeouts() {
        const currentTime = Date.now();
        const timeoutThreshold = currentTime - this.timeout;

        Array.from(this.activePages.entries()).forEach(([pageId, status]) => {
            if (status.lastHeartbeat < timeoutThreshold) {
                this.activePages.delete(pageId);
                console.log(`[PageLifeManager] 页面超时移除: ${pageId}`);
                this.onPageLeave?.(pageId);
            }
        });
    }

    private updatePageStatus(message: { pageId: string; timestamp: number }) {
        this.activePages.set(message.pageId, {
            pageId: message.pageId,
            lastHeartbeat: message.timestamp,
        });
    }

    public getActivePageIds(): Set<string> {
        return new Set(this.activePages.keys());
    }

    public getPageId(): string {
        return this.pageId;
    }

    public destroy() {
        this.cleanup();
        this.channel.close();
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }

    private cleanup() {
        this.sendGoodbye();
        this.clearIntervals();
    }

    private clearIntervals() {
        if (this.heartbeatIntervalId) clearInterval(this.heartbeatIntervalId);
        if (this.checkIntervalId) clearInterval(this.checkIntervalId);
    }
}
