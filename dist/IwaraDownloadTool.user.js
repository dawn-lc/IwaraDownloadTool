// ==UserScript==
// @name              Iwara Download Tool
// @description       Download videos from iwara.tv
// @name:ja           Iwara バッチダウンローダー
// @description:ja    Iwara 動画バッチをダウンロード
// @name:zh-CN        Iwara 批量下载工具
// @description:zh-CN 批量下载 Iwara 视频
// @icon              https://i.harem-battle.club/images/2023/03/21/wMQ.png
// @namespace         https://github.com/dawn-lc/user.js
// @version           3.1.83
// @author            dawn-lc
// @license           Apache-2.0
// @copyright         2023, Dawnlc (https://dawnlc.me/)
// @source            https://github.com/dawn-lc/user.js
// @supportURL        https://github.com/dawn-lc/user.js/issues
// @updateURL         https://github.com/dawn-lc/user.js/raw/master/dist/IwaraDownloadTool.mata.js
// @downloadURL       https://github.com/dawn-lc/user.js/raw/master/dist/IwaraDownloadTool.user.js
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
    String.prototype.isEmpty = function () {
        return this.trim().length == 0;
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
    String.prototype.replaceVariable = function (replacements) {
        return Object.entries(replacements).reduce((str, [key, value]) => str.split(`%#${key}#%`).join(String(value)), this);
    };
    String.prototype.replaceNowTime = function () {
        return this.replaceVariable({
            Y: new Date().getFullYear(),
            M: new Date().getMonth() + 1,
            D: new Date().getDate(),
            h: new Date().getHours(),
            m: new Date().getMinutes(),
            s: new Date().getSeconds()
        });
    };
    String.prototype.replaceUploadTime = function (time) {
        return this.replaceVariable({
            UploadYear: time.getFullYear(),
            UploadMonth: time.getMonth() + 1,
            UploadDate: time.getDate(),
            UploadHours: time.getHours(),
            UploadMinutes: time.getMinutes(),
            UploadSeconds: time.getSeconds()
        });
    };
    String.prototype.toURL = function () {
        return new URL(this.toString());
    };
    Array.prototype.append = function (arr) {
        this.push(...arr);
    };
    Array.prototype.any = function () {
        return this.length > 0;
    };
    const getString = function (obj) {
        obj = obj instanceof Error ? String(obj) : obj;
        return typeof obj === 'object' ? JSON.stringify(obj, null, 2).trimHead('{').trimTail('}') : String(obj);
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
    const isNull = function (obj) {
        return obj === undefined || obj === null;
    };
    const notNull = function (obj) {
        return obj !== undefined && obj !== null;
    };
    const renderNode = function (renderCode) {
        if (typeof renderCode === "string") {
            return document.createTextNode(renderCode);
        }
        if (renderCode instanceof Node) {
            return renderCode;
        }
        if (typeof renderCode !== "object" || !renderCode.nodeType) {
            throw new Error('Invalid arguments');
        }
        const { nodeType, attributes, events, className, childs } = renderCode;
        const node = document.createElement(nodeType);
        (notNull(attributes) && Object.keys(attributes).length !== 0) && Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
        (notNull(events) && Object.keys(events).length > 0) && Object.entries(events).forEach(([eventName, eventHandler]) => originalAddEventListener.call(node, eventName, eventHandler));
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
                    onerror: error => reject(notNull(error) && !getString(error).isEmpty() ? getString(error) : "无法建立连接")
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
            "mode": "cors",
            "credentials": "include"
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
                    onerror: error => reject(notNull(error) && !getString(error).isEmpty() ? getString(error) : "无法建立连接")
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
            "mode": "cors",
            "credentials": "include"
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
    class Config {
        cookies;
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
                    let downloadConfigInput = [
                        renderNode({
                            nodeType: 'label',
                            childs: [
                                '下载到：',
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
                                '下载代理：',
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
                        })
                    ];
                    let aria2ConfigInput = [
                        renderNode({
                            nodeType: 'label',
                            childs: [
                                'Aria2 RPC：',
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
                                'Aria2 Token：',
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
                        })
                    ];
                    let iwaraDownloaderConfigInput = [
                        renderNode({
                            nodeType: 'label',
                            childs: [
                                'IwaraDownloader RPC：',
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
                                'IwaraDownloader Token：',
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
                        })
                    ];
                    let BrowserConfigInput = [
                        renderNode({
                            nodeType: 'label',
                            childs: [
                                '重命名：',
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
                        })
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
                        case DownloadType.Browser:
                            BrowserConfigInput.map(i => page.appendChild(i));
                            break;
                        default:
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
                    childs: '保存',
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
                                    childs: 'Iwara 批量下载工具'
                                },
                                {
                                    nodeType: 'p',
                                    className: 'inputRadioLine',
                                    childs: [
                                        '下载方式：',
                                        ...Object.keys(DownloadType).map(i => !Object.is(Number(i), NaN) ? this.downloadTypeItem(Number(i)) : undefined).filter(Boolean)
                                    ]
                                },
                                {
                                    nodeType: 'p',
                                    className: 'inputRadioLine',
                                    childs: [
                                        '画质检查：',
                                        {
                                            nodeType: 'label',
                                            className: 'inputRadio',
                                            childs: [
                                                "开启",
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
                                                "关闭",
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
                                    childs: [{ nodeType: 'label', childs: '路径变量：%#Y#% (当前时间[年]) | %#M#% (当前时间[月]) | %#D#% (当前时间[日]) | %#h#% (当前时间[时]) | %#m#% (当前时间[分]) | %#s#% (当前时间[秒])' },
                                        { nodeType: 'label', childs: '%#TITLE#% (标题) | %#ID#% (ID) | %#AUTHOR#% (作者)' },
                                        { nodeType: 'label', childs: '%#UploadYear#% (发布时间[年]) | %#UploadMonth#% (发布时间[月]) | %#UploadDate#% (发布时间[日]) | %#UploadHours#% (发布时间[时]) | %#UploadMinutes#% (发布时间[分]) | %#UploadSeconds#% (发布时间[秒])' },
                                        { nodeType: 'label', childs: '例: %#Y#%-%#M#%-%#D#%_%#TITLE#%[%#ID#%].MP4' },
                                        { nodeType: 'label', childs: '结果: ' + '%#Y#%-%#M#%-%#D#%_%#TITLE#%[%#ID#%].MP4'.replaceNowTime().replace('%#TITLE#%', '演示标题').replace('%#ID#%', '演示ID'), }]
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
                    throw new Error('获取视频信息失败');
                }
                this.Name = ((this.VideoInfoSource.title ?? this.Name).replace(/^\.|[\\\\/:*?\"<>|.]/img, '_')).truncate(100);
                this.External = notNull(this.VideoInfoSource.embedUrl) && !this.VideoInfoSource.embedUrl.isEmpty();
                if (this.External) {
                    throw new Error(`非本站视频`);
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
                    throw new Error('获取视频源失败');
                }
                this.DownloadQuality = this.VideoFileSource[0].name;
                this.getDownloadUrl = () => {
                    let fileList = this.VideoFileSource.filter(x => x.name == this.DownloadQuality);
                    if (!fileList.any())
                        throw new Error('没有可供下载的视频源');
                    let Source = fileList[Math.floor(Math.random() * fileList.length)].src.download;
                    if (isNull(Source) || Source.isEmpty())
                        throw new Error('视频源地址不可用');
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
                    return comments.filter(Boolean);
                };
                this.Comments = this.VideoInfoSource.body + (await getCommentDatas()).map(i => i.body).join('\n');
                this.State = true;
                return this;
            }
            catch (error) {
                let data = this;
                let toast = newToast(ToastType.Error, {
                    node: toastNode([
                        `在解析 ${this.Name}[${this.ID}] 的过程中出现问题!  `,
                        { nodeType: 'br' },
                        `${getString(error)}`,
                        { nodeType: 'br' },
                        this.External ? `→ 点击打开视频地址 ←` : `→ 点击此处重新解析 ←`
                    ], '解析模块'),
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
    let config = new Config();
    let videoList = new Dictionary();
    // @ts-ignore
    Toastify.defaults.oldestFirst = false;
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
    GM_addStyle(await get('https://cdn.staticfile.org/toastify-js/1.12.0/toastify.min.css'.toURL()));
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
    function parseSearchParams(searchParams, initialObject = {}) {
        return [...searchParams.entries()].reduce((acc, [key, value]) => ({ ...acc, [key]: value }), initialObject);
    }
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
        let url = new URL(urlString);
        let params = parseSearchParams(url.searchParams);
        const data = new TextEncoder().encode(`${url.pathname.split("/").pop()}_${params['expires']}_5nFp9kmbNnHdAFhaqMvt`);
        const hashBuffer = await crypto.subtle.digest("SHA-1", data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
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
        let data = prompt('请输入需要下载的视频ID! \r\n若需要批量下载请用 "|" 分割ID, 例如: AAAAAAAAAA|BBBBBBBBBBBB|CCCCCCCCCCCC...', '');
        if (notNull(data) && !(data.isEmpty())) {
            let IDList = new Dictionary();
            data.toLowerCase().split('|').map(ID => ID.match(/((?<=(\[)).*?(?=(\])))/g)?.pop() ?? ID.match(/((?<=(\_)).*?(?=(\_)))/g)?.pop() ?? ID).filter(Boolean).map(ID => IDList.set(ID, '手动解析'));
            analyzeDownloadTask(IDList);
        }
    }
    async function analyzeDownloadTask(list = videoList) {
        let size = list.size;
        let node = renderNode({
            nodeType: 'p',
            childs: `共${size}条视频, 还剩${list.size}条视频尚未解析。`
        });
        let start = newToast(ToastType.Info, {
            node: node,
            duration: -1
        });
        start.showToast();
        for (const key in list.items) {
            await delay(random(10, 100)); //脚本太快了,延迟一下防止被屏蔽
            let videoInfo = await (new VideoInfo(list[key])).init(key);
            if (videoInfo.State) {
                await pustDownloadTask(videoInfo);
                let button = document.querySelector(`.selectButton[videoid="${key}"]`);
                button && button.checked && button.click();
                list.remove(key);
                node.firstChild.textContent = `共${size}条视频, 还剩${list.size}条视频尚未解析。`;
            }
        }
        start.hideToast();
        newToast(ToastType.Info, {
            text: `全部解析完成！`,
            duration: -1,
            close: true
        }).showToast();
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
                    childs: `Iwara 批量下载工具 - ${title}`
                } : {
                    nodeType: 'h3',
                    childs: 'Iwara 批量下载工具'
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
            gravity: "top",
            position: "right",
            stopOnFocus: true
        }, type === ToastType.Warn && {
            duration: -1,
            style: {
                background: "linear-gradient(-30deg, rgb(119 76 0), rgb(255 165 0))"
            }
        }, type === ToastType.Error && {
            duration: -1,
            style: {
                background: "linear-gradient(-30deg, rgb(108 0 0), rgb(215 0 0))"
            }
        }, notNull(params) && params);
        logFunc(notNull(params.text) ? params.text : notNull(params.node) ? getTextNode(params.node) : 'undefined');
        return Toastify(params);
    }
    async function pustDownloadTask(videoInfo) {
        if (config.checkDownloadLink && checkIsHaveDownloadLink(videoInfo.Comments)) {
            let toast = newToast(ToastType.Warn, {
                node: toastNode([`在创建 ${videoInfo.Name}[${videoInfo.ID}] 下载任务过程中发现疑似高画质下载连接! `, { nodeType: 'br' }, `点击此处，进入视频页面`], '创建任务'),
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
                node: toastNode([`在创建 ${videoInfo.Name}[${videoInfo.ID}] 下载任务过程中发现无原画下载地址! `, { nodeType: 'br' }, `→ 点击此处，进入视频页面 ←`], '创建任务'),
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
        try {
            return {
                fullPath: matchPath[0],
                drive: matchPath[1] || '',
                filename: matchPath[3],
                match: matchPath !== null
            };
        }
        catch (error) {
            throw new Error(`错误的下载路径，请检查路径是否存在！${matchPath.join('-')}`);
        }
    }
    async function EnvCheck() {
        try {
            if (GM_info.downloadMode !== "browser") {
                GM_getValue('isDebug') && console.log(GM_info);
                throw new Error("请启用脚本管理器的浏览器API下载模式!");
            }
        }
        catch (error) {
            let toast = newToast(ToastType.Error, {
                node: toastNode([
                    `无法保存配置, 请检查配置是否正确。`,
                    { nodeType: 'br' },
                    `错误信息: ${getString(error)}`
                ], '配置检查'),
                position: "center",
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
            analyzeLocalPath(config.downloadPath);
        }
        catch (error) {
            let toast = newToast(ToastType.Error, {
                node: toastNode([
                    `下载路径存在问题！`,
                    { nodeType: 'br' },
                    `错误信息: ${getString(error)}`
                ], '配置检查'),
                position: "center",
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
                    `Aria2 RPC 连接测试`,
                    { nodeType: 'br' },
                    `错误信息: ${getString(error)}`
                ], '配置检查'),
                position: "center",
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
                'ver': 1,
                'code': 'State'
            }, config.iwaraDownloaderToken.isEmpty() ? {} : { 'token': config.iwaraDownloaderToken })));
            if (res.code !== 0) {
                throw new Error(res.msg);
            }
        }
        catch (error) {
            let toast = newToast(ToastType.Error, {
                node: toastNode([
                    `IwaraDownloader RPC 连接测试`,
                    { nodeType: 'br' },
                    `错误信息: ${getString(error)}`
                ], '配置检查'),
                position: "center",
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
            let localPath = analyzeLocalPath(config.downloadPath.replaceNowTime().replaceUploadTime(uploadTime).replaceVariable({
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
                node: toastNode(`${videoInfo.Name}[${videoInfo.ID}] 已推送到Aria2`)
            }).showToast();
        }(videoInfo.ID, videoInfo.Author, videoInfo.Name, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.getDownloadUrl()));
    }
    function iwaraDownloaderDownload(videoInfo) {
        (async function (videoInfo) {
            let r = JSON.parse(await post(config.iwaraDownloaderPath.toURL(), Object.assign({
                'ver': 1,
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
                    'path': config.downloadPath.replaceNowTime().replaceUploadTime(videoInfo.UploadTime).replaceVariable({
                        AUTHOR: videoInfo.Author,
                        ID: videoInfo.ID,
                        TITLE: videoInfo.Name
                    })
                })
            }, config.iwaraDownloaderToken.isEmpty() ? {} : { 'token': config.iwaraDownloaderToken })));
            if (r.code == 0) {
                console.log(`${videoInfo.Name} 已推送到IwaraDownloader ${r}`);
                newToast(ToastType.Info, {
                    node: toastNode(`${videoInfo.Name}[${videoInfo.ID}] 已推送到IwaraDownloader`)
                }).showToast();
            }
            else {
                let toast = newToast(ToastType.Error, {
                    node: toastNode([
                        `在推送 ${videoInfo.Name}[${videoInfo.ID}] 下载任务到IwaraDownloader过程中出现错误! `,
                        { nodeType: 'br' },
                        `错误信息: ${r.msg}`
                    ], '推送下载任务'),
                    position: "center",
                    onClick() {
                        toast.hideToast();
                    }
                });
                toast.showToast();
            }
        }(videoInfo));
    }
    function othersDownload(videoInfo) {
        (async function (ID, Author, Name, UploadTime, Info, Tag, DownloadUrl) {
            GM_openInTab(DownloadUrl, { active: true, insert: true, setParent: true });
        }(videoInfo.ID, videoInfo.Author, videoInfo.Name, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.getDownloadUrl()));
    }
    function browserDownload(videoInfo) {
        (async function (ID, Author, Name, UploadTime, Info, Tag, DownloadUrl) {
            function browserDownloadError(error) {
                let toast = newToast(ToastType.Error, {
                    node: toastNode([
                        `在下载 ${Name}[${ID}] 的过程中出现问题!  `,
                        { nodeType: 'br' },
                        `错误信息: ${getString(error)}`,
                        { nodeType: 'br' },
                        `→ 点击此处重新下载 ←`
                    ], '下载任务'),
                    position: "center",
                    onClick() {
                        analyzeDownloadTask(new Dictionary([{ key: ID, value: Name }]));
                        toast.hideToast();
                    }
                });
                toast.showToast();
            }
            let localPath = analyzeLocalPath(config.downloadPath.replaceNowTime().replaceUploadTime(UploadTime).replaceVariable({
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
    if (compareVersions(GM_getValue('version', '0.0.0'), '3.1.30') === VersionState.low) {
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
            childs: '确定',
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
                        {
                            nodeType: 'h2',
                            childs: [
                                '请使用',
                                {
                                    nodeType: 'a',
                                    attributes: {
                                        href: 'https://www.tampermonkey.net/index.php?#download_gcal'
                                    },
                                    childs: 'Tampermonkey Beta'
                                },
                                '载入本脚本, 以保证可以利用脚本所有功能。'
                            ]
                        },
                        { nodeType: 'p', childs: '路径变量：%#Y#% (当前时间[年]) | %#M#% (当前时间[月]) | %#D#% (当前时间[日]) | %#h#% (当前时间[时]) | %#m#% (当前时间[分]) | %#s#% (当前时间[秒])' },
                        { nodeType: 'p', childs: '%#TITLE#% (标题) | %#ID#% (ID) | %#AUTHOR#% (作者)' },
                        { nodeType: 'p', childs: '%#UploadYear#% (发布时间[年]) | %#UploadMonth#% (发布时间[月]) | %#UploadDate#% (发布时间[日]) | %#UploadHours#% (发布时间[时]) | %#UploadMinutes#% (发布时间[分]) | %#UploadSeconds#% (发布时间[秒])' },
                        { nodeType: 'p', childs: '例: %#Y#%-%#M#%-%#D#%_%#TITLE#%[%#ID#%].MP4' },
                        { nodeType: 'p', childs: '结果: ' + '%#Y#%-%#M#%-%#D#%_%#TITLE#%[%#ID#%].MP4'.replaceNowTime().replace('%#TITLE#%', '演示标题').replace('%#ID#%', '演示ID'), },
                        { nodeType: 'p', childs: '等待加载出视频卡片后, 点击侧边栏中“开关选择”开启下载复选框' },
                        { nodeType: 'p', childs: '下载视频前会检查视频简介以及评论，如果在其中发现疑似第三方下载链接，会在弹出提示，您可以点击提示打开视频页面。' },
                        { nodeType: 'p', childs: '手动下载需要您提供视频ID!' }
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
                            }, '我已知晓如何使用!!!']
                    }
                },
                confirmButton
            ]
        }));
    }
    else {
        if (!await config.check()) {
            newToast(ToastType.Info, {
                text: `脚本配置中存在错误，请修改。`,
                duration: 60 * 1000,
            }).showToast();
            config.edit();
        }
        else {
            GM_setValue('version', GM_info.script.version);
            document.body.appendChild(renderNode({
                nodeType: "div",
                attributes: {
                    id: "pluginMenu"
                },
                childs: {
                    nodeType: "ul",
                    childs: [
                        {
                            nodeType: "li",
                            childs: "开关选择",
                            events: {
                                click: () => {
                                    let compatibilityMode = navigator.userAgent.toLowerCase().includes('firefox');
                                    GM_getValue('isDebug') && console.log(compatibilityMode);
                                    if (!document.querySelector('.selectButton')) {
                                        let videoNodes = document.querySelectorAll(`.videoTeaser`);
                                        newToast(ToastType.Info, {
                                            text: `开始注入复选框 预计注入${videoNodes.length}个复选框`,
                                            close: true
                                        }).showToast();
                                        videoNodes.forEach((element) => {
                                            let ID = element.querySelector('.videoTeaser__thumbnail').getAttribute('href').trim().split('/')[2];
                                            let Name = element.querySelector('.videoTeaser__title').getAttribute('title').trim();
                                            let node = compatibilityMode ? element : element.querySelector('.videoTeaser__thumbnail');
                                            node.appendChild(renderNode({
                                                nodeType: "input",
                                                attributes: Object.assign(videoList.has(ID) ? { checked: true } : {}, {
                                                    type: "checkbox",
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
                                    else {
                                        newToast(ToastType.Info, {
                                            text: `开始移除复选框`,
                                            close: true
                                        }).showToast();
                                        document.querySelectorAll('.selectButton').forEach((element) => {
                                            //videoList.remove(element.getAttribute('videoid'))
                                            element.remove();
                                        });
                                    }
                                }
                            }
                        },
                        {
                            nodeType: "li",
                            childs: "下载所选",
                            events: {
                                click: (event) => {
                                    analyzeDownloadTask();
                                    newToast(ToastType.Info, {
                                        text: `正在下载所选, 请稍后...`,
                                        close: true
                                    }).showToast();
                                    event.stopPropagation();
                                    return false;
                                }
                            }
                        },
                        {
                            nodeType: "li",
                            childs: "全部选中",
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
                            nodeType: "li",
                            childs: "取消全选",
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
                            nodeType: "li",
                            childs: "反向选中",
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
                            nodeType: "li",
                            childs: "手动下载",
                            events: {
                                click: (event) => {
                                    addDownloadTask();
                                    event.stopPropagation();
                                    return false;
                                }
                            }
                        },
                        {
                            nodeType: "li",
                            childs: "打开设置",
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
                text: `Iwara 批量下载工具加载完成`,
                duration: 10000,
                close: true
            }).showToast();
        }
    }
})();
