// ==UserScript==
// @name              Iwara Download Tool
// @description       Download videos from iwara.tv
// @name:ja           Iwara バッチダウンローダー
// @description:ja    Iwara 動画バッチをダウンロード
// @name:zh-CN        Iwara 批量下载工具
// @description:zh-CN 批量下载 Iwara 视频
// @icon              https://i.harem-battle.club/images/2023/03/21/wMQ.png
// @namespace         https://github.com/dawn-lc/
// @version           3.1.194
// @author            dawn-lc
// @license           Apache-2.0
// @copyright         2023, Dawnlc (https://dawnlc.me/)
// @source            https://github.com/dawn-lc/IwaraDownloadTool
// @supportURL        https://github.com/dawn-lc/IwaraDownloadTool/issues
// @updateURL         https://github.com/dawn-lc/IwaraDownloadTool/raw/dev/dist/dev/IwaraDownloadTool.mata.js
// @downloadURL       https://github.com/dawn-lc/IwaraDownloadTool/raw/dev/dist/dev/IwaraDownloadTool.user.js
// @connect           iwara.tv
// @connect           www.iwara.tv
// @connect           api.iwara.tv
// @connect           cdn.staticfile.org
// @connect           localhost
// @connect           127.0.0.1
// @connect           *
// @match             *://*.iwara.tv/*
// @grant             GM_getValue
// @grant             GM_setValue
// @grant             GM_listValues
// @grant             GM_deleteValue
// @grant             GM_addValueChangeListener
// @grant             GM_addStyle
// @grant             GM_getResourceText
// @grant             GM_download
// @grant             GM_xmlhttpRequest
// @grant             GM_openInTab
// @grant             GM_cookie
// @grant             GM_info
// @grant             unsafeWindow
// @run-at            document-start
// @require           https://cdn.staticfile.org/toastify-js/1.12.0/toastify.min.js
// @require           https://cdn.staticfile.org/moment.js/2.29.4/moment.min.js
// @require           https://cdn.staticfile.org/moment.js/2.29.4/moment-with-locales.min.js
// @resource          toastify-css https://cdn.staticfile.org/toastify-js/1.12.0/toastify.min.css
// ==/UserScript==
(async function () {
    if (GM_getValue('isDebug')) {
        debugger;
    }
    let unsafeWindow = window.unsafeWindow;
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        originalAddEventListener.call(this, type, listener, options);
    };
    const isNull = function (obj) {
        return typeof obj === 'undefined' || obj === null;
    };
    const notNull = function (obj) {
        return typeof obj !== 'undefined' && obj !== null;
    };
    String.prototype.isEmpty = function () {
        return notNull(this) && this.trim().length === 0;
    };
    String.prototype.notEmpty = function () {
        return notNull(this) && this.trim().length !== 0;
    };
    const hasFunction = function (obj, method) {
        return method.notEmpty() && notNull(obj) ? method in obj && typeof obj[method] === 'function' : false;
    };
    const getString = function (obj) {
        obj = obj instanceof Error ? String(obj) : obj;
        return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj);
    };
    String.prototype.among = function (start, end) {
        if (this.isEmpty() || start.isEmpty() || end.isEmpty()) {
            throw new Error('Empty');
        }
        let body = this.split(start).pop().notEmpty() ? this.split(start).pop() : '';
        return body.split(end).shift().notEmpty() ? body.split(end).shift() : '';
    };
    String.prototype.splitLimit = function (separator, limit) {
        if (this.isEmpty() || isNull(separator)) {
            throw new Error('Empty');
        }
        let body = this.split(separator);
        return limit ? body.slice(0, limit).concat(body.slice(limit).join(separator)) : body;
    };
    String.prototype.truncate = function (maxLength) {
        return this.length > maxLength ? this.substring(0, maxLength) : this.toString();
    };
    String.prototype.trimHead = function (prefix) {
        return this.startsWith(prefix) ? this.slice(prefix.length) : this.toString();
    };
    String.prototype.trimTail = function (suffix) {
        return this.endsWith(suffix) ? this.slice(0, -suffix.length) : this.toString();
    };
    String.prototype.toURL = function () {
        return new URL(this.toString());
    };
    Array.prototype.append = function (arr) {
        this.push(...arr);
    };
    Array.prototype.any = function () {
        return this.prune().length > 0;
    };
    Array.prototype.prune = function () {
        return this.filter(i => i !== null && typeof i !== 'undefined');
    };
    Date.prototype.format = function (format) {
        return moment(this).locale(language()).format(format);
    };
    String.prototype.replaceVariable = function (replacements, count = 0) {
        let replaceString = Object.entries(replacements).reduce((str, [key, value]) => {
            if (str.includes(`%#${key}:`)) {
                let format = str.among(`%#${key}:`, '#%').toString();
                return str.replaceAll(`%#${key}:${format}#%`, getString(hasFunction(value, 'format') ? value.format(format) : value));
            }
            else {
                return str.replaceAll(`%#${key}#%`, getString(value));
            }
        }, this.toString());
        count++;
        return Object.keys(replacements).map(key => this.includes(`%#${key}#%`)).includes(true) && count < 128 ?
            replaceString.replaceVariable(replacements, count) : replaceString;
    };
    const delay = async function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    };
    const UUID = function () {
        return Array.from({ length: 8 }, () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)).join('');
    };
    const ceilDiv = function (dividend, divisor) {
        return Math.floor(dividend / divisor) + (dividend % divisor > 0 ? 1 : 0);
    };
    const random = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    const language = function () {
        let env = (notNull(config) ? config.language : (navigator.language ?? navigator.languages[0] ?? 'en')).replace('-', '_');
        let main = env.split('_').shift() ?? 'en';
        return (notNull(i18n[env]) ? env : notNull(i18n[main]) ? main : 'en');
    };
    const renderNode = function (renderCode) {
        if (typeof renderCode === 'string') {
            return document.createTextNode(renderCode.replaceVariable(i18n[language()]).toString());
        }
        if (renderCode instanceof Node) {
            return renderCode;
        }
        if (typeof renderCode !== 'object' || !renderCode.nodeType) {
            throw new Error('Invalid arguments');
        }
        const { nodeType, attributes, events, className, childs } = renderCode;
        const node = document.createElement(nodeType);
        (notNull(attributes) && Object.keys(attributes).any()) && Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
        (notNull(events) && Object.keys(events).any()) && Object.entries(events).forEach(([eventName, eventHandler]) => originalAddEventListener.call(node, eventName, eventHandler));
        (notNull(className) && className.length > 0) && node.classList.add(...[].concat(className));
        notNull(childs) && node.append(...[].concat(childs).map(renderNode));
        return node;
    };
    async function get(url, referrer = unsafeWindow.location.href, headers = {}) {
        if (url.hostname !== unsafeWindow.location.hostname) {
            let data = await new Promise(async (resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url.href,
                    headers: Object.assign({
                        'Accept': 'application/json, text/plain, */*'
                    }, headers),
                    onload: response => resolve(response),
                    onerror: error => reject(notNull(error) && !getString(error).isEmpty() ? getString(error) : '无法建立连接')
                });
            });
            return data.responseText;
        }
        return (await originFetch(url.href, {
            'headers': Object.assign({
                'accept': 'application/json, text/plain, */*'
            }, headers),
            'referrer': referrer,
            'method': 'GET',
            'mode': 'cors',
            'credentials': 'include'
        })).text();
    }
    async function post(url, body, referrer = unsafeWindow.location.hostname, headers = {}) {
        if (typeof body !== 'string')
            body = JSON.stringify(body);
        if (url.hostname !== unsafeWindow.location.hostname) {
            let data = await new Promise(async (resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: url.href,
                    headers: Object.assign({
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }, headers),
                    data: body,
                    onload: response => resolve(response),
                    onerror: error => reject(notNull(error) && !getString(error).isEmpty() ? getString(error) : '无法建立连接')
                });
            });
            return data.responseText;
        }
        return (await originFetch(url.href, {
            'headers': Object.assign({
                'accept': 'application/json, text/plain, */*'
            }, headers),
            'referrer': referrer,
            'body': body,
            'method': 'POST',
            'mode': 'cors',
            'credentials': 'include'
        })).text();
    }
    let DownloadType;
    (function (DownloadType) {
        DownloadType[DownloadType["Aria2"] = 0] = "Aria2";
        DownloadType[DownloadType["IwaraDownloader"] = 1] = "IwaraDownloader";
        DownloadType[DownloadType["Browser"] = 2] = "Browser";
        DownloadType[DownloadType["Others"] = 3] = "Others";
    })(DownloadType || (DownloadType = {}));
    let ToastType;
    (function (ToastType) {
        ToastType[ToastType["Log"] = 0] = "Log";
        ToastType[ToastType["Info"] = 1] = "Info";
        ToastType[ToastType["Warn"] = 2] = "Warn";
        ToastType[ToastType["Error"] = 3] = "Error";
    })(ToastType || (ToastType = {}));
    class Dictionary {
        items;
        constructor(data = []) {
            this.items = {};
            data.map(i => this.set(i.key, i.value));
        }
        set(key, value) {
            this.items[key] = value;
        }
        get(key) {
            return this.has(key) ? this.items[key] : undefined;
        }
        has(key) {
            return this.items.hasOwnProperty(key);
        }
        remove(key) {
            if (this.has(key)) {
                delete this.items[key];
                return true;
            }
            return false;
        }
        get size() {
            return Object.keys(this.items).length;
        }
        keys() {
            return Object.keys(this.items);
        }
        values() {
            return Object.values(this.items);
        }
        clear() {
            this.items = {};
        }
        forEach(callback) {
            for (let key in this.items) {
                if (this.has(key)) {
                    callback(key, this.items[key]);
                }
            }
        }
    }
    class I18N {
        zh_CN = this['zh'];
        zh = {
            appName: 'Iwara 批量下载工具',
            language: '语言:',
            downloadPath: '下载到:',
            downloadProxy: '下载代理:',
            rename: '重命名: ',
            save: '保存',
            ok: '确定',
            on: '开启',
            off: '关闭',
            downloadType: '下载方式:',
            browserDownload: '浏览器下载',
            iwaraDownloaderDownload: 'iwaraDownloader下载',
            checkDownloadLink: '高画质下载连接检查: ',
            autoInjectCheckbox: '自动注入选择框:',
            configurationIncompatible: '检测到不兼容的配置文件，请重新配置！',
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
            useHelpForInjectCheckbox: `等待加载出视频卡片后, 点击侧边栏中[%#injectCheckbox#%]开启下载复选框`,
            useHelpForCheckDownloadLink: '下载视频前会检查视频简介以及评论，如果在其中发现疑似第三方下载链接，会在弹出提示，您可以点击提示打开视频页面。',
            useHelpForManualDownload: '手动下载需要您提供视频ID!',
            downloadFailed: '下载失败！',
            tryRestartingDownload: '→ 点击此处重新解析 ←',
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
        };
        en = {
            appName: 'Iwara Download Tool',
            language: 'Language:',
            downloadPath: 'Download to:',
            downloadProxy: 'Download proxy:',
            rename: 'Rename:',
            save: 'Save',
            ok: 'OK',
            on: 'On',
            off: 'Off',
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
            downloadFailed: 'Download failed!',
            tryRestartingDownload: '→ Click here to re-parse ←',
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
        };
    }
    class Config {
        cookies;
        language;
        autoInjectCheckbox;
        checkDownloadLink;
        downloadType;
        downloadPath;
        downloadProxy;
        aria2Path;
        aria2Token;
        iwaraDownloaderPath;
        iwaraDownloaderToken;
        authorization;
        priority;
        constructor() {
            //初始化
            this.language = GM_getValue('language', language());
            this.autoInjectCheckbox = GM_getValue('autoInjectCheckbox', true);
            this.checkDownloadLink = GM_getValue('checkDownloadLink', true);
            this.downloadType = GM_getValue('downloadType', DownloadType.Others);
            this.downloadPath = GM_getValue('downloadPath', '/Iwara/%#AUTHOR#%/%#TITLE#%[%#ID#%].mp4');
            this.downloadProxy = GM_getValue('downloadProxy', '');
            this.aria2Path = GM_getValue('aria2Path', 'http://127.0.0.1:6800/jsonrpc');
            this.aria2Token = GM_getValue('aria2Token', '');
            this.iwaraDownloaderPath = GM_getValue('iwaraDownloaderPath', 'http://127.0.0.1:6800/jsonrpc');
            this.iwaraDownloaderToken = GM_getValue('iwaraDownloaderToken', '');
            this.priority = GM_getValue('priority', {
                'Source': 100,
                '540': 2,
                '360': 1
            });
            //代理本页面的更改
            let body = new Proxy(this, {
                get: function (target, property) {
                    GM_getValue('isDebug') && console.log(`get ${property.toString()}`);
                    return target[property];
                },
                set: function (target, property, value) {
                    if (target[property] !== value && GM_getValue('isFirstRun', true) !== true) {
                        let setr = Reflect.set(target, property, value);
                        GM_getValue('isDebug') && console.log(`set ${property.toString()} ${value} ${setr}`);
                        GM_getValue(property.toString()) !== value && GM_setValue(property.toString(), value);
                        target.configChange(property.toString());
                        return setr;
                    }
                    else {
                        return true;
                    }
                }
            });
            //同步其他页面脚本的更改
            GM_listValues().forEach((value) => {
                GM_addValueChangeListener(value, (name, old_value, new_value, remote) => {
                    if (remote && body[name] !== new_value && old_value !== new_value && !GM_getValue('isFirstRun', true)) {
                        body[name] = new_value;
                    }
                });
            });
            GM_info.scriptHandler === "Tampermonkey" ? GM_cookie('list', { domain: 'iwara.tv', httpOnly: true }, (list, error) => {
                if (error) {
                    console.log(error);
                    body.cookies = [];
                }
                else {
                    body.cookies = list;
                }
            }) : body.cookies = [];
            return body;
        }
        async check() {
            if (await localPathCheck()) {
                switch (config.downloadType) {
                    case DownloadType.Aria2:
                        return await aria2Check();
                    case DownloadType.IwaraDownloader:
                        return await iwaraDownloaderCheck();
                    case DownloadType.Browser:
                        return await EnvCheck();
                    default:
                        break;
                }
                return true;
            }
            else {
                return false;
            }
        }
        downloadTypeItem(type) {
            return {
                nodeType: 'label',
                className: 'inputRadio',
                childs: [
                    DownloadType[type],
                    {
                        nodeType: 'input',
                        attributes: Object.assign({
                            name: 'DownloadType',
                            type: 'radio',
                            value: type
                        }, config.downloadType == type ? { checked: true } : {}),
                        events: {
                            change: () => {
                                config.downloadType = type;
                            }
                        }
                    }
                ]
            };
        }
        configChange(item) {
            switch (item) {
                case 'downloadType':
                    let page = document.querySelector('#pluginConfigPage');
                    while (page.hasChildNodes()) {
                        page.removeChild(page.firstChild);
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
                            '%#TITLE#% | %#ID#% | %#AUTHOR#%',
                            { nodeType: 'br' },
                            '%#example#% %#NowTime:YYYY-MM-DD#%_%#AUTHOR#%_%#TITLE#%[%#ID#%].MP4',
                            { nodeType: 'br' },
                            `%#result#% ${'%#NowTime:YYYY-MM-DD#%_%#AUTHOR#%_%#TITLE#%[%#ID#%].MP4'.replaceVariable({
                                NowTime: new Date(),
                                AUTHOR: 'ExampleAuthorID',
                                TITLE: 'ExampleTitle',
                                ID: 'ExampleID'
                            })}`
                        ]
                    });
                    let downloadConfigInput = [
                        renderNode({
                            nodeType: 'label',
                            childs: [
                                `%#downloadPath#% `,
                                {
                                    nodeType: 'input',
                                    attributes: Object.assign({
                                        name: 'DownloadPath',
                                        type: 'Text',
                                        value: config.downloadPath
                                    }),
                                    events: {
                                        change: (event) => {
                                            config.downloadPath = event.target.value;
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
                                    attributes: Object.assign({
                                        name: 'DownloadProxy',
                                        type: 'Text',
                                        value: config.downloadProxy
                                    }),
                                    events: {
                                        change: (event) => {
                                            config.downloadProxy = event.target.value;
                                        }
                                    }
                                }
                            ]
                        }),
                        variableInfo
                    ];
                    let aria2ConfigInput = [
                        renderNode({
                            nodeType: 'label',
                            childs: [
                                'Aria2 RPC: ',
                                {
                                    nodeType: 'input',
                                    attributes: Object.assign({
                                        name: 'Aria2Path',
                                        type: 'Text',
                                        value: config.aria2Path
                                    }),
                                    events: {
                                        change: (event) => {
                                            config.aria2Path = event.target.value;
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
                                    attributes: Object.assign({
                                        name: 'Aria2Token',
                                        type: 'Password',
                                        value: config.aria2Token
                                    }),
                                    events: {
                                        change: (event) => {
                                            config.aria2Token = event.target.value;
                                        }
                                    }
                                }
                            ]
                        }),
                        variableInfo
                    ];
                    let iwaraDownloaderConfigInput = [
                        renderNode({
                            nodeType: 'label',
                            childs: [
                                'IwaraDownloader RPC: ',
                                {
                                    nodeType: 'input',
                                    attributes: Object.assign({
                                        name: 'IwaraDownloaderPath',
                                        type: 'Text',
                                        value: config.iwaraDownloaderPath
                                    }),
                                    events: {
                                        change: (event) => {
                                            config.iwaraDownloaderPath = event.target.value;
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
                                    attributes: Object.assign({
                                        name: 'IwaraDownloaderToken',
                                        type: 'Password',
                                        value: config.iwaraDownloaderToken
                                    }),
                                    events: {
                                        change: (event) => {
                                            config.downloadProxy = event.target.value;
                                        }
                                    }
                                }
                            ]
                        }),
                        variableInfo
                    ];
                    let BrowserConfigInput = [
                        renderNode({
                            nodeType: 'label',
                            childs: [
                                '%#rename#%',
                                {
                                    nodeType: 'input',
                                    attributes: Object.assign({
                                        name: 'DownloadPath',
                                        type: 'Text',
                                        value: config.downloadPath
                                    }),
                                    events: {
                                        change: (event) => {
                                            config.downloadPath = event.target.value;
                                        }
                                    }
                                }
                            ]
                        }),
                        variableInfo
                    ];
                    switch (config.downloadType) {
                        case DownloadType.Aria2:
                            downloadConfigInput.map(i => page.appendChild(i));
                            aria2ConfigInput.map(i => page.appendChild(i));
                            break;
                        case DownloadType.IwaraDownloader:
                            downloadConfigInput.map(i => page.appendChild(i));
                            iwaraDownloaderConfigInput.map(i => page.appendChild(i));
                            break;
                        default:
                            BrowserConfigInput.map(i => page.appendChild(i));
                            break;
                    }
                    break;
                default:
                    break;
            }
        }
        edit() {
            if (!document.querySelector('#pluginConfig')) {
                let save = renderNode({
                    nodeType: 'button',
                    className: 'closeButton',
                    childs: '%#save#%',
                    events: {
                        click: async () => {
                            save.disabled = !save.disabled;
                            if (await this.check()) {
                                editor.remove();
                                unsafeWindow.location.reload();
                            }
                            save.disabled = !save.disabled;
                        }
                    }
                });
                let editor = renderNode({
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
                                            attributes: Object.assign({
                                                name: 'Language',
                                                type: 'Text',
                                                value: config.language
                                            }),
                                            events: {
                                                change: (event) => {
                                                    config.language = event.target.value;
                                                }
                                            }
                                        }
                                    ]
                                },
                                {
                                    nodeType: 'p',
                                    className: 'inputRadioLine',
                                    childs: [
                                        '%#downloadType#% ',
                                        ...Object.keys(DownloadType).map(i => !Object.is(Number(i), NaN) ? this.downloadTypeItem(Number(i)) : undefined).prune()
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
                                                    attributes: Object.assign({
                                                        name: 'CheckDownloadLink',
                                                        type: 'radio'
                                                    }, config.checkDownloadLink ? { checked: true } : {}),
                                                    events: {
                                                        change: () => {
                                                            config.checkDownloadLink = true;
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
                                                    attributes: Object.assign({
                                                        name: 'CheckDownloadLink',
                                                        type: 'radio'
                                                    }, config.checkDownloadLink ? {} : { checked: true }),
                                                    events: {
                                                        change: () => {
                                                            config.checkDownloadLink = false;
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
                                                    attributes: Object.assign({
                                                        name: 'AutoInjectCheckbox',
                                                        type: 'radio'
                                                    }, config.autoInjectCheckbox ? { checked: true } : {}),
                                                    events: {
                                                        change: () => {
                                                            config.autoInjectCheckbox = true;
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
                                                    attributes: Object.assign({
                                                        name: 'AutoInjectCheckbox',
                                                        type: 'radio'
                                                    }, config.autoInjectCheckbox ? {} : { checked: true }),
                                                    events: {
                                                        change: () => {
                                                            config.autoInjectCheckbox = false;
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    nodeType: 'p',
                                    attributes: {
                                        id: 'pluginConfigPage'
                                    }
                                }
                            ]
                        },
                        save
                    ]
                });
                document.body.appendChild(editor);
                this.configChange('downloadType');
            }
        }
    }
    class VideoInfo {
        ID;
        UploadTime;
        Name;
        FileName;
        Size;
        Tags;
        Alias;
        Author;
        Private;
        VideoInfoSource;
        VideoFileSource;
        External;
        State;
        Comments;
        DownloadQuality;
        getDownloadUrl;
        constructor(Name) {
            this.Name = Name;
            return this;
        }
        async init(ID) {
            try {
                config.authorization = `Bearer ${await refreshToken()}`;
                this.ID = ID.toLocaleLowerCase();
                this.VideoInfoSource = JSON.parse(await get(`https://api.iwara.tv/video/${this.ID}`.toURL(), unsafeWindow.location.href, await getAuth()));
                if (this.VideoInfoSource.id === undefined) {
                    throw new Error(i18n[language()].parsingFailed);
                }
                this.Name = ((this.VideoInfoSource.title ?? this.Name).replace(/^\.|[\\\\/:*?\"<>|.]/img, '_')).truncate(100);
                this.External = notNull(this.VideoInfoSource.embedUrl) && !this.VideoInfoSource.embedUrl.isEmpty();
                if (this.External) {
                    throw new Error(i18n[language()].externalVideo);
                }
                this.Private = this.VideoInfoSource.private;
                this.Alias = this.VideoInfoSource.user.name.replace(/^\.|[\\\\/:*?\"<>|.]/img, '_');
                this.Author = this.VideoInfoSource.user.username.replace(/^\.|[\\\\/:*?\"<>|.]/img, '_');
                this.UploadTime = new Date(this.VideoInfoSource.createdAt);
                this.Tags = this.VideoInfoSource.tags.map((i) => i.id);
                this.FileName = this.VideoInfoSource.file.name.replace(/^\.|[\\\\/:*?\"<>|.]/img, '_');
                this.Size = this.VideoInfoSource.file.size;
                this.VideoFileSource = JSON.parse(await get(this.VideoInfoSource.fileUrl.toURL(), unsafeWindow.location.href, await getAuth(this.VideoInfoSource.fileUrl))).sort((a, b) => (notNull(config.priority[b.name]) ? config.priority[b.name] : 0) - (notNull(config.priority[a.name]) ? config.priority[a.name] : 0));
                if (isNull(this.VideoFileSource) || !(this.VideoFileSource instanceof Array) || this.VideoFileSource.length < 1) {
                    throw new Error(i18n[language()].getVideoSourceFailed);
                }
                this.DownloadQuality = this.VideoFileSource[0].name;
                this.getDownloadUrl = () => {
                    let fileList = this.VideoFileSource.filter(x => x.name == this.DownloadQuality);
                    if (!fileList.any())
                        throw new Error(i18n[language()].noAvailableVideoSource);
                    let Source = fileList[Math.floor(Math.random() * fileList.length)].src.download;
                    if (isNull(Source) || Source.isEmpty())
                        throw new Error(i18n[language()].videoSourceNotAvailable);
                    return decodeURIComponent(`https:${Source}`);
                };
                const getCommentData = async (commentID = null, page = 0) => {
                    return JSON.parse(await get(`https://api.iwara.tv/video/${this.ID}/comments?page=${page}${notNull(commentID) && !commentID.isEmpty() ? '&parent=' + commentID : ''}`.toURL(), unsafeWindow.location.href, await getAuth()));
                };
                const getCommentDatas = async (commentID = null) => {
                    let comments = [];
                    let base = await getCommentData(commentID);
                    comments.append(base.results);
                    for (let page = 1; page < ceilDiv(base.count, base.limit); page++) {
                        comments.append((await getCommentData(commentID, page)).results);
                    }
                    let replies = [];
                    for (let index = 0; index < comments.length; index++) {
                        const comment = comments[index];
                        if (comment.numReplies > 0) {
                            replies.append(await getCommentDatas(comment.id));
                        }
                    }
                    comments.append(replies);
                    return comments.prune();
                };
                this.Comments = this.VideoInfoSource.body + (await getCommentDatas()).map(i => i.body).join('\n');
                this.State = true;
                return this;
            }
            catch (error) {
                let data = this;
                let toast = newToast(ToastType.Error, {
                    node: toastNode([
                        `${this.Name}[${this.ID}] %#parsingFailed#%`,
                        { nodeType: 'br' },
                        `${getString(error)}`,
                        { nodeType: 'br' },
                        this.External ? `%#openVideoLink#%` : `%#tryRestartingDownload#%`
                    ], '%#createTask#%'),
                    onClick() {
                        if (data.External) {
                            GM_openInTab(data.VideoInfoSource.embedUrl, { active: true, insert: true, setParent: true });
                        }
                        else {
                            analyzeDownloadTask(new Dictionary([{ key: data.ID, value: data.Name }]));
                        }
                        toast.hideToast();
                    },
                });
                toast.showToast();
                let button = document.querySelector(`.selectButton[videoid="${this.ID}"]`);
                button && button.checked && button.click();
                videoList.remove(this.ID);
                this.State = false;
                return this;
            }
        }
    }
    var i18n = new I18N();
    var config = new Config();
    var videoList = new Dictionary();
    const originFetch = fetch;
    const modifyFetch = async (url, options) => {
        GM_getValue('isDebug') && console.log(`Fetch ${url}`);
        if (options !== undefined && options.headers !== undefined) {
            for (const key in options.headers) {
                if (key.toLocaleLowerCase() == "authorization") {
                    if (config.authorization !== options.headers[key]) {
                        let playload = JSON.parse(decodeURIComponent(encodeURIComponent(window.atob(options.headers[key].split(' ').pop().split('.')[1]))));
                        if (playload['type'] === 'refresh_token') {
                            GM_getValue('isDebug') && console.log(`refresh_token: ${options.headers[key].split(' ').pop()}`);
                            isNull(localStorage.getItem('token')) && localStorage.setItem('token', options.headers[key].split(' ').pop());
                            break;
                        }
                        if (playload['type'] === 'access_token') {
                            config.authorization = `Bearer ${options.headers[key].split(' ').pop()}`;
                            GM_getValue('isDebug') && console.log(JSON.parse(decodeURIComponent(encodeURIComponent(window.atob(config.authorization.split('.')[1])))));
                            GM_getValue('isDebug') && console.log(`access_token: ${config.authorization.split(' ').pop()}`);
                            break;
                        }
                    }
                }
            }
        }
        return originFetch(url, options);
    };
    window.fetch = modifyFetch;
    unsafeWindow.fetch = modifyFetch;
    GM_addStyle(GM_getResourceText('toastify-css'));
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
        z-index: 4096;
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
    }
    .selectButtonCompatible {
        width: 32px;
        height: 32px;
        bottom: 0px;
        right: 4px;
        transform: translate(-50%, -50%);
        margin: 0;
        padding: 0;
    }

    .toastify h3 {
        margin: 0 0 10px 0;
    }
    .toastify p {
        margin: 0 ;
    }
    `);
    async function refreshToken() {
        let refresh = config.authorization;
        try {
            refresh = JSON.parse(await post(`https://api.iwara.tv/user/token`.toURL(), {}, unsafeWindow.location.href, {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }))['accessToken'];
        }
        catch (error) {
            console.warn(`Refresh token error: ${getString(error)}`);
        }
        return refresh;
    }
    async function getXVersion(urlString) {
        let url = urlString.toURL();
        const data = new TextEncoder().encode(`${url.pathname.split("/").pop()}_${url.searchParams.get('expires')}_5nFp9kmbNnHdAFhaqMvt`);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    let VersionState;
    (function (VersionState) {
        VersionState[VersionState["low"] = 0] = "low";
        VersionState[VersionState["equal"] = 1] = "equal";
        VersionState[VersionState["high"] = 2] = "high";
    })(VersionState || (VersionState = {}));
    function compareVersions(version1, version2) {
        const v1 = version1.split('.').map(Number);
        const v2 = version2.split('.').map(Number);
        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const num1 = v1[i] || 0;
            const num2 = v2[i] || 0;
            if (num1 < num2) {
                return VersionState.low;
            }
            else if (num1 > num2) {
                return VersionState.high;
            }
        }
        return VersionState.equal;
    }
    async function getAuth(url) {
        return Object.assign({
            'Cooike': config.cookies.map((i) => `${i.name}:${i.value}`).join('; '),
            'Authorization': config.authorization
        }, notNull(url) && !url.isEmpty() ? { 'X-Version': await getXVersion(url) } : {});
    }
    async function addDownloadTask() {
        let data = prompt(i18n[language()].manualDownloadTips, '');
        if (notNull(data) && !(data.isEmpty())) {
            let IDList = new Dictionary();
            data.toLowerCase().split('|').map(ID => ID.match(/((?<=(\[)).*?(?=(\])))/g)?.pop() ?? ID.match(/((?<=(\_)).*?(?=(\_)))/g)?.pop() ?? ID).prune().map(ID => IDList.set(ID, '手动解析'));
            analyzeDownloadTask(IDList);
        }
    }
    async function analyzeDownloadTask(list = videoList) {
        let size = list.size;
        let node = renderNode({
            nodeType: 'p',
            childs: `%#parsingProgress#%[${list.size}/${size}]`
        });
        let start = newToast(ToastType.Info, {
            node: node,
            duration: -1
        });
        start.showToast();
        for (const key in list.items) {
            let videoInfo = await (new VideoInfo(list[key])).init(key);
            videoInfo.State && await pustDownloadTask(videoInfo);
            let button = document.querySelector(`.selectButton[videoid="${key}"]`);
            button && button.checked && button.click();
            list.remove(key);
            node.firstChild.textContent = `${i18n[language()].parsingProgress}[${list.size}/${size}]`;
        }
        start.hideToast();
        if (size != 1) {
            let completed = newToast(ToastType.Info, {
                text: `%#allCompleted#%`,
                duration: -1,
                close: true,
                onClick() {
                    completed.hideToast();
                }
            });
            completed.showToast();
        }
    }
    function checkIsHaveDownloadLink(comment) {
        if (!config.checkDownloadLink || isNull(comment) || comment.isEmpty()) {
            return false;
        }
        const downloadLinkCharacteristics = [
            'pan\.baidu',
            'mega\.nz',
            'drive\.google\.com',
            'aliyundrive',
            'uploadgig',
            'katfile',
            'storex',
            'subyshare',
            'rapidgator',
            'filebe',
            'filespace',
            'mexa\.sh',
            'mexashare',
            'mx-sh\.net',
            'uploaded\.',
            'icerbox',
            'alfafile',
            'drv\.ms',
            'onedrive',
            'pixeldrain\.com',
            'gigafile\.nu'
        ];
        for (let index = 0; index < downloadLinkCharacteristics.length; index++) {
            if (comment.toLowerCase().includes(downloadLinkCharacteristics[index])) {
                return true;
            }
        }
        return false;
    }
    function toastNode(body, title) {
        return renderNode({
            nodeType: 'div',
            childs: [
                notNull(title) && !title.isEmpty() ? {
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
        });
    }
    function getTextNode(node) {
        return node.nodeType === Node.TEXT_NODE
            ? node.textContent || ''
            : node.nodeType === Node.ELEMENT_NODE
                ? Array.from(node.childNodes)
                    .map(getTextNode)
                    .join('')
                : '';
    }
    function newToast(type, params) {
        const logFunc = {
            [ToastType.Warn]: console.warn,
            [ToastType.Error]: console.error,
            [ToastType.Log]: console.log,
            [ToastType.Info]: console.info,
        }[type] || console.log;
        params = Object.assign({
            newWindow: true,
            gravity: 'top',
            position: 'right',
            stopOnFocus: true
        }, type === ToastType.Warn && {
            duration: -1,
            style: {
                background: 'linear-gradient(-30deg, rgb(119 76 0), rgb(255 165 0))'
            }
        }, type === ToastType.Error && {
            duration: -1,
            style: {
                background: 'linear-gradient(-30deg, rgb(108 0 0), rgb(215 0 0))'
            }
        }, notNull(params) && params);
        if (notNull(params.text)) {
            params.text = params.text.replaceVariable(i18n[language()]).toString();
        }
        logFunc((notNull(params.text) ? params.text : notNull(params.node) ? getTextNode(params.node) : 'undefined').replaceVariable(i18n[language()]));
        return Toastify(params);
    }
    async function pustDownloadTask(videoInfo) {
        if (config.checkDownloadLink && checkIsHaveDownloadLink(videoInfo.Comments)) {
            let toast = newToast(ToastType.Warn, {
                node: toastNode([
                    `${videoInfo.Name}[${videoInfo.ID}] %#findedDownloadLink#%`,
                    { nodeType: 'br' },
                    `%#openVideoLink#%`
                ], '%#createTask#%'),
                onClick() {
                    GM_openInTab(`https://www.iwara.tv/video/${videoInfo.ID}`, { active: true, insert: true, setParent: true });
                    toast.hideToast();
                }
            });
            toast.showToast();
            return;
        }
        if (config.checkDownloadLink && videoInfo.DownloadQuality != 'Source') {
            let toast = newToast(ToastType.Warn, {
                node: toastNode([
                    `${videoInfo.Name}[${videoInfo.ID}] %#downloadQualityError#%`,
                    { nodeType: 'br' },
                    `%#openVideoLink#%`
                ], '%#createTask#%'),
                onClick() {
                    GM_openInTab(`https://www.iwara.tv/video/${videoInfo.ID}`, { active: true, insert: true, setParent: true });
                    toast.hideToast();
                }
            });
            toast.showToast();
            return;
        }
        switch (config.downloadType) {
            case DownloadType.Aria2:
                aria2Download(videoInfo);
                break;
            case DownloadType.IwaraDownloader:
                iwaraDownloaderDownload(videoInfo);
                break;
            case DownloadType.Browser:
                browserDownload(videoInfo);
                break;
            default:
                othersDownload(videoInfo);
                break;
        }
    }
    function analyzeLocalPath(path) {
        let matchPath = path.match(/^([a-zA-Z]:)?[\/\\]?([^\/\\]+[\/\\])*([^\/\\]+\.\w+)$/);
        isNull(matchPath) ?? new Error(`%#downloadPathError#%["${path}"]`);
        try {
            return {
                fullPath: matchPath[0],
                drive: matchPath[1] || '',
                filename: matchPath[3]
            };
        }
        catch (error) {
            throw new Error(`%#downloadPathError#% ["${matchPath.join(',')}"]`);
        }
    }
    async function EnvCheck() {
        try {
            if (GM_info.downloadMode !== 'browser') {
                GM_getValue('isDebug') && console.log(GM_info);
                throw new Error('%#browserDownloadModeError#%');
            }
        }
        catch (error) {
            let toast = newToast(ToastType.Error, {
                node: toastNode([
                    `%#configError#%`,
                    { nodeType: 'br' },
                    getString(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hideToast();
                }
            });
            toast.showToast();
            return false;
        }
        return true;
    }
    async function localPathCheck() {
        try {
            let pathTest = analyzeLocalPath(config.downloadPath);
            for (const key in pathTest) {
                if (!Object.prototype.hasOwnProperty.call(pathTest, key) || pathTest[key]) {
                }
            }
        }
        catch (error) {
            let toast = newToast(ToastType.Error, {
                node: toastNode([
                    `%#downloadPathError#%`,
                    { nodeType: 'br' },
                    getString(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hideToast();
                }
            });
            toast.showToast();
            return false;
        }
        return true;
    }
    async function aria2Check() {
        try {
            let res = JSON.parse(await post(config.aria2Path.toURL(), {
                'jsonrpc': '2.0',
                'method': 'aria2.tellActive',
                'id': UUID(),
                'params': ['token:' + config.aria2Token]
            }));
            if (res.error) {
                throw new Error(res.error.message);
            }
        }
        catch (error) {
            let toast = newToast(ToastType.Error, {
                node: toastNode([
                    `Aria2 RPC %#connectionTest#%`,
                    { nodeType: 'br' },
                    getString(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hideToast();
                }
            });
            toast.showToast();
            return false;
        }
        return true;
    }
    async function iwaraDownloaderCheck() {
        try {
            let res = JSON.parse(await post(config.iwaraDownloaderPath.toURL(), Object.assign({
                'ver': GM_getValue('version', '0.0.0').split('.').map(i => Number(i)),
                'code': 'State'
            }, config.iwaraDownloaderToken.isEmpty() ? {} : { 'token': config.iwaraDownloaderToken })));
            if (res.code !== 0) {
                throw new Error(res.msg);
            }
        }
        catch (error) {
            let toast = newToast(ToastType.Error, {
                node: toastNode([
                    `IwaraDownloader RPC %#connectionTest#%`,
                    { nodeType: 'br' },
                    getString(error)
                ], '%#settingsCheck#%'),
                position: 'center',
                onClick() {
                    toast.hideToast();
                }
            });
            toast.showToast();
            return false;
        }
        return true;
    }
    function aria2Download(videoInfo) {
        (async function (id, author, name, uploadTime, info, tag, downloadUrl) {
            let localPath = analyzeLocalPath(config.downloadPath.replaceVariable({
                NowTime: new Date(),
                UploadTime: uploadTime,
                AUTHOR: author,
                ID: id,
                TITLE: name
            }).trim());
            let json = JSON.stringify({
                'jsonrpc': '2.0',
                'method': 'aria2.addUri',
                'id': UUID(),
                'params': [
                    'token:' + config.aria2Token,
                    [downloadUrl],
                    Object.assign(config.downloadProxy.isEmpty() ? {} : { 'all-proxy': config.downloadProxy }, config.downloadPath.isEmpty() ? {} : {
                        'out': localPath.filename,
                        'dir': localPath.fullPath.replace(localPath.filename, '')
                    }, {
                        'referer': 'https://ecchi.iwara.tv/',
                        'header': [
                            'Cookie:' + config.cookies.map((i) => `${i.name}:${i.value}`).join('; ')
                            //,'Authorization:' + config.authorization
                        ]
                    })
                ]
            });
            console.log(`Aria2 ${name} ${await post(config.aria2Path.toURL(), json)}`);
            newToast(ToastType.Info, {
                node: toastNode(`${videoInfo.Name}[${videoInfo.ID}] %#pushTaskSucceed#%`)
            }).showToast();
        }(videoInfo.ID, videoInfo.Author, videoInfo.Name, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.getDownloadUrl()));
    }
    function iwaraDownloaderDownload(videoInfo) {
        (async function (videoInfo) {
            let r = JSON.parse(await post(config.iwaraDownloaderPath.toURL(), Object.assign({
                'ver': GM_getValue('version', '0.0.0').split('.').map(i => Number(i)),
                'code': 'add',
                'data': Object.assign({
                    'source': videoInfo.ID,
                    'alias': videoInfo.Alias,
                    'author': videoInfo.Author,
                    'name': videoInfo.Name,
                    'downloadTime': new Date(),
                    'uploadTime': videoInfo.UploadTime,
                    'downloadUrl': videoInfo.getDownloadUrl(),
                    'downloadCookies': config.cookies,
                    'authorization': config.authorization,
                    'size': videoInfo.Size,
                    'info': videoInfo.Comments,
                    'tag': videoInfo.Tags
                }, config.downloadPath.isEmpty() ? {} : {
                    'path': config.downloadPath.replaceVariable({
                        NowTime: new Date(),
                        UploadTime: videoInfo.UploadTime,
                        AUTHOR: videoInfo.Author,
                        ID: videoInfo.ID,
                        TITLE: videoInfo.Name
                    })
                })
            }, config.iwaraDownloaderToken.isEmpty() ? {} : { 'token': config.iwaraDownloaderToken })));
            if (r.code == 0) {
                console.log(`${videoInfo.Name} %#pushTaskSucceed#% ${r}`);
                newToast(ToastType.Info, {
                    node: toastNode(`${videoInfo.Name}[${videoInfo.ID}] %#pushTaskSucceed#%`)
                }).showToast();
            }
            else {
                let toast = newToast(ToastType.Error, {
                    node: toastNode([
                        `${videoInfo.Name}[${videoInfo.ID}] %#pushTaskFailed#% `,
                        { nodeType: 'br' },
                        r.msg
                    ], '%#iwaraDownloaderDownload#%'),
                    onClick() {
                        toast.hideToast();
                    }
                });
                toast.showToast();
            }
        }(videoInfo));
    }
    function othersDownload(videoInfo) {
        (async function (ID, Author, Name, UploadTime, DownloadUrl) {
            let filename = analyzeLocalPath(config.downloadPath.replaceVariable({
                NowTime: new Date(),
                UploadTime: UploadTime,
                AUTHOR: Author,
                ID: ID,
                TITLE: Name
            }).trim()).filename;
            DownloadUrl.searchParams.set('download', filename);
            GM_openInTab(DownloadUrl.href, { active: true, insert: true, setParent: true });
        }(videoInfo.ID, videoInfo.Author, videoInfo.Name, videoInfo.UploadTime, videoInfo.getDownloadUrl().toURL()));
    }
    function browserDownload(videoInfo) {
        (async function (ID, Author, Name, UploadTime, Info, Tag, DownloadUrl) {
            function browserDownloadError(error) {
                let toast = newToast(ToastType.Error, {
                    node: toastNode([
                        `${Name}[${ID}] %#downloadFailed#%`,
                        { nodeType: 'br' },
                        getString(error),
                        { nodeType: 'br' },
                        `%#tryRestartingDownload#%`
                    ], '%#browserDownload#%'),
                    position: 'center',
                    onClick() {
                        analyzeDownloadTask(new Dictionary([{ key: ID, value: Name }]));
                        toast.hideToast();
                    }
                });
                toast.showToast();
            }
            let localPath = analyzeLocalPath(config.downloadPath.replaceVariable({
                NowTime: new Date(),
                UploadTime: UploadTime,
                AUTHOR: Author,
                ID: ID,
                TITLE: Name
            }).trim());
            GM_download({
                url: DownloadUrl,
                saveAs: false,
                name: localPath.filename,
                onerror: (err) => browserDownloadError(err),
                ontimeout: () => browserDownloadError(new Error('Timeout'))
            });
        }(videoInfo.ID, videoInfo.Author, videoInfo.Name, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.getDownloadUrl()));
    }
    function injectCheckbox() {
        if (document.querySelector('.selectButton')) {
            return;
        }
        let compatibilityMode = navigator.userAgent.toLowerCase().includes('firefox');
        GM_getValue('isDebug') && console.log(compatibilityMode);
        let videoNodes = document.querySelectorAll(`.videoTeaser`);
        videoNodes.forEach((element) => {
            let ID = element.querySelector('a.videoTeaser__thumbnail').href.toURL().pathname.split('/')[2];
            let Name = element.querySelector('.videoTeaser__title').getAttribute('title').trim();
            let node = compatibilityMode ? element : element.querySelector('.videoTeaser__thumbnail');
            node.appendChild(renderNode({
                nodeType: 'input',
                attributes: Object.assign(videoList.has(ID) ? { checked: true } : {}, {
                    type: 'checkbox',
                    videoID: ID,
                    videoName: Name
                }),
                className: compatibilityMode ? ['selectButton', 'selectButtonCompatible'] : 'selectButton',
                events: {
                    click: (event) => {
                        let target = event.target;
                        target.checked ? videoList.set(ID, Name) : videoList.remove(ID);
                        event.stopPropagation();
                        event.stopImmediatePropagation();
                        return false;
                    }
                }
            }));
        });
    }
    if (compareVersions(GM_getValue('version', '0.0.0'), '3.1.164') === VersionState.low) {
        alert(i18n[language()].configurationIncompatible);
        GM_setValue('isFirstRun', true);
    }
    // 检查是否是首次运行脚本
    if (GM_getValue('isFirstRun', true)) {
        GM_listValues().forEach(i => GM_deleteValue(i));
        config = new Config();
        let confirmButton = renderNode({
            nodeType: 'button',
            attributes: {
                disabled: true
            },
            childs: '%#ok#%',
            events: {
                click: () => {
                    GM_setValue('isFirstRun', false);
                    GM_setValue('version', GM_info.script.version);
                    document.querySelector('#pluginOverlay').remove();
                    config.edit();
                }
            }
        });
        document.body.appendChild(renderNode({
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
                        { nodeType: 'p', childs: '%#useHelpForManualDownload#%' }
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
                                    change: (event) => {
                                        confirmButton.disabled = !event.target.checked;
                                    }
                                }
                            }, '%#alreadyKnowHowToUse#%']
                    }
                },
                confirmButton
            ]
        }));
    }
    else {
        if (!await config.check()) {
            newToast(ToastType.Info, {
                text: `%#configError#%`,
                duration: 60 * 1000,
            }).showToast();
            config.edit();
        }
        else {
            GM_setValue('version', GM_info.script.version);
            if (config.autoInjectCheckbox) {
                const observer = new MutationObserver((mutationsList) => {
                    mutationsList.forEach(mutation => {
                        if (![...document.querySelectorAll('.selectButton')].any() && [...mutation.addedNodes].filter(i => i instanceof Element && i.querySelector('.videoTeaser')).any()) {
                            injectCheckbox();
                        }
                    });
                });
                observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
            }
            document.body.appendChild(renderNode({
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
                                            element.remove();
                                        });
                                    }
                                    else {
                                        injectCheckbox();
                                    }
                                }
                            }
                        },
                        {
                            nodeType: 'li',
                            childs: '%#downloadSelected#%',
                            events: {
                                click: (event) => {
                                    analyzeDownloadTask();
                                    newToast(ToastType.Info, {
                                        text: `%#downloadingSelected#%`,
                                        close: true
                                    }).showToast();
                                    event.stopPropagation();
                                    return false;
                                }
                            }
                        },
                        {
                            nodeType: 'li',
                            childs: '%#selectAll#%',
                            events: {
                                click: (event) => {
                                    document.querySelectorAll('.selectButton').forEach((element) => {
                                        let button = element;
                                        !button.checked && button.click();
                                    });
                                    event.stopPropagation();
                                    return false;
                                }
                            }
                        },
                        {
                            nodeType: 'li',
                            childs: '%#deselect#%',
                            events: {
                                click: (event) => {
                                    document.querySelectorAll('.selectButton').forEach((element) => {
                                        let button = element;
                                        button.checked && button.click();
                                    });
                                    event.stopPropagation();
                                    return false;
                                }
                            }
                        },
                        {
                            nodeType: 'li',
                            childs: '%#reverseSelect#%',
                            events: {
                                click: (event) => {
                                    document.querySelectorAll('.selectButton').forEach((element) => {
                                        element.click();
                                    });
                                    event.stopPropagation();
                                    return false;
                                }
                            }
                        },
                        {
                            nodeType: 'li',
                            childs: '%#manualDownload#%',
                            events: {
                                click: (event) => {
                                    addDownloadTask();
                                    event.stopPropagation();
                                    return false;
                                }
                            }
                        },
                        {
                            nodeType: 'li',
                            childs: '%#downloadThis#%',
                            events: {
                                click: (event) => {
                                    if (document.querySelector('.videoPlayer')) {
                                        let ID = unsafeWindow.location.href.trim().split('//').pop().split('/')[2];
                                        let Title = document.querySelector('.page-video__details')?.childNodes[0]?.textContent ?? window.document.title.split('|')?.shift()?.trim() ?? '未获取到标题';
                                        let IDList = new Dictionary();
                                        IDList.set(ID, Title);
                                        analyzeDownloadTask(IDList);
                                    }
                                    else {
                                        let toast = newToast(ToastType.Warn, {
                                            node: toastNode(`%#downloadThisFailed#%`),
                                            onClick() {
                                                toast.hideToast();
                                            }
                                        });
                                        toast.showToast();
                                    }
                                    event.stopPropagation();
                                    return false;
                                }
                            }
                        },
                        {
                            nodeType: 'li',
                            childs: '%#settings#%',
                            events: {
                                click: (event) => {
                                    config.edit();
                                    event.stopPropagation();
                                    return false;
                                }
                            }
                        }
                    ]
                }
            }));
            newToast(ToastType.Info, {
                text: `%#loadingCompleted#%`,
                duration: 10000,
                gravity: 'bottom',
                close: true
            }).showToast();
        }
    }
})();
