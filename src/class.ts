import Dexie from "dexie";
import { fetch, ceilDiv, getString, isElement, isNull, language, originalAddEventListener, originalNodeAppendChild, prune, renderNode, isNullOrUndefined, isString } from "./extension";
import { localPathCheck, aria2Check, iwaraDownloaderCheck, EnvCheck, refreshToken, getAuth, newToast, toastNode, getSelectButton, pushDownloadTask, addDownloadTask, injectCheckbox, analyzeDownloadTask, aria2TaskCheck } from "./function";
import { i18n, config, db, rating, editConfig, selectList, firstRun, compatible } from "./main";

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
        if (isNull(GM_getValue(id, { timestamp: 0, value: [] }).timestamp))
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

export class I18N {
    [key: string]: { [key: string]: RenderCode | RenderCode[] }
    public zh_CN = this['zh']
    public zh: { [key: string]: RenderCode | RenderCode[] } = {
        appName: 'Iwara 批量下载工具',
        language: '语言: ',
        downloadPriority: '下载画质: ',
        downloadPath: '下载到: ',
        downloadProxy: '下载代理: ',
        aria2Path: 'Aria2 RPC: ',
        aria2Token: 'Aria2 密钥: ',
        iwaraDownloaderPath: 'IwaraDownloader RPC: ',
        iwaraDownloaderToken: 'IwaraDownloader 密钥: ',
        rename: '重命名',
        save: '保存',
        reset: '重置',
        ok: '确定',
        on: '开启',
        off: '关闭',
        isDebug: '调试模式',
        downloadType: '下载方式',
        browserDownload: '浏览器下载',
        iwaraDownloaderDownload: 'IwaraDownloader下载',
        autoFollow: '自动关注选中的视频作者',
        autoLike: '自动点赞选中的视频',
        addUnlistedAndPrivate: '不公开和私有视频强制显示(需关注作者)',
        checkDownloadLink: '第三方网盘下载地址检查',
        checkPriority: '下载画质检查',
        autoInjectCheckbox: '自动注入选择框',
        autoCopySaveFileName: '自动复制根据规则生成的文件名',
        configurationIncompatible: '初始化或配置文件不兼容，请重新配置！',
        browserDownloadNotEnabled: `未启用下载功能！`,
        browserDownloadNotWhitelisted: `请求的文件扩展名未列入白名单！`,
        browserDownloadNotPermitted: `下载功能已启用，但未授予下载权限！`,
        browserDownloadNotSupported: `目前浏览器/版本不支持下载功能！`,
        browserDownloadNotSucceeded: `下载未开始或失败！`,
        browserDownloadUnknownError: `未知错误，有可能是下载时提供的参数存在问题，请检查文件名是否合法！`,
        browserDownloadTimeout: `下载超时，请检查网络环境是否正常！`,
        variable: '查看可用变量',
        downloadTime: '下载时间 ',
        uploadTime: '发布时间 ',
        example: '示例: ',
        result: '结果: ',
        loadingCompleted: '加载完成',
        settings: '打开设置',
        downloadThis: '下载当前视频',
        manualDownload: '手动下载指定',
        aria2TaskCheck: 'Aria2任务重启',
        reverseSelect: '本页反向选中',
        deselectThis: '取消本页选中',
        deselectAll: '取消所有选中',
        selectThis: '本页全部选中',
        downloadSelected: '下载所选',
        downloadingSelected: '正在下载所选, 请稍后...',
        injectCheckbox: '开关选择框',
        configError: '脚本配置中存在错误，请修改。',
        alreadyKnowHowToUse: '我已知晓如何使用!!!',
        notice: [
            { nodeType: 'br' },
            '添加不公开和私有视频强制显示功能，仅支持显示已关注作者的不公开和私有视频，目前仅在视频列表页面且排列方式为最新时生效！'
        ],
        useHelpForBase: `请认真阅读使用指南！`,
        useHelpForInjectCheckbox: `开启“%#autoInjectCheckbox#%”以获得更好的体验！或等待加载出视频卡片后, 点击侧边栏中[%#injectCheckbox#%]开启下载选择框`,
        useHelpForCheckDownloadLink: '开启“%#checkDownloadLink#%”功能会在下载视频前会检查视频简介以及评论，如果在其中发现疑似第三方网盘下载链接，将会弹出提示，您可以点击提示打开视频页面。',
        useHelpForManualDownload: [
            '使用手动下载功能需要提供视频ID, 如需批量手动下载请提供使用“|”分割的视频ID。',
            { nodeType: 'br' },
            '例如: AeGUIRO2D5vQ6F|qQsUMJa19LcK3L',
            { nodeType: 'br' },
            '或提供符合以下格式对象的数组json字符串',
            { nodeType: 'br' },
            '{ key: string, value: { Title?: string, Alias?: string, Author?: string } }',
            { nodeType: 'br' },
            '例如: ',
            { nodeType: 'br' },
            '[{ key: "AeGUIRO2D5vQ6F", value: { Title: "237知更鸟", Alias: "骑着牛儿追织女", Author: "user1528210" } },{ key: "qQsUMJa19LcK3L", value: { Title: "Mika Automotive Extradimensional", Alias: "Temptation’s_Symphony", Author: "temptations_symphony" } }]'
        ],
        useHelpForBugreport: [
            '反馈遇到的BUG、使用问题等请前往: ',
            {
                nodeType: 'a',
                childs: 'Github',
                attributes: {
                    href: 'https://github.com/dawn-lc/IwaraDownloadTool/'
                }
            }
        ],
        tryRestartingDownload: '→ 点击此处重新下载 ←',
        tryReparseDownload: '→ 点击此处重新解析 ←',
        cdnCacheFinded: '→ 进入 MMD Fans 缓存页面 ←',
        openVideoLink: '→ 进入视频页面 ←',
        copySucceed: '复制成功！',
        pushTaskSucceed: '推送下载任务成功！',
        connectionTest: '连接测试',
        settingsCheck: '配置检查',
        createTask: '创建任务',
        downloadPathError: '下载路径错误!',
        browserDownloadModeError: '请启用脚本管理器的浏览器API下载模式!',
        downloadQualityError: '未找到指定的画质下载地址!',
        findedDownloadLink: '发现疑似第三方网盘下载地址!',
        allCompleted: '全部解析完成！',
        parsing: '预解析中...',
        parsingProgress: '解析进度: ',
        manualDownloadTips: '单独下载请直接在此处输入视频ID, 批量下载请提供使用“|”分割的视频ID, 例如: AeGUIRO2D5vQ6F|qQsUMJa19LcK3L\r\n或提供符合以下格式对象的数组json字符串\r\n{ key: string, value: { Title?: string, Alias?: string, Author?: string } }\r\n例如: \r\n[{ key: "AeGUIRO2D5vQ6F", value: { Title: "237知更鸟", Alias: "骑着牛儿追织女", Author: "user1528210" } },{ key: "qQsUMJa19LcK3L", value: { Title: "Mika Automotive Extradimensional", Alias: "Temptation’s_Symphony", Author: "temptations_symphony" } }]',
        externalVideo: `非本站视频`,
        noAvailableVideoSource: '没有可供下载的视频源',
        videoSourceNotAvailable: '视频源地址不可用',
        getVideoSourceFailed: '获取视频源失败',
        downloadFailed: '下载失败！',
        downloadThisFailed: '未找到可供下载的视频！',
        pushTaskFailed: '推送下载任务失败！',
        parsingFailed: '视频信息解析失败！',
        autoFollowFailed: '自动关注视频作者失败！',
        autoLikeFailed: '自动点赞视频失败！',
    }
    public en: { [key: string]: RenderCode | RenderCode[] } = {
        appName: 'Iwara Download Tool',
        language: 'Language: ',
        downloadPriority: 'Download Quality: ',
        downloadPath: 'Download Path: ',
        downloadProxy: 'Download Proxy: ',
        aria2Path: 'Aria2 RPC: ',
        aria2Token: 'Aria2 Token: ',
        iwaraDownloaderPath: 'IwaraDownloader RPC: ',
        iwaraDownloaderToken: 'IwaraDownloader Token: ',
        rename: 'Rename',
        save: 'Save',
        reset: 'Reset',
        ok: 'OK',
        on: 'On',
        off: 'Off',
        isDebug: 'Debug Mode',
        downloadType: 'Download Type',
        browserDownload: 'Browser Download',
        iwaraDownloaderDownload: 'IwaraDownloader Download',
        autoFollow: 'Automatically follow the selected video author',
        autoLike: 'Automatically like the selected videos',
        addUnlistedAndPrivate: 'Force display unlisted and private videos (requires following the author)',
        checkDownloadLink: 'Check third-party cloud storage download links',
        checkPriority: 'Check download quality',
        autoInjectCheckbox: 'Automatically inject selection box',
        autoCopySaveFileName: 'Automatically copy the filename generated by rules',
        configurationIncompatible: 'Initialization or configuration file incompatible, please reconfigure!',
        browserDownloadNotEnabled: `Download feature not enabled!`,
        browserDownloadNotWhitelisted: `Requested file extension not whitelisted!`,
        browserDownloadNotPermitted: `Download feature enabled, but permission not granted!`,
        browserDownloadNotSupported: `Current browser/version does not support download functionality!`,
        browserDownloadNotSucceeded: `Download did not start or failed!`,
        browserDownloadUnknownError: `Unknown error, possibly due to invalid download parameters. Please check if the filename is valid!`,
        browserDownloadTimeout: `Download timed out. Please check your network connection!`,
        variable: 'View available variables',
        downloadTime: 'Download Time ',
        uploadTime: 'Upload Time ',
        example: 'Example: ',
        result: 'Result: ',
        loadingCompleted: 'Loading completed',
        settings: 'Open Settings',
        downloadThis: 'Download current video',
        manualDownload: 'Manually specify download',
        aria2TaskCheck: 'Aria2 Task Restart',
        reverseSelect: 'Reverse selection on this page',
        deselectThis: 'Deselect on this page',
        deselectAll: 'Deselect all',
        selectThis: 'Select all on this page',
        downloadSelected: 'Download selected',
        downloadingSelected: 'Downloading selected, please wait...',
        injectCheckbox: 'Toggle selection box',
        configError: 'There is an error in the script configuration. Please modify.',
        alreadyKnowHowToUse: 'I already know how to use it!!!',
        notice: [
            { nodeType: 'br' },
            'Added a feature to force display unlisted and private videos. Only supported for authors you follow. Currently effective only on the video list page with sorting set to newest.'
        ],
        useHelpForBase: `Please read the usage guide carefully!`,
        useHelpForInjectCheckbox: `Enable "%#autoInjectCheckbox#%" for a better experience! Or wait for video cards to load, then click [%#injectCheckbox#%] in the sidebar to enable the selection box.`,
        useHelpForCheckDownloadLink: 'Enabling "%#checkDownloadLink#%" will check the video description and comments before downloading. If third-party cloud storage links are found, a prompt will appear allowing you to visit the video page.',
        useHelpForManualDownload: [
            'To use manual download, provide the video ID. For batch manual download, use "|" to separate video IDs.',
            { nodeType: 'br' },
            'Example: AeGUIRO2D5vQ6F|qQsUMJa19LcK3L',
            { nodeType: 'br' },
            'Or provide an array of objects in JSON format matching the following structure:',
            { nodeType: 'br' },
            '{ key: string, value: { Title?: string, Alias?: string, Author?: string } }',
            { nodeType: 'br' },
            'Example: ',
            { nodeType: 'br' },
            '[{ key: "AeGUIRO2D5vQ6F", value: { Title: "237 Robin", Alias: "Riding Cow Chasing Weaving Maiden", Author: "user1528210" } },{ key: "qQsUMJa19LcK3L", value: { Title: "Mika Automotive Extradimensional", Alias: "Temptation’s Symphony", Author: "temptations_symphony" } }]'
        ],
        useHelpForBugreport: [
            'To report bugs or usage issues, please visit: ',
            {
                nodeType: 'a',
                childs: 'Github',
                attributes: {
                    href: 'https://github.com/dawn-lc/IwaraDownloadTool/'
                }
            }
        ],
        tryRestartingDownload: '→ Click here to restart download ←',
        tryReparseDownload: '→ Click here to reparse ←',
        cdnCacheFinded: '→ Visit MMD Fans Cache Page ←',
        openVideoLink: '→ Visit Video Page ←',
        copySucceed: 'Copy succeeded!',
        pushTaskSucceed: 'Task pushed successfully!',
        connectionTest: 'Connection Test',
        settingsCheck: 'Settings Check',
        createTask: 'Create Task',
        downloadPathError: 'Download path error!',
        browserDownloadModeError: 'Please enable the browser API download mode in the script manager!',
        downloadQualityError: 'Specified quality download URL not found!',
        findedDownloadLink: 'Possible third-party cloud storage link found!',
        allCompleted: 'All parsing completed!',
        parsing: 'Parsing...',
        parsingProgress: 'Parsing Progress: ',
        manualDownloadTips: 'For individual downloads, input the video ID here. For batch downloads, separate video IDs with "|". Example: AeGUIRO2D5vQ6F|qQsUMJa19LcK3L\r\nOr provide an array of objects in JSON format matching the following structure:\r\n{ key: string, value: { Title?: string, Alias?: string, Author?: string } }\r\nExample: \r\n[{ key: "AeGUIRO2D5vQ6F", value: { Title: "237 Robin", Alias: "Riding Cow Chasing Weaving Maiden", Author: "user1528210" } },{ key: "qQsUMJa19LcK3L", value: { Title: "Mika Automotive Extradimensional", Alias: "Temptation’s Symphony", Author: "temptations_symphony" } }]',
        externalVideo: `External Video`,
        noAvailableVideoSource: 'No available video sources',
        videoSourceNotAvailable: 'Video source URL unavailable',
        getVideoSourceFailed: 'Failed to get video source',
        downloadFailed: 'Download failed!',
        downloadThisFailed: 'No downloadable video found!',
        pushTaskFailed: 'Failed to push download task!',
        parsingFailed: 'Failed to parse video information!',
        autoFollowFailed: 'Failed to auto-follow the video author!',
        autoLikeFailed: 'Failed to auto-like the video!'
    }
}

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
        this.language = language()
        this.autoFollow = false
        this.autoLike = false
        this.autoCopySaveFileName = false
        this.autoInjectCheckbox = true
        this.checkDownloadLink = true
        this.checkPriority = true
        this.addUnlistedAndPrivate = true
        this.downloadPriority = 'Source'
        this.downloadType = DownloadType.Others
        this.downloadPath = '/Iwara/%#AUTHOR#%/%#TITLE#%[%#ID#%].mp4'
        this.downloadProxy = ''
        this.aria2Path = 'http://127.0.0.1:6800/jsonrpc'
        this.aria2Token = ''
        this.iwaraDownloaderPath = 'http://127.0.0.1:6800/jsonrpc'
        this.iwaraDownloaderToken = ''
        this.priority = {
            'Source': 100,
            '540': 99,
            '360': 98,
            'preview': 1
        }
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
                title: i18n[language()].save
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
                title: i18n[language()].reset
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
                throw new Error(`${i18n[language()].parsingFailed.toString()} ${VideoInfoSource.message}`)
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
            if (!isNull(InfoSource)) {
                return this
            }
            if (this.External) {
                throw new Error(i18n[language()].externalVideo.toString())
            }

            const getCommentData = async (commentID: string | null = null, page: number = 0): Promise<Iwara.Page> => {
                return await (await fetch(`https://api.iwara.tv/video/${this.ID}/comments?page=${page}${!isNull(commentID) && !commentID.isEmpty() ? '&parent=' + commentID : ''}`, { headers: await getAuth() })).json() as Iwara.Page
            }
            const getCommentDatas = async (commentID: string | null = null): Promise<Iwara.Comment[]> => {
                let comments: Iwara.Comment[] = []
                let base = await getCommentData(commentID)
                comments.append(base.results as Iwara.Comment[])
                for (let page = 1; page < ceilDiv(base.count, base.limit); page++) {
                    comments.append((await getCommentData(commentID, page)).results as Iwara.Comment[])
                }
                let replies: Iwara.Comment[] = []
                for (let index = 0; index < comments.length; index++) {
                    const comment = comments[index]
                    if (comment.numReplies > 0) {
                        replies.append(await getCommentDatas(comment.id))
                    }
                }
                comments.append(replies)
                return comments.prune()
            }

            this.Comments += `${(await getCommentDatas()).map(i => i.body).join('\n')}`.normalize('NFKC')
            this.FileName = VideoInfoSource.file.name
            this.Size = VideoInfoSource.file.size
            let VideoFileSource = (await (await fetch(VideoInfoSource.fileUrl, { headers: await getAuth(VideoInfoSource.fileUrl) })).json() as Iwara.Source[]).sort((a, b) => (!isNull(config.priority[b.name]) ? config.priority[b.name] : 0) - (!isNull(config.priority[a.name]) ? config.priority[a.name] : 0))
            if (isNull(VideoFileSource) || !(VideoFileSource instanceof Array) || VideoFileSource.length < 1) {
                throw new Error(i18n[language()].getVideoSourceFailed.toString())
            }
            this.DownloadQuality = config.checkPriority ? config.downloadPriority : VideoFileSource[0].name
            let fileList = VideoFileSource.filter(x => x.name === this.DownloadQuality)
            if (!fileList.any()) throw new Error(i18n[language()].noAvailableVideoSource.toString())
            let Source = fileList[Math.floor(Math.random() * fileList.length)].src.download
            if (isNull(Source) || Source.isEmpty()) throw new Error(i18n[language()].videoSourceNotAvailable.toString())
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
                if (isNull(video.UploadTime)) {
                    video.UploadTime = new Date(0);
                } else if (typeof video.UploadTime === 'string') {
                    video.UploadTime = new Date(video.UploadTime);
                }
                if (isNull(video.RAW)) {
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
            .and(video => !isNull(video.RAW))
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