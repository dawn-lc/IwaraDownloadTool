(function () {

    const originalWindow = unsafeWindow

    //@ts-ignore
    unsafeWindow.originalWindow = originalWindow
    //@ts-ignore
    unsafeWindow._paq = unsafeWindow.Matomo = unsafeWindow.Piwik = new Proxy({}, {
        get: (target: {}, p: string | symbol, receiver: any) => {
            //@ts-ignore
            observer && observer.disconnect()
            return undefined
        },
        set: undefined,
        deleteProperty: undefined,
        ownKeys: undefined,
        has: undefined,
        defineProperty: undefined,
        getOwnPropertyDescriptor: undefined
    });
    
    //@ts-ignore
    const originalObject = originalWindow.Object
    const originalFetch = originalWindow.fetch
    const document = originalWindow.document

    //@ts-ignore
    const originalAddEventListener = unsafeWindow.EventTarget.prototype.addEventListener
    //@ts-ignore
    unsafeWindow.EventTarget.prototype.addEventListener = function (type, listener, options) {
        originalAddEventListener.call(this, type, listener, options)
    }
    /*
    //@ts-ignore
    const originalforEach = unsafeWindow.Array.prototype.forEach
    //@ts-ignore
    unsafeWindow.Array.prototype.forEach = function (...args) {
        let err = new Error()
        if (err.stack.match(/main\..*\.js/img)) {
            GM_xmlhttpRequest({
                url: ([...document.head.children].filter((i: Element) => i instanceof HTMLScriptElement && i.src.includes('main')).pop() as HTMLScriptElement).src,
                method: 'GET',
                headers: {
                   'Content-type': 'application/x-www-form-urlencoded'
                },
                onload: function (xhr) {
                    //@ts-ignore
                    GM_addElement('script', {
                        textContent: xhr.responseText.replace('An({', 'false && An({')
                    })
                    //@ts-ignore
                    unsafeWindow.Array.prototype.forEach = originalforEach
                }
            })
            throw err
        }
        //@ts-ignore
        return originalforEach.call(this, ...args)
    }
    */

    Node.prototype.originalAppendChild = Node.prototype.appendChild

    const isNull = (obj: any): obj is null => typeof obj === 'undefined' || obj === null
    const isObject = (obj: any): obj is Object => !isNull(obj) && typeof obj === 'object' && !Array.isArray(obj)
    const isStringTupleArray = (obj: any): obj is [string, string][] => Array.isArray(obj) && obj.every(item => Array.isArray(item) && item.length === 2 && typeof item[0] === 'string' && typeof item[1] === 'string')

    const hasFunction = (obj: any, method: string): boolean => {
        return method.notEmpty() && !isNull(obj) ? method in obj && typeof obj[method] === 'function' : false
    }
    const getString = (obj: any): string => {
        obj = obj instanceof Error ? String(obj) : obj
        return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj)
    }

    Array.prototype.any = function () {
        return this.prune().length > 0
    }
    Array.prototype.prune = function () {
        return this.filter(i => i !== null && typeof i !== 'undefined')
    }
    Array.prototype.unique = function () {
        return Array.from(new Set(this))
    }

    String.prototype.isEmpty = function () {
        return !isNull(this) && this.length === 0
    }
    String.prototype.notEmpty = function () {
        return !isNull(this) && this.length !== 0
    }
    String.prototype.among = function (start: string, end: string) {
        if (this.isEmpty() || start.isEmpty() || end.isEmpty()) {
            throw new Error('Empty')
        }
        let body = this.split(start).pop().notEmpty() ? this.split(start).pop() : ''
        return body.split(end).shift().notEmpty() ? body.split(end).shift() : ''
    }
    String.prototype.splitLimit = function (separator: string, limit?: number) {
        if (this.isEmpty() || isNull(separator)) {
            throw new Error('Empty')
        }
        let body = this.split(separator)
        return limit ? body.slice(0, limit).concat(body.slice(limit).join(separator)) : body
    }
    String.prototype.truncate = function (maxLength) {
        return this.length > maxLength ? this.substring(0, maxLength) : this.toString()
    }
    String.prototype.trimHead = function (prefix: string) {
        return this.startsWith(prefix) ? this.slice(prefix.length) : this.toString()
    }
    String.prototype.trimTail = function (suffix: string) {
        return this.endsWith(suffix) ? this.slice(0, -suffix.length) : this.toString()
    }

    String.prototype.toURL = function () {
        return new URL(this.toString())
    }

    Array.prototype.append = function (arr) {
        this.push(...arr)
    }

    Date.prototype.format = function (format?: string) {
        return moment(this).locale(language()).format(format)
    }

    String.prototype.replaceVariable = function (replacements, count = 0) {
        let replaceString = this.toString()
        try {
            replaceString = originalObject.entries(replacements).reduce(
                (str: { includes: (arg0: string) => any; among: (arg0: string, arg1: string) => { (): any; new(): any; toString: { (): any; new(): any; }; }; replaceAll: (arg0: string, arg1: string) => any; }, [key, value]: any) => {
                    if (str.includes(`%#${key}:`)) {
                        let format = str.among(`%#${key}:`, '#%').toString()
                        return str.replaceAll(`%#${key}:${format}#%`, getString(hasFunction(value, 'format') ? value.format(format) : value))
                    } else {
                        return str.replaceAll(`%#${key}#%`, getString(value))
                    }
                },
                replaceString
            )
            count++
            return originalObject.keys(replacements).map((key: any) => this.includes(`%#${key}#%`)).includes(true) && count < 128 ? replaceString.replaceVariable(replacements, count) : replaceString
        } catch (error) {
            GM_getValue('isDebug') && console.log(`replace variable error: ${getString(error)}`)
            return replaceString
        }
    }
    const prune = (obj: any): any => {
        if (isNull(obj)) return
        if (isObject(obj)) return (s => originalObject.entries(s).any() ? s : null)(originalObject.fromEntries(originalObject.entries(obj).map(([k, v]: any) => [k, prune(v)]).filter(([k, v]: any) => !isNull(v))))
        if (Array.isArray(obj)) return ((t => t.any() ? t : null)(obj.map(prune).prune()))
        if (typeof obj === 'string') return obj.isEmpty() ? null : obj
        return obj
    }
    const get = async function (url: URL, referrer: string = unsafeWindow.location.href, headers: object = {}, force: boolean = false): Promise<string> {
        if (force || url.hostname !== unsafeWindow.location.hostname ) {
            let data: any = await new Promise(async (resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url.href,
                    headers: originalObject.assign({
                        'Accept': 'application/json, text/plain, */*'
                    }, headers),
                    onload: response => resolve(response),
                    onerror: error => reject(!isNull(error) && !getString(error).isEmpty() ? getString(error) : '无法建立连接')
                })
            })
            return data.responseText
        }
        return (await originalFetch(url.href, {
            'headers': originalObject.assign({
                'accept': 'application/json, text/plain, */*'
            }, headers),
            'referrer': referrer,
            'method': 'GET',
            'mode': 'cors',
            'credentials': 'include'
        })).text()
    }

    const post = async function(url: URL, body: any, referrer: string = unsafeWindow.location.hostname, headers: object = {}): Promise<string> {
        if (typeof body !== 'string') body = JSON.stringify(body)
        if (url.hostname !== unsafeWindow.location.hostname) {
            let data: any = await new Promise(async (resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: url.href,
                    headers: originalObject.assign({
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }, headers),
                    data: body,
                    onload: response => resolve(response),
                    onerror: error => reject(!isNull(error) && !getString(error).isEmpty() ? getString(error) : '无法建立连接')
                })
            })
            return data.responseText
        }
        return (await originalFetch(url.href, {
            'headers': originalObject.assign({
                'accept': 'application/json, text/plain, */*'
            }, headers),
            'referrer': referrer,
            'body': body,
            'method': 'POST',
            'mode': 'cors',
            'credentials': 'include'
        })).text()
    }

    const UUID = function () {
        return Array.from({ length: 8 }, () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)).join('')
    }
    const ceilDiv = function (dividend: number, divisor: number): number {
        return Math.floor(dividend / divisor) + (dividend % divisor > 0 ? 1 : 0)
    }

    const language = function () {
        let env = (!isNull(config) ? config.language : (navigator.language ?? navigator.languages[0] ?? 'en')).replace('-', '_')
        let main = env.split('_').shift() ?? 'en'
        return (!isNull(i18n[env]) ? env : !isNull(i18n[main]) ? main : 'en')
    }

    const renderNode = function (renderCode: RenderCode): Node | Element {
        if (typeof renderCode === 'string') {
            return document.createTextNode(renderCode.replaceVariable(i18n[language()]).toString())
        }
        if (renderCode instanceof Node) {
            return renderCode
        }
        if (typeof renderCode !== 'object' || !renderCode.nodeType) {
            throw new Error('Invalid arguments')
        }
        const { nodeType, attributes, events, className, childs } = renderCode
        const node: Element = document.createElement(nodeType);
        (!isNull(attributes) && originalObject.keys(attributes).any()) && originalObject.entries(attributes).forEach(([key, value]: any) => node.setAttribute(key, value));
        (!isNull(events) && originalObject.keys(events).any()) && originalObject.entries(events).forEach(([eventName, eventHandler]: any) => originalAddEventListener.call(node, eventName, eventHandler));
        (!isNull(className) && className.length > 0) && node.classList.add(...[].concat(className))
        !isNull(childs) && node.append(...[].concat(childs).map(renderNode))
        return node
    }
    const findElement = function(element: Element, condition: string) {
        while (element && !element.matches(condition)) {
            element = element.parentElement;
        }
        return element;
    }

    if (GM_getValue('isDebug')) {
        console.log(getString(GM_info))
        debugger
    }

    const Channel = new BroadcastChannel("IwaraDownloadTool")

    enum DownloadType {
        Aria2,
        IwaraDownloader,
        Browser,
        Others
    }

    enum ToastType {
        Log,
        Info,
        Warn,
        Error
    }
    enum MessageType {
        Set,
        Del
    }

    class SyncDictionary<T> {
        [key: string]: any
        public id: string
        private dictionary: Dictionary<T>
        constructor(id: string, data: Array<{ key: string, value: T }> = [] ) {
            this.id = id
            this.dictionary = new Dictionary<T>(data)
            GM_getValue(this.id, []).map(i => this.dictionary.set(i.key, i.value))
            Channel.onmessage = (event: MessageEvent) => {
                const message = event.data as IChannelMessage<{ key: string , value: T | number | undefined }>
                if (message.id === this.id) {
                    switch (message.type) {
                        case MessageType.Set:
                            this.dictionary.set(message.data.key, message.data.value as T)
                            let selectButtonA = document.querySelector(`input.selectButton[videoid="${message.data.key}"]`) as HTMLInputElement
                            if (!isNull(selectButtonA)) selectButtonA.checked = true
                            break
                        case MessageType.Del:
                            this.dictionary.del(message.data.key)
                            let selectButtonB = document.querySelector(`input.selectButton[videoid="${message.data.key}"]`) as HTMLInputElement
                            if (!isNull(selectButtonB)) selectButtonB.checked = false
                            break
                        default:
                            break
                    }
                }
            }
            Channel.onmessageerror = (event) => {
                GM_getValue('isDebug') && console.log(`Channel message error: ${getString(event)}`)
            }
        }
        public set(key: string, value: T): void {
            this.dictionary.set(key, value)
            Channel.postMessage({ id: this.id, type: MessageType.Set, data: { key: key, value: value } })
            GM_setValue(this.id, this.dictionary.toArray())
        }
        public get(key: string): T | undefined {
            return this.dictionary.get(key)
        }
        public has(key: string): boolean {
            return this.dictionary.has(key)
        }
        public del(key: string): void {
            this.dictionary.del(key)
            Channel.postMessage({ id: this.id, type: MessageType.Del, data: { key: key } })
            GM_setValue(this.id, this.dictionary.toArray())
        }
        public get size(): number {
            return this.dictionary.size
        }
        public keys(): string[] {
            return this.dictionary.keys()
        }
        public values(): T[] {
            return this.dictionary.values()
        }
        public toArray(): Array<{ key: string, value: T }> {
            return this.dictionary.toArray()
        }
    }
    class Dictionary<T> {
        [key: string]: any
        items: { [key: string]: T }
        constructor(data: Array<{ key: string, value: T }> = []) {
            this.items = {}
            data.map(i => this.set(i.key, i.value))
        }
        public set(key: string, value: T): void {
            this.items[key] = value
        }
        public del(key: string): void {
            delete this.items[key]
        }
        public get(key: string): T | undefined {
            return this.has(key) ? this.items[key] : undefined
        }
        public has(key: string): boolean {
            return this.items.hasOwnProperty(key)
        }
        public get size(): number {
            return originalObject.keys(this.items).length
        }
        public keys(): string[] { 
            return originalObject.keys(this.items)
        }
        public values(): T[] {
            return originalObject.values(this.items)
        }
        public toArray(): Array<{ key: string, value: T }> {
            return this.keys().map(k => { return { key: k, value: this.items[k] } })
        }
    }
    class I18N {
        [key: string]: { [key: string]: RenderCode | RenderCode[] }
        public zh_CN = this['zh']
        public zh: { [key: string]: RenderCode | RenderCode[] } = {
            appName: 'Iwara 批量下载工具',
            language: '语言:',
            downloadPath: '下载到:',
            downloadProxy: '下载代理:',
            rename: '重命名: ',
            save: '保存',
            ok: '确定',
            on: '开启',
            off: '关闭',
            switchDebug: 'Debug模式:',
            downloadType: '下载方式:',
            browserDownload: '浏览器下载',
            iwaraDownloaderDownload: 'iwaraDownloader下载',
            checkDownloadLink: '高画质下载连接检查: ',
            checkPrioritySource: '源画质检查: ',
            autoInjectCheckbox: '自动注入选择框:',
            configurationIncompatible: '检测到不兼容的配置文件，请重新配置！',
            browserDownloadNotEnabled: `未启用下载功能！`,
            browserDownloadNotWhitelisted: `请求的文件扩展名未列入白名单！`,
            browserDownloadNotPermitted: `下载功能已启用，但未授予下载权限！`,
            browserDownloadNotSupported: `目前浏览器/版本不支持下载功能！`,
            browserDownloadNotSucceeded: `下载未开始或失败！`,
            browserDownloadUnknownError: `未知错误，有可能是下载时提供的参数存在问题，请检查文件名是否合法！`,
            browserDownloadTimeout: `下载超时，请检查网络环境是否正常！`,
            variable: '可用变量:',
            downloadTime: '下载时间 ',
            uploadTime: '发布时间 ',
            example: '示例: ',
            result: '结果: ',
            loadingCompleted: '加载完成',
            settings: '打开设置',
            downloadThis: '下载当前',
            manualDownload: '手动下载',
            reverseSelect: '反向选中',
            deselect: '取消选中',
            selectAll: '全部选中',
            downloadSelected: '下载所选',
            downloadingSelected: '正在下载所选, 请稍后...',
            injectCheckbox: '开关选择',
            configError: '脚本配置中存在错误，请修改。',
            alreadyKnowHowToUse: '我已知晓如何使用!!!',
            notice: '最新功能鼠标至视频上方按空格选中/撤销',
            useHelpForInjectCheckbox: `开启“自动注入选择框”以获得更好的体验！或等待加载出视频卡片后, 点击侧边栏中[%#injectCheckbox#%]开启下载选择框`,
            useHelpForCheckDownloadLink: '开启“高画质下载连接检查”功能会在下载视频前会检查视频简介以及评论，如果在其中发现疑似第三方下载链接，将会弹出提示，您可以点击提示打开视频页面。',
            useHelpForManualDownload: '手动下载需要您提供视频ID!',
            useHelpForBugreport: [
                '反馈遇到的BUG、使用问题等请前往：',
                {
                    nodeType: 'a',
                    childs: 'Guthub',
                    attributes: {
                        href: 'https://github.com/dawn-lc/IwaraDownloadTool/issues/new/choose'
                    }
                }
            ],
            downloadFailed: '下载失败！',
            tryRestartingDownload: '→ 点击此处重新下载 ←',
            tryReparseDownload: '→ 点击此处重新解析 ←',
            openVideoLink: '→ 进入视频页面 ←',
            downloadThisFailed: '未找到可供下载的视频！',
            pushTaskFailed: '推送下载任务失败！',
            pushTaskSucceed: '推送下载任务成功！',
            connectionTest: '连接测试',
            settingsCheck: '配置检查',
            parsingFailed: '视频信息解析失败！',
            createTask: '创建任务',
            downloadPathError: '下载路径错误!',
            browserDownloadModeError: '请启用脚本管理器的浏览器API下载模式!',
            downloadQualityError: '无原画下载地址!',
            findedDownloadLink: '发现疑似高画质下载连接!',
            allCompleted: '全部解析完成！',
            parsingProgress: '解析进度: ',
            manualDownloadTips: '请输入需要下载的视频ID! \r\n若需要批量下载请用 "|" 分割ID, 例如: AAAAAAAAAA|BBBBBBBBBBBB|CCCCCCCCCCCC...',
            externalVideo: `非本站视频`,
            getVideoSourceFailed: '获取视频源失败',
            noAvailableVideoSource: '没有可供下载的视频源',
            videoSourceNotAvailable: '视频源地址不可用',
        }
        public en: { [key: string]: RenderCode | RenderCode[] } = {
            appName: 'Iwara Download Tool',
            language: 'Language:',
            downloadPath: 'Download to:',
            downloadProxy: 'Download proxy:',
            rename: 'Rename:',
            save: 'Save',
            ok: 'OK',
            on: 'On',
            off: 'Off',
            switchDebug: 'Debug mode:',
            downloadType: 'Download type:',
            configurationIncompatible: 'An incompatible configuration file was detected, please reconfigure!',
            browserDownload: 'Browser download',
            iwaraDownloaderDownload: 'iwaraDownloader download',
            checkDownloadLink: 'High-quality download link check:',
            downloadThis: 'Download this video',
            autoInjectCheckbox: 'Auto inject selection',
            variable: 'Available variables:',
            downloadTime: 'Download time ',
            uploadTime: 'Upload time ',
            example: 'Example:',
            result: 'Result:',
            loadingCompleted: 'Loading completed',
            settings: 'Open settings',
            manualDownload: 'Manual download',
            reverseSelect: 'Reverse select',
            deselect: 'Deselect',
            selectAll: 'Select all',
            downloadSelected: 'Download selected',
            downloadingSelected: 'Downloading selected, please wait...',
            injectCheckbox: 'Switch selection',
            configError: 'There is an error in the script configuration, please modify it.',
            alreadyKnowHowToUse: 'I\'m already aware of how to use it!!!',
            useHelpForInjectCheckbox: "After the video card is loaded, click [%#injectCheckbox#%] in the sidebar to enable the download checkbox",
            useHelpForCheckDownloadLink: "Before downloading the video, the video introduction and comments will be checked. If a suspected third-party download link is found in them, a prompt will pop up. You can click the prompt to open the video page.",
            useHelpForManualDownload: "Manual download requires you to provide a video ID! \r\nIf you need to batch download, please use '|' to separate IDs. For example:A|B|C...",
            useHelpForBugreport: [
                'Report bugs: ',
                {
                    nodeType: 'a',
                    childs: 'Guthub',
                    attributes: {
                        href: 'https://github.com/dawn-lc/IwaraDownloadTool/issues/new/choose'
                    }
                }
            ],
            downloadFailed: 'Download failed!',
            tryRestartingDownload: '→ Click here to restrat ←',
            tryReparseDownload: '→ Click here to reparse ←',
            openVideoLink: '→ Enter video page ←',
            pushTaskFailed: 'Failed to push download task!',
            pushTaskSucceed: 'Pushed download task successfully!',
            connectionTest: 'Connection test',
            settingsCheck: 'Configuration check',
            parsingFailed: 'Video information parsing failed!',
            createTask: 'Create task',
            downloadPathError: 'Download path error!',
            browserDownloadModeError: "Please enable the browser API download mode of the script manager!",
            downloadQualityError: "No original painting download address!",
            findedDownloadLink: "Found suspected high-quality download link!",
            allCompleted: "All parsing completed!",
            parsingProgress: "Parsing progress:",
            manualDownloadTips: "Please enter the video ID you want to download! \r\nIf you need to batch download, please use '|' to separate IDs. For example:A|B|C...",
            externalVideo: `Non-site video`,
            getVideoSourceFailed: `Failed to get video source`,
            noAvailableVideoSource: `No available video source`,
            videoSourceNotAvailable: `Video source address not available`,
        }
    }

    class Config {
        configChange: Function
        language: string
        autoInjectCheckbox: boolean
        checkDownloadLink: boolean
        checkPrioritySource: boolean
        downloadType: DownloadType
        downloadPath: string
        downloadProxy: string
        aria2Path: string
        aria2Token: string
        iwaraDownloaderPath: string
        iwaraDownloaderToken: string
        authorization: string
        priority: Record<string, number>
        [key: string]: any
        constructor() {
            this.language = language()
            this.autoInjectCheckbox = true
            this.checkDownloadLink = true
            this.checkPrioritySource = true
            this.downloadType = DownloadType.Others
            this.downloadPath = '/Iwara/%#AUTHOR#%/%#TITLE#%[%#ID#%].mp4'
            this.downloadProxy = ''
            this.aria2Path = 'http://127.0.0.1:6800/jsonrpc'
            this.aria2Token = ''
            this.iwaraDownloaderPath = 'http://127.0.0.1:6800/jsonrpc'
            this.iwaraDownloaderToken = ''
            this.priority = {
                'Source': 100,
                '540': 2,
                '360': 1
            }
            let body = new Proxy(this, {
                get: function (target, property: string) {
                    if (property == 'configChange') {
                        return target.configChange
                    }
                    let value = GM_getValue(property, target[property])
                    GM_getValue('isDebug') && console.log(`get: ${property} ${getString(value)}`)
                    return value
                },
                set: function (target, property: string, value) {
                    if (property == 'configChange') {
                        target.configChange = value
                        return true
                    }
                    GM_setValue(property, value)
                    GM_getValue('isDebug') && console.log(`set: ${property} ${getString(value) }`)
                    target.configChange(property)
                    return true
                }
            })
            GM_listValues().forEach((value) => {
                GM_addValueChangeListener(value, (name: string, old_value: any, new_value: any, remote: boolean) => {
                    GM_getValue('isDebug') && console.log(`$Is Remote: ${remote} Change Value: ${name} old: ${getString(old_value)} new: ${getString(new_value) }`)
                    if (remote && !isNull(body.configChange)) body.configChange(name)
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
    class configEdit {
        source: configEdit
        interface: HTMLElement
        interfacePage: HTMLElement
        target: Config
        constructor(config: Config) {
            this.target = config;
            this.target.configChange = (item: string) => { this.configChange.call(this, item) } 
            this.interfacePage = renderNode({
                nodeType: 'p'
            }) as HTMLElement
            let save = renderNode({
                nodeType: 'button',
                className: 'closeButton',
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
                                        attributes: originalObject.assign(
                                            {
                                                name: 'Language',
                                                type: 'Text',
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
                            {
                                nodeType: 'p',
                                className: 'inputRadioLine',
                                childs: [
                                    '%#switchDebug#% ',
                                    {
                                        nodeType: 'label',
                                        className: 'inputRadio',
                                        childs: [
                                            '%#on#%',
                                            {
                                                nodeType: 'input',
                                                attributes: originalObject.assign(
                                                    {
                                                        name: 'IsDebug',
                                                        type: 'radio'
                                                    },
                                                    GM_getValue('isDebug', false) ? { checked: true } : {}
                                                ),
                                                events: {
                                                    change: () => {
                                                        GM_setValue('isDebug', true)
                                                    }
                                                }
                                            }
                                        ]
                                    }, {
                                        nodeType: 'label',
                                        className: 'inputRadio',
                                        childs: [
                                            '%#off#%',
                                            {
                                                nodeType: 'input',
                                                attributes: originalObject.assign(
                                                    {
                                                        name: 'IsDebug',
                                                        type: 'radio'
                                                    },
                                                    GM_getValue('isDebug', false) ? {} : { checked: true }
                                                ),
                                                events: {
                                                    change: () => {
                                                        GM_setValue('isDebug', false)
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                nodeType: 'p',
                                className: 'inputRadioLine',
                                childs: [
                                    '%#downloadType#% ',
                                    ...originalObject.keys(DownloadType).map((i: any) => !originalObject.is(Number(i), NaN) ? this.downloadTypeItem(Number(i)) : undefined).prune()
                                ]
                            },
                            {
                                nodeType: 'p',
                                className: 'inputRadioLine',
                                childs: [
                                    '%#checkDownloadLink#% ',
                                    {
                                        nodeType: 'label',
                                        className: 'inputRadio',
                                        childs: [
                                            '%#on#%',
                                            {
                                                nodeType: 'input',
                                                attributes: originalObject.assign(
                                                    {
                                                        name: 'CheckDownloadLink',
                                                        type: 'radio'
                                                    },
                                                    this.target.checkDownloadLink ? { checked: true } : {}
                                                ),
                                                events: {
                                                    change: () => {
                                                        this.target.checkDownloadLink = true
                                                    }
                                                }
                                            }
                                        ]
                                    }, {
                                        nodeType: 'label',
                                        className: 'inputRadio',
                                        childs: [
                                            '%#off#%',
                                            {
                                                nodeType: 'input',
                                                attributes: originalObject.assign(
                                                    {
                                                        name: 'CheckDownloadLink',
                                                        type: 'radio'
                                                    },
                                                    this.target.checkDownloadLink ? {} : { checked: true }
                                                ),
                                                events: {
                                                    change: () => {
                                                        this.target.checkDownloadLink = false
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                nodeType: 'p',
                                className: 'inputRadioLine',
                                childs: [
                                    '%#checkPrioritySource#% ',
                                    {
                                        nodeType: 'label',
                                        className: 'inputRadio',
                                        childs: [
                                            '%#on#%',
                                            {
                                                nodeType: 'input',
                                                attributes: originalObject.assign(
                                                    {
                                                        name: 'CheckPrioritySource',
                                                        type: 'radio'
                                                    },
                                                    this.target.checkPrioritySource ? { checked: true } : {}
                                                ),
                                                events: {
                                                    change: () => {
                                                        this.target.checkPrioritySource = true
                                                    }
                                                }
                                            }
                                        ]
                                    }, {
                                        nodeType: 'label',
                                        className: 'inputRadio',
                                        childs: [
                                            '%#off#%',
                                            {
                                                nodeType: 'input',
                                                attributes: originalObject.assign(
                                                    {
                                                        name: 'CheckPrioritySource',
                                                        type: 'radio'
                                                    },
                                                    this.target.checkPrioritySource ? {} : { checked: true }
                                                ),
                                                events: {
                                                    change: () => {
                                                        this.target.checkPrioritySource = false
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                nodeType: 'p',
                                className: 'inputRadioLine',
                                childs: [
                                    '%#autoInjectCheckbox#% ',
                                    {
                                        nodeType: 'label',
                                        className: 'inputRadio',
                                        childs: [
                                            '%#on#%',
                                            {
                                                nodeType: 'input',
                                                attributes: originalObject.assign(
                                                    {
                                                        name: 'AutoInjectCheckbox',
                                                        type: 'radio'
                                                    },
                                                    this.target.autoInjectCheckbox ? { checked: true } : {}
                                                ),
                                                events: {
                                                    change: () => {
                                                        this.target.autoInjectCheckbox = true
                                                    }
                                                }
                                            }
                                        ]
                                    }, {
                                        nodeType: 'label',
                                        className: 'inputRadio',
                                        childs: [
                                            '%#off#%',
                                            {
                                                nodeType: 'input',
                                                attributes: originalObject.assign(
                                                    {
                                                        name: 'AutoInjectCheckbox',
                                                        type: 'radio'
                                                    },
                                                    this.target.autoInjectCheckbox ? {} : { checked: true }
                                                ),
                                                events: {
                                                    change: () => {
                                                        this.target.autoInjectCheckbox = false
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                ]
                            },
                            this.interfacePage
                        ]
                    },
                    save
                ]
            }) as HTMLElement
        }
        private configChange(item: string) {
            switch (item) {
                case 'downloadType':
                    this.downloadTypeChange()
                    break
                default:
                    break
            }
        }
        
        private downloadTypeItem(type: DownloadType): RenderCode {
            return {
                nodeType: 'label',
                className: 'inputRadio',
                childs: [
                    DownloadType[type],
                    {
                        nodeType: 'input',
                        attributes: originalObject.assign(
                            {
                                name: 'DownloadType',
                                type: 'radio',
                                value: type
                            },
                            this.target.downloadType == type ? { checked: true } : {}
                        ),
                        events: {
                            change: () => {
                                this.target.downloadType = type
                            }
                        }
                    }
                ]
            }
        }
        private downloadTypeChange() {
            while (this.interfacePage.hasChildNodes()) {
                this.interfacePage.removeChild(this.interfacePage.firstChild)
            }
            let variableInfo = renderNode({
                nodeType: 'label',
                childs: [
                    '%#variable#% ',
                    { nodeType: 'br' },
                    '%#downloadTime#% %#NowTime#%',
                    { nodeType: 'br' },
                    '%#uploadTime#% %#UploadTime#%',
                    { nodeType: 'br' },
                    '%#TITLE#% | %#ID#% | %#AUTHOR#% | %#QUALITY#%',
                    { nodeType: 'br' },
                    '%#example#% %#NowTime:YYYY-MM-DD#%_%#AUTHOR#%_%#TITLE#%_%#QUALITY#%[%#ID#%].MP4',
                    { nodeType: 'br' },
                    `%#result#% ${'%#NowTime:YYYY-MM-DD#%_%#AUTHOR#%_%#TITLE#%_%#QUALITY#%[%#ID#%].MP4'.replaceVariable({
                        NowTime: new Date(),
                        AUTHOR: 'ExampleAuthorID',
                        TITLE: 'ExampleTitle',
                        ID: 'ExampleID',
                        QUALITY: 'Source'
                    })}`
                ]
            })
            let downloadConfigInput = [
                renderNode({
                    nodeType: 'label',
                    childs: [
                        `%#downloadPath#% `,
                        {
                            nodeType: 'input',
                            attributes: originalObject.assign(
                                {
                                    name: 'DownloadPath',
                                    type: 'Text',
                                    value: this.target.downloadPath
                                }
                            ),
                            events: {
                                change: (event: Event) => {
                                    this.target.downloadPath = (event.target as HTMLInputElement).value
                                }
                            }
                        }
                    ]
                }),
                renderNode({
                    nodeType: 'label',
                    childs: [
                        '%#downloadProxy#% ',
                        {
                            nodeType: 'input',
                            attributes: originalObject.assign(
                                {
                                    name: 'DownloadProxy',
                                    type: 'Text',
                                    value: this.target.downloadProxy
                                }
                            ),
                            events: {
                                change: (event: Event) => {
                                    this.target.downloadProxy = (event.target as HTMLInputElement).value
                                }
                            }
                        }
                    ]
                }),
                variableInfo
            ]
            let aria2ConfigInput = [
                renderNode({
                    nodeType: 'label',
                    childs: [
                        'Aria2 RPC: ',
                        {
                            nodeType: 'input',
                            attributes: originalObject.assign(
                                {
                                    name: 'Aria2Path',
                                    type: 'Text',
                                    value: this.target.aria2Path
                                }
                            ),
                            events: {
                                change: (event: Event) => {
                                    this.target.aria2Path = (event.target as HTMLInputElement).value
                                }
                            }
                        }
                    ]
                }),
                renderNode({
                    nodeType: 'label',
                    childs: [
                        'Aria2 Token: ',
                        {
                            nodeType: 'input',
                            attributes: originalObject.assign(
                                {
                                    name: 'Aria2Token',
                                    type: 'Password',
                                    value: this.target.aria2Token
                                }
                            ),
                            events: {
                                change: (event: Event) => {
                                    this.target.aria2Token = (event.target as HTMLInputElement).value
                                }
                            }
                        }
                    ]
                }),
                variableInfo
            ]
            let iwaraDownloaderConfigInput = [
                renderNode({
                    nodeType: 'label',
                    childs: [
                        'IwaraDownloader RPC: ',
                        {
                            nodeType: 'input',
                            attributes: originalObject.assign(
                                {
                                    name: 'IwaraDownloaderPath',
                                    type: 'Text',
                                    value: this.target.iwaraDownloaderPath
                                }
                            ),
                            events: {
                                change: (event: Event) => {
                                    this.target.iwaraDownloaderPath = (event.target as HTMLInputElement).value
                                }
                            }
                        }
                    ]
                }),
                renderNode({
                    nodeType: 'label',
                    childs: [
                        'IwaraDownloader Token: ',
                        {
                            nodeType: 'input',
                            attributes: originalObject.assign(
                                {
                                    name: 'IwaraDownloaderToken',
                                    type: 'Password',
                                    value: this.target.iwaraDownloaderToken
                                }
                            ),
                            events: {
                                change: (event: Event) => {
                                    this.target.iwaraDownloaderToken = (event.target as HTMLInputElement).value
                                }
                            }
                        }
                    ]
                }),
                variableInfo
            ]
            let BrowserConfigInput = [
                renderNode({
                    nodeType: 'label',
                    childs: [
                        '%#rename#%',
                        {
                            nodeType: 'input',
                            attributes: originalObject.assign(
                                {
                                    name: 'DownloadPath',
                                    type: 'Text',
                                    value: this.target.downloadPath
                                }
                            ),
                            events: {
                                change: (event: Event) => {
                                    this.target.downloadPath = (event.target as HTMLInputElement).value
                                }
                            }
                        }
                    ]
                }),
                variableInfo
            ]
            switch (this.target.downloadType) {
                case DownloadType.Aria2:
                    downloadConfigInput.map(i => this.interfacePage.originalAppendChild(i))
                    aria2ConfigInput.map(i => this.interfacePage.originalAppendChild(i))
                    break
                case DownloadType.IwaraDownloader:
                    downloadConfigInput.map(i => this.interfacePage.originalAppendChild(i))
                    iwaraDownloaderConfigInput.map(i => this.interfacePage.originalAppendChild(i))
                    break
                default:
                    BrowserConfigInput.map(i => this.interfacePage.originalAppendChild(i))
                    break
            }
        }
        public inject() {
            if (!document.querySelector('#pluginConfig')) {
                document.body.originalAppendChild(this.interface)
                this.downloadTypeChange()
            }
        }
    }



    class VideoInfo {
        ID: string
        UploadTime: Date
        Name: string | null
        FileName: string
        Size: number
        Tags: Array<{
            id: string
            type: string
        }>
        Alias: string
        Author: string
        Private: boolean
        VideoInfoSource: VideoAPIRawData
        VideoFileSource: VideoFileAPIRawDataList
        External: boolean
        State: boolean
        Comments: string
        DownloadQuality: string
        getDownloadUrl: () => string
        constructor(Name: string) {
            this.Name = Name
            return this
        }
        async init(ID: string) {
            try {
                config.authorization = `Bearer ${await refreshToken()}`
                this.ID = ID.toLocaleLowerCase()
                this.VideoInfoSource = JSON.parse(await get(`https://api.iwara.tv/video/${this.ID}`.toURL(), unsafeWindow.location.href, await getAuth()))
                if (this.VideoInfoSource.id === undefined) {
                    throw new Error(i18n[language()].parsingFailed.toString())
                }
                this.Name = ((this.VideoInfoSource.title ?? this.Name).normalize('NFKC').replace(/^\.|[\\\\/:*?\"<>|]/img, '_')).truncate(128)
                this.External = !isNull(this.VideoInfoSource.embedUrl) && !this.VideoInfoSource.embedUrl.isEmpty()
                if (this.External) {
                    throw new Error(i18n[language()].externalVideo.toString())
                }
                this.Private = this.VideoInfoSource.private
                this.Alias = this.VideoInfoSource.user.name
                this.Author = this.VideoInfoSource.user.username.replace(/^\.|[\\\\/:*?\"<>|]/img, '_')
                this.UploadTime = new Date(this.VideoInfoSource.createdAt)
                this.Tags = this.VideoInfoSource.tags
                this.FileName = this.VideoInfoSource.file.name.replace(/^\.|[\\\\/:*?\"<>|]/img, '_')
                this.Size = this.VideoInfoSource.file.size
                this.VideoFileSource = (JSON.parse(await get(this.VideoInfoSource.fileUrl.toURL(), unsafeWindow.location.href, await getAuth(this.VideoInfoSource.fileUrl))) as VideoFileAPIRawData[]).sort((a, b) => (!isNull(config.priority[b.name]) ? config.priority[b.name] : 0) - (!isNull(config.priority[a.name]) ? config.priority[a.name] : 0))
                if (isNull(this.VideoFileSource) || !(this.VideoFileSource instanceof Array) || this.VideoFileSource.length < 1) {
                    throw new Error(i18n[language()].getVideoSourceFailed.toString())
                }
                this.DownloadQuality = this.VideoFileSource[0].name
                this.getDownloadUrl = () => {
                    let fileList = this.VideoFileSource.filter(x => x.name == this.DownloadQuality)
                    if (!fileList.any()) throw new Error(i18n[language()].noAvailableVideoSource.toString())
                    let Source = fileList[Math.floor(Math.random() * fileList.length)].src.download
                    if (isNull(Source) || Source.isEmpty()) throw new Error(i18n[language()].videoSourceNotAvailable.toString())
                    return decodeURIComponent(`https:${Source}`)
                }
                const getCommentData = async (commentID: string = null, page: number = 0): Promise<VideoCommentAPIRawData> => {
                    return JSON.parse(
                        await get(`https://api.iwara.tv/video/${this.ID}/comments?page=${page}${!isNull(commentID) && !commentID.isEmpty() ? '&parent=' + commentID : ''}`.toURL(),
                            unsafeWindow.location.href,
                            await getAuth()
                        )
                    ) as VideoCommentAPIRawData
                }
                const getCommentDatas = async (commentID: string = null): Promise<VideoCommentAPIRawData["results"]> => {
                    let comments: VideoCommentAPIRawData["results"] = []
                    let base = await getCommentData(commentID)
                    comments.append(base.results)
                    for (let page = 1; page < ceilDiv(base.count, base.limit); page++) {
                        comments.append((await getCommentData(commentID, page)).results)
                    }
                    let replies: VideoCommentAPIRawData["results"] = []
                    for (let index = 0; index < comments.length; index++) {
                        const comment = comments[index]
                        if (comment.numReplies > 0) {
                            replies.append(await getCommentDatas(comment.id))
                        }
                    }
                    comments.append(replies)
                    return comments.prune()
                }
                this.Comments = `${this.VideoInfoSource.body}\n${(await getCommentDatas()).map(i => i.body).join('\n')}`.normalize('NFKC')
                this.State = true
                return this
            } catch (error) {
                let data = this
                let toast = newToast(
                    ToastType.Error,
                    {
                        node:
                            toastNode([
                                `${this.Name}[${this.ID}] %#parsingFailed#%`,
                                { nodeType: 'br' },
                                `${getString(error)}`,
                                { nodeType: 'br' },
                                this.External ? `%#openVideoLink#%` : `%#tryReparseDownload#%`
                            ], '%#createTask#%'),
                        onClick() {
                            if (data.External) {
                                GM_openInTab(data.VideoInfoSource.embedUrl, { active: false, insert: true, setParent: true })
                            } else {
                                analyzeDownloadTask(new Dictionary<string>([{ key: data.ID, value: data.Name }]))
                            }
                            toast.hideToast()
                        },
                    }
                )
                toast.showToast()
                let button = document.querySelector(`.selectButton[videoid="${this.ID}"]`) as HTMLInputElement
                button && button.checked && button.click()
                selectList.del(this.ID)
                this.State = false
                return this
            }
        }
    }


    GM_addStyle(GM_getResourceText('toastify-css'))
    GM_addStyle(`
    .rainbow-text {
        background-image: linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-size: 600% 100%;
        animation: rainbow 0.5s infinite linear;
    }
    @keyframes rainbow {
        0% {
            background-position: 0% 0%;
        }
        100% {
            background-position: 100% 0%;
        }
    }
    #pluginMenu {
        z-index: 2147483647;
        color: white;
        position: fixed;
        top: 50%;
        right: 0px;
        padding: 10px;
        background-color: #565656;
        border: 1px solid #ccc;
        border-radius: 5px;
        box-shadow: 0 0 10px #ccc;
        transform: translate(85%, -50%);
        transition: transform 0.5s cubic-bezier(0,1,.60,1);
    }
    #pluginMenu ul {
        list-style: none;
        margin: 0;
        padding: 0;
    }
    #pluginMenu li {
        padding: 5px 10px;
        cursor: pointer;
        text-align: center;
        user-select: none;
    }
    #pluginMenu li:hover {
        background-color: #000000cc;
        border-radius: 3px;
    }

    #pluginMenu:hover {
        transform: translate(0%, -50%);
        transition-delay: 0.5s;
    }

    #pluginMenu:not(:hover) {
        transition-delay: 0s;
    }

    #pluginMenu.moving-out {
        transform: translate(0%, -50%);
    }

    #pluginMenu.moving-in {
        transform: translate(85%, -50%);
    }

    /* 以下为兼容性处理 */
    #pluginMenu:not(.moving-out):not(.moving-in) {
        transition-delay: 0s;
    }

    #pluginMenu:hover,
    #pluginMenu:hover ~ #pluginMenu {
        transition-delay: 0s;
    }

    #pluginMenu:hover {
        transition-duration: 0.5s;
    }

    #pluginMenu:not(:hover).moving-in {
        transition-delay: 0.5s;
    }


    #pluginConfig {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(128, 128, 128, 0.8);
        z-index: 8192; 
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    #pluginConfig .main {
        color: white;
        background-color: rgb(64,64,64,0.7);
        padding: 24px;
        margin: 10px;
        overflow-y: auto;
    }
    @media (max-width: 640px) {
        #pluginConfig .main {
            width: 100%;
        }
    }
    #pluginConfig button {
        background-color: blue;
        padding: 10px 20px;
        color: white;
        font-size: 18px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    #pluginConfig button {
        background-color: blue;
    }
    #pluginConfig button[disabled] {
        background-color: darkgray;
        cursor: not-allowed;
    }
    #pluginConfig p {
        display: flex;
        flex-direction: column;
    }
    #pluginConfig p label{
        display: flex;
    }
    #pluginConfig p label input{
        flex-grow: 1;
        margin-left: 10px;
    }
    #pluginConfig .inputRadioLine {
        display: flex;
        align-items: center;
        flex-direction: row;
        margin-right: 10px;
    }
    #pluginConfig .inputRadio {
        display: flex;
        align-items: center;
        flex-direction: row-reverse;
        margin-right: 10px;
    }

    #pluginOverlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(128, 128, 128, 0.8);
        z-index: 8192; 
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    #pluginOverlay .main {
        color: white;
        font-size: 24px;
        width: 60%;
        background-color: rgb(64,64,64,0.7);
        padding: 24px;
        margin: 10px;
        overflow-y: auto;
    }
    @media (max-width: 640px) {
        #pluginOverlay .main {
            width: 100%;
        }
    }

    #pluginOverlay button {
        padding: 10px 20px;
        color: white;
        font-size: 18px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    #pluginOverlay button {
        background-color: blue;
    }
    #pluginOverlay button[disabled] {
        background-color: darkgray;
        cursor: not-allowed;
    }

    #pluginOverlay .checkbox {
        width: 32px;
        height: 32px;
        margin: 0 4px 0 0;
        padding: 0;
    }

    #pluginOverlay .checkbox-container {
        display: flex;
        align-items: center;
        margin: 0 0 10px 0;
    }

    #pluginOverlay .checkbox-label {
        color: white;
        font-size: 32px;
        font-weight: bold;
        margin-left: 10px;
        display: flex;
        align-items: center;
    }

    .selectButton {
        position: absolute;
        width: 38px;
        height: 38px;
        bottom: 24px;
        right: 0px;
        cursor:pointer;
    }
    .selectButtonCompatible {
        width: 32px;
        height: 32px;
        bottom: 0px;
        right: 4px;
        transform: translate(-50%, -50%);
        margin: 0;
        padding: 0;
        cursor:pointer;
    }

    .toastify h3 {
        margin: 0 0 10px 0;
    }
    .toastify p {
        margin: 0 ;
    }
    `)


    if (!String.prototype.replaceAll) {
        alert(`不支持的浏览器内核版本，请尽快更新您的浏览器。\r\n ${i18n[language()].appName} 将不会加载！！！`)
        return
    }
    var mouseTarget: Element = null
    var compatible = navigator.userAgent.toLowerCase().includes('firefox')
    var i18n = new I18N()
    var config = new Config()
    var editConfig = new configEdit(config)
    var selectList = new SyncDictionary<string>('selectList')
    var pluginMenu = renderNode({
        nodeType: 'div',
        attributes: {
            id: 'pluginMenu'
        },
        childs: {
            nodeType: 'ul',
            childs: [
                {
                    nodeType: 'li',
                    childs: '%#injectCheckbox#%',
                    events: {
                        click: () => {
                            if (document.querySelector('.selectButton')) {
                                document.querySelectorAll('.selectButton').forEach((element) => {
                                    element.remove()
                                })
                            } else {
                                document.querySelectorAll(`.videoTeaser`).forEach((element: Element) => {
                                    injectCheckbox(element, compatible)
                                })
                            }
                        }
                    }
                },
                {
                    nodeType: 'li',
                    childs: '%#downloadSelected#%',
                    events: {
                        click: (event: Event) => {
                            analyzeDownloadTask()
                            newToast(ToastType.Info, {
                                text: `%#downloadingSelected#%`,
                                close: true
                            }).showToast()
                            event.stopPropagation()
                            return false
                        }
                    }
                },
                {
                    nodeType: 'li',
                    childs: '%#selectAll#%',
                    events: {
                        click: (event: Event) => {
                            document.querySelectorAll('.selectButton').forEach((element) => {
                                let button = element as HTMLInputElement
                                !button.checked && button.click()
                            })
                            event.stopPropagation()
                            return false
                        }
                    }
                },
                {
                    nodeType: 'li',
                    childs: '%#deselect#%',
                    events: {
                        click: (event: Event) => {
                            document.querySelectorAll('.selectButton').forEach((element) => {
                                let button = element as HTMLInputElement
                                button.checked && button.click()
                            })
                            event.stopPropagation()
                            return false
                        }
                    }
                },
                {
                    nodeType: 'li',
                    childs: '%#reverseSelect#%',
                    events: {
                        click: (event: Event) => {
                            document.querySelectorAll('.selectButton').forEach((element) => {
                                (element as HTMLInputElement).click()
                            })
                            event.stopPropagation()
                            return false
                        }
                    }
                },
                {
                    nodeType: 'li',
                    childs: '%#manualDownload#%',
                    events: {
                        click: (event: Event) => {
                            addDownloadTask()
                            event.stopPropagation()
                            return false
                        }
                    }
                },
                {
                    nodeType: 'li',
                    childs: '%#downloadThis#%',
                    events: {
                        click: (event: Event) => {
                            if (document.querySelector('.videoPlayer')) {
                                let ID = unsafeWindow.location.href.trim().split('//').pop().split('/')[2]
                                let Title = document.querySelector('.page-video__details')?.childNodes[0]?.textContent ?? window.document.title.split('|')?.shift()?.trim() ?? '未获取到标题'
                                let IDList = new Dictionary<string>()
                                IDList.set(ID, Title)
                                analyzeDownloadTask(IDList)
                            } else {
                                let toast = newToast(
                                    ToastType.Warn,
                                    {
                                        node: toastNode(`%#downloadThisFailed#%`),
                                        onClick() {
                                            toast.hideToast()
                                        }
                                    }
                                )
                                toast.showToast()
                            }
                            event.stopPropagation()
                            return false
                        }
                    }
                },
                {
                    nodeType: 'li',
                    childs: '%#settings#%',
                    events: {
                        click: (event: Event) => {
                            editConfig.inject()
                            event.stopPropagation()
                            return false
                        }
                    }
                }
            ]
        }
    })

    function getPlayload(authorization: string) {
        return JSON.parse(decodeURIComponent(encodeURIComponent(window.atob(authorization.split(' ').pop().split('.')[1]))))
    } 

    const modifyFetch = async (input: Request | string | URL, init?: RequestInit) => {
        GM_getValue('isDebug') && console.log(`Fetch ${input}`)
        if ((input instanceof Request ? input.url : input instanceof URL ? input.href : input).toLowerCase().includes('sentry.io')) return undefined
        if (!isNull(init) && !isNull(init.headers) && !isStringTupleArray(init.headers)) {
            let authorization = null
            if (init.headers instanceof Headers) {
                authorization = init.headers.has('Authorization') ? init.headers.get('Authorization') : null
            } else {
                for (const key in init.headers) {
                    if (key.toLocaleLowerCase() == "authorization") {
                        authorization = init.headers[key]
                        break
                    }
                }
            }
            if (!isNull(authorization) && authorization !== config.authorization) {
                let playload = getPlayload(authorization)
                if (playload['type'] === 'refresh_token') {
                    GM_getValue('isDebug') && console.log(`refresh_token: ${authorization.split(' ').pop()}`)
                    isNull(localStorage.getItem('token')) && localStorage.setItem('token', authorization.split(' ').pop())
                }
                if (playload['type'] === 'access_token') {
                    config.authorization = `Bearer ${authorization.split(' ').pop()}`
                    GM_getValue('isDebug') && console.log(JSON.parse(decodeURIComponent(encodeURIComponent(window.atob(config.authorization.split('.')[1])))))
                    GM_getValue('isDebug') && console.log(`access_token: ${config.authorization.split(' ').pop()}`)
                }
            }
        }
        return originalFetch(input, init)
    }
    unsafeWindow.fetch = modifyFetch


    async function refreshToken(): Promise<string> {
        let refresh = config.authorization
        try {
            refresh = JSON.parse(await post(`https://api.iwara.tv/user/token`.toURL(), {}, unsafeWindow.location.href, {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }))['accessToken']
        } catch (error) {
            console.warn(`Refresh token error: ${getString(error)}`)
        }
        return refresh
    }
    async function getXVersion(urlString: string): Promise<string> {
        let url = urlString.toURL()
        const data = new TextEncoder().encode(`${url.pathname.split("/").pop()}_${ url.searchParams.get('expires') }_5nFp9kmbNnHdAFhaqMvt`)
        const hashBuffer = await crypto.subtle.digest('SHA-1', data)
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
    }
    enum VersionState {
        low,
        equal,
        high
    }
    function compareVersions(version1: string, version2: string): VersionState {
        const v1 = version1.split('.').map(Number)
        const v2 = version2.split('.').map(Number)

        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const num1 = v1[i] || 0
            const num2 = v2[i] || 0

            if (num1 < num2) {
                return VersionState.low
            } else if (num1 > num2) {
                return VersionState.high
            }
        }

        return VersionState.equal
    }
    async function getAuth(url?: string) {
        return originalObject.assign(
            {
                'Cooike': document.cookie,
                'Authorization': config.authorization
            },
            !isNull(url) && !url.isEmpty() ? { 'X-Version': await getXVersion(url) } : {}
        )
    }
    async function addDownloadTask() {
        let data = prompt(i18n[language()].manualDownloadTips.toString(), '')
        if (!isNull(data) && !(data.isEmpty())) {
            let IDList = new Dictionary<string>()
            data.toLowerCase().split('|').map(ID => ID.match(/((?<=(\[)).*?(?=(\])))/g)?.pop() ?? ID.match(/((?<=(\_)).*?(?=(\_)))/g)?.pop() ?? ID).prune().map(ID => IDList.set(ID, '手动解析'))
            analyzeDownloadTask(IDList)
        }
    }
    async function analyzeDownloadTask(list: IDictionary<string> = selectList) {
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
        for (let key of list.keys()) {
            let videoInfo = await (new VideoInfo(list[key])).init(key)
            videoInfo.State && await pustDownloadTask(videoInfo)
            let button = document.querySelector(`.selectButton[videoid="${key}"]`) as HTMLInputElement
            button && button.checked && button.click()
            list.del(key)
            node.firstChild.textContent = `${i18n[language()].parsingProgress}[${list.size}/${size}]`
        }
        start.hideToast()
        if (size != 1){
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
    function checkIsHaveDownloadLink(comment: string): boolean {
        if (!config.checkDownloadLink || isNull(comment) || comment.isEmpty()) {
            return false
        }
        return [
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
            'pixeldrain.',
            'gigafile.nu'
        ].filter(i => comment.toLowerCase().includes(i)).any()
    }
    function toastNode(body: RenderCode | RenderCode[], title?: string): Element | Node {
        return renderNode({
            nodeType: 'div',
            childs: [
                !isNull(title) && !title.isEmpty() ? {
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
    function getTextNode(node: Node | Element): string {
        return node.nodeType === Node.TEXT_NODE
            ? node.textContent || ''
            : node.nodeType === Node.ELEMENT_NODE
                ? Array.from(node.childNodes)
                    .map(getTextNode)
                    .join('')
                : ''
    }
    function newToast(type: ToastType, params?: Toastify.Options) {
        const logFunc = {
            [ToastType.Warn]: console.warn,
            [ToastType.Error]: console.error,
            [ToastType.Log]: console.log,
            [ToastType.Info]: console.info,
        }[type] || console.log
        params = originalObject.assign({
            newWindow: true,
            gravity: 'top',
            position: 'left',
            stopOnFocus: true
        },
            type === ToastType.Warn && {
                duration: -1,
                style: {
                    background: 'linear-gradient(-30deg, rgb(119 76 0), rgb(255 165 0))'
                }
            },
            type === ToastType.Error && {
                duration: -1,
                style: {
                    background: 'linear-gradient(-30deg, rgb(108 0 0), rgb(215 0 0))'
                }
            },
            !isNull(params) && params
        )
        if (!isNull(params.text)) {
            params.text = params.text.replaceVariable(i18n[language()]).toString()
        }
        logFunc((!isNull(params.text) ? params.text : !isNull(params.node) ? getTextNode(params.node) : 'undefined').replaceVariable(i18n[language()]))
        return Toastify(params)
    }
    async function pustDownloadTask(videoInfo: VideoInfo) {
        if (config.checkDownloadLink && checkIsHaveDownloadLink(videoInfo.Comments)) {
            let toast = newToast(
                ToastType.Warn,
                {
                    node: toastNode([
                        `${videoInfo.Name}[${videoInfo.ID}] %#findedDownloadLink#%`,
                        { nodeType: 'br' },
                        `%#openVideoLink#%`
                    ], '%#createTask#%'),
                    onClick() {
                        GM_openInTab(`https://www.iwara.tv/video/${videoInfo.ID}`, { active: false, insert: true, setParent: true })
                        toast.hideToast()
                    }
                }
            )
            toast.showToast()
            return
        }
        if (config.checkPrioritySource && videoInfo.DownloadQuality != 'Source') {
            let toast = newToast(
                ToastType.Warn,
                {
                    node: toastNode([
                        `${videoInfo.Name}[${videoInfo.ID}] %#downloadQualityError#%`,
                        { nodeType: 'br' },
                        `%#tryReparseDownload#%`
                    ], '%#createTask#%'),
                    onClick() {
                        analyzeDownloadTask(new Dictionary<string>([{ key: videoInfo.ID, value: videoInfo.Name }]))
                        toast.hideToast()
                    }
                }
            )
            toast.showToast()
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
    }
    function analyzeLocalPath(path: string): LocalPath {
        let matchPath = path.match(/^([a-zA-Z]:)?[\/\\]?([^\/\\]+[\/\\])*([^\/\\]+\.\w+)$/)
        isNull(matchPath) ?? new Error(`%#downloadPathError#%["${path}"]`)
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
    async function EnvCheck(): Promise<boolean> {
        try {
            if (GM_info.downloadMode !== 'browser') {
                GM_getValue('isDebug') && console.log(GM_info)
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
    async function localPathCheck(): Promise<boolean> {
        try {
            let pathTest = analyzeLocalPath(config.downloadPath)
            for (const key in pathTest) {
                if (!originalObject.prototype.hasOwnProperty.call(pathTest, key) || pathTest[key]) {
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
    async function aria2Check(): Promise<boolean> {
        try {
            let res = JSON.parse(await post(config.aria2Path.toURL(), {
                'jsonrpc': '2.0',
                'method': 'aria2.tellActive',
                'id': UUID(),
                'params': ['token:' + config.aria2Token]
            }))
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
    async function iwaraDownloaderCheck(): Promise<boolean> {
        try {
            let res = JSON.parse(await post(config.iwaraDownloaderPath.toURL(), originalObject.assign({
                'ver': GM_getValue('version', '0.0.0').split('.').map(i => Number(i)),
                'code': 'State'
            },
                config.iwaraDownloaderToken.isEmpty() ? {} : { 'token': config.iwaraDownloaderToken }
            )))
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
    function aria2Download(videoInfo: VideoInfo) {
        (async function (id: string, author: string, name: string, uploadTime: Date, info: string, tag: Array<{
            id: string
            type: string
        }>, quality: string, downloadUrl: string) {
            let localPath = analyzeLocalPath(config.downloadPath.replaceVariable(
                {
                    NowTime: new Date(),
                    UploadTime : uploadTime,
                    AUTHOR: author,
                    ID: id,
                    TITLE: name,
                    QUALITY: quality
                }
            ).trim())
            let json = JSON.stringify(prune({
                'jsonrpc': '2.0',
                'method': 'aria2.addUri',
                'id': UUID(),
                'params': [
                    'token:' + config.aria2Token,
                    [downloadUrl],
                    {
                        'all-proxy': config.downloadProxy,
                        'out': localPath.filename,
                        'dir': localPath.fullPath.replace(localPath.filename, ''),
                        'referer': window.location.hostname,
                        'header': [
                            'Cookie:' + document.cookie
                        ]
                    }
                    
                ]
            }))
            console.log(`Aria2 ${name} ${await post(config.aria2Path.toURL(), json)}`)
            newToast(
                ToastType.Info,
                {
                    node: toastNode(`${videoInfo.Name}[${videoInfo.ID}] %#pushTaskSucceed#%`)
                }
            ).showToast()
        }(videoInfo.ID, videoInfo.Author, videoInfo.Name, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.DownloadQuality, videoInfo.getDownloadUrl()))
    }
    function iwaraDownloaderDownload(videoInfo: VideoInfo) {
        (async function (videoInfo: VideoInfo) {
            let r = JSON.parse(await post(config.iwaraDownloaderPath.toURL(), prune({
                'ver': GM_getValue('version', '0.0.0').split('.').map(i => Number(i)),
                'code': 'add',
                'token': config.iwaraDownloaderToken,
                'data': {
                    'info': {
                        'name': videoInfo.Name,
                        'url': videoInfo.getDownloadUrl(),
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
                                TITLE: videoInfo.Name,
                                QUALITY: videoInfo.DownloadQuality
                            }
                        )
                    },
                    'option': {
                        'proxy': config.downloadProxy,
                        'cookies': document.cookie
                    }
                }
            })))
            if (r.code == 0) {
                console.log(`${videoInfo.Name} %#pushTaskSucceed#% ${r}`)
                newToast(
                    ToastType.Info,
                    {
                        node: toastNode(`${videoInfo.Name}[${videoInfo.ID}] %#pushTaskSucceed#%`)
                    }
                ).showToast()
            } else {
                let toast = newToast(
                    ToastType.Error,
                    {
                        node: toastNode([
                            `${videoInfo.Name}[${videoInfo.ID}] %#pushTaskFailed#% `,
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
    function othersDownload(videoInfo: VideoInfo) {
        (async function (ID: string, Author: string, Name: string, UploadTime: Date, DownloadQuality: string, DownloadUrl: URL) {
            let filename = analyzeLocalPath(config.downloadPath.replaceVariable(
                {
                    NowTime: new Date(),
                    UploadTime: UploadTime,
                    AUTHOR: Author,
                    ID: ID,
                    TITLE: Name,
                    QUALITY: DownloadQuality
                }
            ).trim()).filename
            DownloadUrl.searchParams.set('download', filename)
            GM_openInTab(DownloadUrl.href, { active: false, insert: true, setParent: true })
        }(videoInfo.ID, videoInfo.Author, videoInfo.Name, videoInfo.UploadTime, videoInfo.DownloadQuality, videoInfo.getDownloadUrl().toURL()))
    }
    function browserDownload(videoInfo: VideoInfo) {
        (async function (ID: string, Author: string, Name: string, UploadTime: Date, Info: string, Tag: Array<{
            id: string
            type: string
        }>, DownloadQuality: string, DownloadUrl: string) {
            function browserDownloadError(error: Tampermonkey.DownloadErrorResponse | Error) {
                let errorInfo = getString(Error)
                if (!(error instanceof Error)) {
                    errorInfo = {
                        'not_enabled': `%#browserDownloadNotEnabled#%`,
                        'not_whitelisted': `%#browserDownloadNotWhitelisted#%`,
                        'not_permitted': `%#browserDownloadNotPermitted#%`,
                        'not_supported': `%#browserDownloadNotSupported#%`,
                        'not_succeeded': `%#browserDownloadNotSucceeded#% ${error.details ?? getString(error.details)}`
                    }[error.error] || `%#browserDownloadUnknownError#%`;
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
                        onClick() {
                            analyzeDownloadTask(new Dictionary<string>([{ key: ID, value: Name }]))
                            toast.hideToast()
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
                        TITLE: Name,
                        QUALITY: DownloadQuality
                    }
                ).trim(),
                onerror: (err) => browserDownloadError(err),
                ontimeout: () => browserDownloadError(new Error('%#browserDownloadTimeout#%'))
            })
        }(videoInfo.ID, videoInfo.Author, videoInfo.Name, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.DownloadQuality, videoInfo.getDownloadUrl()))
    }
    function injectCheckbox(element: Element, compatible: boolean) {
        let ID = (element.querySelector('a.videoTeaser__thumbnail') as HTMLLinkElement).href.toURL().pathname.split('/')[2]
        let Name = element.querySelector('.videoTeaser__title').getAttribute('title').trim()
        let node = compatible ? element : element.querySelector('.videoTeaser__thumbnail')
        node.originalAppendChild(renderNode({
            nodeType: 'input',
            attributes: originalObject.assign(
                selectList.has(ID) ? { checked: true } : {}, {
                type: 'checkbox',
                videoID: ID,
                videoName: Name
            }),
            className: compatible ? ['selectButton', 'selectButtonCompatible'] : 'selectButton',
            events: {
                click: (event: Event) => {
                    (event.target as HTMLInputElement).checked ? selectList.set(ID, Name) : selectList.del(ID)
                    event.stopPropagation()
                    event.stopImmediatePropagation()
                    return false
                }
            }
        }))
    }

    function firstRun() {
        console.log('First run config reset!')
        GM_listValues().forEach(i => GM_deleteValue(i))
        config = new Config()
        editConfig = new configEdit(config)
        let confirmButton = renderNode({
            nodeType: 'button',
            attributes: {
                disabled: true,
                title: i18n[language()].ok
            },
            childs: '%#ok#%',
            events: {
                click: () => {
                    GM_setValue('isFirstRun', false)
                    GM_setValue('version', GM_info.script.version)
                    document.querySelector('#pluginOverlay').remove()
                    editConfig.inject()
                }
            }
        }) as HTMLButtonElement
        document.body.originalAppendChild(renderNode({
            nodeType: 'div',
            attributes: {
                id: 'pluginOverlay'
            },
            childs: [
                {
                    nodeType: 'div',
                    className: 'main',
                    childs: [
                        { nodeType: 'p', childs: '%#useHelpForInjectCheckbox#%' },
                        { nodeType: 'p', childs: '%#useHelpForCheckDownloadLink#%' },
                        { nodeType: 'p', childs: '%#useHelpForManualDownload#%' },
                        { nodeType: 'p', childs: i18n[language()].useHelpForBugreport }
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
        if (GM_getValue('isFirstRun', true)) {
            firstRun()
            return
        }
        if (!await config.check()) {
            newToast(ToastType.Info, {
                text: `%#configError#%`,
                duration: 60 * 1000,
            }).showToast()
            editConfig.inject()
            return
        }
        GM_setValue('version', GM_info.script.version)
        if (config.autoInjectCheckbox) {
            Node.prototype.appendChild = function <T extends Node>(node: T): T {
                if (node instanceof HTMLElement && node.classList.contains('videoTeaser')) {
                    injectCheckbox(node, compatible)
                }
                return this.originalAppendChild(node)
            }
        }
        document.body.originalAppendChild(pluginMenu)

        originalAddEventListener('mouseover', (event: Event) => {
            mouseTarget = (event as MouseEvent).target instanceof Element ? (event as MouseEvent).target as Element : null
        })

        document.addEventListener('keydown', function (e) {
            if (e.code === 'Space' && !isNull(mouseTarget)) {
                let element = findElement(mouseTarget, '.videoTeaser')
                let button = element && (element.matches('.selectButton') ? element : element.querySelector('.selectButton'))
                button && (button as HTMLInputElement).click()
                button && e.preventDefault()
            }
        })


        newToast(
            ToastType.Info,
            {
                node: toastNode([
                    `加载完成`,
                    { nodeType: 'br' },
                    `公告：%#notice#%`
                ]),
                duration: 10000,
                gravity: 'bottom',
                position: 'center'
            }
        ).showToast()
    }

    if (compareVersions(GM_getValue('version', '0.0.0'), '3.1.227') === VersionState.low) {
        GM_setValue('isFirstRun', true)
        alert(i18n[language()].configurationIncompatible)
    }

    (document.body ? Promise.resolve() : new Promise(resolve => originalAddEventListener.call(document, "DOMContentLoaded", resolve))).then(main)    
})()