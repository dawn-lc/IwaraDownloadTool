// ==UserScript==
// @name              Iwara Download Tool
// @description       Download videos from iwara.tv
// @name:ja           Iwara バッチダウンローダー
// @description:ja    Iwara 動画バッチをダウンロード
// @name:zh-CN        Iwara 批量下载工具
// @description:zh-CN 批量下载 Iwara 视频
// @icon              https://i.harem-battle.club/images/2023/03/21/wMQ.png
// @namespace         https://github.com/dawn-lc/user.js
// @version           3.0.266
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
// @connect           *
// @match             *://*.iwara.tv/*
// @grant             GM_getValue
// @grant             GM_setValue
// @grant             GM_listValues
// @grant             GM_deleteValue
// @grant             GM_addValueChangeListener
// @grant             GM_removeValueChangeListener
// @grant             GM_addStyle
// @grant             GM_getResourceText
// @grant             GM_download
// @grant             GM_xmlhttpRequest
// @grant             GM_openInTab
// @grant             GM_cookie
// @grant             unsafeWindow
// @run-at            document-start
// @require           https://cdn.staticfile.org/toastify-js/1.12.0/toastify.min.js
// ==/UserScript==
(async function () {
    if (GM_getValue('isDebug')) {
        debugger;
    }
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        originalAddEventListener.call(this, type, listener, options);
    };
    String.prototype.replaceVariable = function (replacements) {
        return Object.entries(replacements).reduce((str, [key, value]) => str.split(`%#${key}#%`).join(String(value)), this);
    };
    String.prototype.isEmpty = function () {
        return this.trim().length == 0;
    };
    String.prototype.truncate = function (maxLength) {
        if (this.length > maxLength) {
            return this.substring(0, maxLength);
        }
        return this.toString();
    };
    Array.prototype.append = function (arr) {
        this.push(...arr);
    };
    Array.prototype.any = function () {
        return this.length > 0;
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
    class Queue {
        items;
        constructor() {
            this.items = [];
        }
        enqueue(id, element) {
            this.items.push({ id, data: element });
        }
        dequeue() {
            return this.items.shift();
        }
        peek() {
            return this.items[0];
        }
        size() {
            return this.items.length;
        }
        isEmpty() {
            return this.items.length === 0;
        }
        clear() {
            this.items = [];
        }
        remove(id) {
            const index = this.items.findIndex(item => item.id === id);
            if (index !== -1) {
                this.items.splice(index, 1);
            }
        }
    }
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
    /**
     * RenderCode 转换成 Node
     * @param renderCode - RenderCode
     * @returns Node 节点
     */
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
    let DownloadType;
    (function (DownloadType) {
        DownloadType[DownloadType["Aria2"] = 0] = "Aria2";
        DownloadType[DownloadType["IwaraDownloader"] = 1] = "IwaraDownloader";
        DownloadType[DownloadType["Others"] = 2] = "Others";
    })(DownloadType || (DownloadType = {}));
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
            //代理本页面的更改
            let body = new Proxy(this, {
                get: function (target, property) {
                    GM_getValue('isDebug') && console.log(`get ${property.toString()}`);
                    return target[property];
                },
                set: function (target, property, value) {
                    if (target[property] !== value && GM_getValue('isFirstRun', true) !== true) {
                        let setr = Reflect.set(target, property, value);
                        console.log(`set ${property.toString()} ${value} ${setr}`);
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
            GM_cookie('list', { domain: 'iwara.tv', httpOnly: true }, (list, error) => {
                if (error) {
                    console.log(error);
                    body.cookies = [];
                }
                else {
                    body.cookies = list;
                }
            });
            return body;
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
                                        type: 'Text',
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
                                        type: 'Text',
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
                            break;
                    }
                    break;
                default:
                    break;
            }
        }
        edit() {
            if (!document.querySelector('#pluginConfig')) {
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
                                        '高画质检查：',
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
                                    attributes: {
                                        id: 'pluginConfigPage'
                                    }
                                }
                            ]
                        },
                        {
                            nodeType: 'button',
                            className: 'closeButton',
                            childs: '保存',
                            events: {
                                click: async () => {
                                    switch (config.downloadType) {
                                        case DownloadType.Aria2:
                                            (await aria2Check()) && editor.remove();
                                            break;
                                        case DownloadType.IwaraDownloader:
                                            (await iwaraDownloaderCheck()) && editor.remove();
                                            break;
                                        default:
                                            editor.remove();
                                            break;
                                    }
                                }
                            }
                        }
                    ]
                });
                document.body.appendChild(editor);
                this.configChange('downloadType');
            }
        }
    }
    class VideoInfo {
        Title;
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
        getDownloadQuality;
        getDownloadUrl;
        constructor(Name) {
            this.Title = { nodeType: 'h2', childs: 'Iwara批量下载工具-解析模块' };
            this.Name = Name;
            return this;
        }
        async init(ID) {
            try {
                this.ID = ID.toLocaleLowerCase();
                this.VideoInfoSource = JSON.parse(await get(`https://api.iwara.tv/video/${this.ID}`, window.location.href, await getAuth()));
                if (this.VideoInfoSource.id === undefined) {
                    throw new Error('获取视频信息失败');
                }
                this.Name = ((this.VideoInfoSource.title ?? this.Name).replace(/^\.|[\\\\/:*?\"<>|.]/img, '_')).truncate(100);
                this.External = this.VideoInfoSource.embedUrl !== null && !this.VideoInfoSource.embedUrl.isEmpty();
                if (this.External) {
                    throw new Error(`非本站视频 ${this.VideoInfoSource.embedUrl}`);
                }
                this.Private = this.VideoInfoSource.private;
                this.Alias = this.VideoInfoSource.user.name.replace(/^\.|[\\\\/:*?\"<>|.]/img, '_');
                this.Author = this.VideoInfoSource.user.username.replace(/^\.|[\\\\/:*?\"<>|.]/img, '_');
                this.UploadTime = new Date(this.VideoInfoSource.createdAt);
                this.Tags = this.VideoInfoSource.tags.map((i) => i.id);
                this.FileName = this.VideoInfoSource.file.name.replace(/^\.|[\\\\/:*?\"<>|.]/img, '_');
                this.Size = this.VideoInfoSource.file.size;
                this.VideoFileSource = JSON.parse(await get(this.VideoInfoSource.fileUrl, window.location.href, await getAuth(this.VideoInfoSource.fileUrl)));
                if (isNull(this.VideoFileSource) || !(this.VideoFileSource instanceof Array) || this.VideoFileSource.length < 1) {
                    throw new Error('获取视频源失败');
                }
                this.getDownloadQuality = () => {
                    let priority = {
                        'Source': 100,
                        '540': 2,
                        '360': 1
                    };
                    return this.VideoFileSource.sort((a, b) => priority[b.name] - priority[a.name])[0].name;
                };
                this.getDownloadUrl = () => {
                    let fileList = this.VideoFileSource.filter(x => x.name == this.getDownloadQuality());
                    return decodeURIComponent('https:' + fileList[Math.floor(Math.random() * fileList.length)].src.download);
                };
                const getCommentData = async (commentID = null, page = 0) => {
                    return JSON.parse(await get(`https://api.iwara.tv/video/${this.ID}/comments?page=${page}${notNull(commentID) && !commentID.isEmpty() ? '&parent=' + commentID : ''}`, window.location.href, await getAuth()));
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
                let toast = Toastify({
                    node: renderNode({
                        nodeType: 'div',
                        childs: [
                            {
                                nodeType: 'h3',
                                childs: `解析模块`
                            },
                            {
                                nodeType: 'p',
                                childs: [
                                    `在解析 ${this.Name}[${this.ID}] 的过程中出现问题!  `,
                                    { nodeType: 'br' },
                                    `错误信息: ${JSON.stringify(error)}`,
                                    { nodeType: 'br' },
                                    `→ 点击此处重新解析 ←`
                                ]
                            }
                        ]
                    }),
                    duration: -1,
                    newWindow: true,
                    gravity: "top",
                    position: "right",
                    stopOnFocus: true,
                    style: {
                        background: "linear-gradient(-30deg, rgb(108 0 0), rgb(215 0 0))",
                    },
                    onClick: () => {
                        analyzeDownloadTask(new Dictionary([{ key: this.ID, value: this.Name }]));
                        toast.hideToast();
                    }
                });
                toast.showToast();
                console.error(`${this.Name}[${this.ID}] ${JSON.stringify(error)}`);
                console.log(this.VideoInfoSource);
                console.log(this.VideoFileSource);
                let button = document.querySelector(`.selectButton[videoid="${this.ID}"]`);
                button && button.checked && button.click();
                videoList.remove(this.ID);
                this.State = false;
                return this;
            }
        }
    }
    function parseSearchParams(searchParams, initialObject = {}) {
        return [...searchParams.entries()].reduce((acc, [key, value]) => ({ ...acc, [key]: value }), initialObject);
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
    async function get(url, referrer = window.location.href, headers = {}) {
        if (url.split('//')[1].split('/')[0] == window.location.hostname) {
            return await (await fetch(url, {
                'headers': Object.assign({
                    'accept': 'application/json, text/plain, */*'
                }, headers),
                "referrerPolicy": "strict-origin-when-cross-origin",
                'referrer': referrer,
                'method': 'GET',
                'mode': 'cors',
                'redirect': 'follow',
                'credentials': 'omit'
            })).text();
        }
        else {
            let data = await new Promise(async (resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    headers: Object.assign({
                        'Accept': 'application/json, text/plain, */*'
                    }, headers),
                    onload: function (response) {
                        resolve(response);
                    },
                    onerror: function (error) {
                        reject(error);
                    }
                });
            });
            return data.responseText;
        }
    }
    async function post(url, body, referrer = window.location.hostname, headers = {}) {
        if (typeof body !== 'string')
            body = JSON.stringify(body);
        if (url.split('//')[1].split('/')[0] == window.location.hostname) {
            return await (await fetch(url, {
                'headers': Object.assign({
                    'accept': 'application/json, text/plain, */*'
                }, headers),
                'referrer': referrer,
                'body': body,
                'method': 'POST',
                'mode': 'cors',
                'redirect': 'follow',
                'credentials': 'include'
            })).text();
        }
        else {
            let data = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: url,
                    headers: Object.assign({
                        'Accept': 'application/json, text/plain, */*',
                        'Content-Type': 'application/json'
                    }, headers),
                    data: body,
                    onload: function (response) {
                        resolve(response);
                    },
                    onerror: function (error) {
                        reject(error);
                    }
                });
            });
            return data.responseText;
        }
    }
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
    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    function UUID() {
        let UUID = '';
        for (let index = 0; index < 8; index++) {
            UUID += (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }
        return UUID;
    }
    let config = new Config();
    let videoList = new Dictionary();
    const originFetch = fetch;
    const modifyFetch = (url, options) => {
        GM_getValue('isDebug') && console.log(`Fetch ${url}`);
        if (options.headers !== undefined) {
            for (const key in options.headers) {
                if (key.toLocaleLowerCase() == "authorization") {
                    config.authorization = options.headers[key];
                }
            }
        }
        return originFetch(url, options);
    };
    window.fetch = modifyFetch;
    window.unsafeWindow.fetch = modifyFetch;
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
                    document.querySelector('#pluginOverlay').remove();
                    window.unsafeWindow.location.reload();
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
                                        href: 'https://docs.scriptcat.org/'
                                    },
                                    childs: 'ScriptCat'
                                },
                                ' 或 ',
                                {
                                    nodeType: 'a',
                                    attributes: {
                                        href: 'https://www.tampermonkey.net/index.php?#download_gcal'
                                    },
                                    childs: 'Tampermonkey Beta'
                                },
                                '载入本脚本。'
                            ]
                        },
                        { nodeType: 'p', childs: '全局可用变量：%#Y#% (当前时间[年]) | %#M#% (当前时间[月]) | %#D#% (当前时间[日]) | %#h#% (当前时间[时]) | %#m#% (当前时间[分]) | %#s#% (当前时间[秒])' },
                        { nodeType: 'p', childs: '路径可用变量：%#TITLE#% (标题) | %#ID#% (ID) | %#AUTHOR#% (作者) | %#UploadYear#% (发布时间[年]) | %#UploadMonth#% (发布时间[月]) | %#UploadDate#% (发布时间[日]) | %#UploadHours#% (发布时间[时]) | %#UploadMinutes#% (发布时间[分]) | %#UploadSeconds#% (发布时间[秒])' },
                        { nodeType: 'p', childs: '例: %#Y#%-%#M#%-%#D#%_%#TITLE#%[%#ID#%].MP4' },
                        { nodeType: 'p', childs: '结果: ' + '%#Y#%-%#M#%-%#D#%_%#TITLE#%[%#ID#%].MP4'.replaceNowTime().replace('%#TITLE#%', '演示标题').replace('%#ID#%', '演示ID'), },
                        { nodeType: 'p', childs: '打开i站后等待加载出视频后, 点击侧边栏中“开关选择”开启下载复选框' },
                        { nodeType: 'p', childs: '插件下载视频前会检查视频简介，如果在简介中发现疑似第三方下载链接，将会在控制台提示，您可以手动打开视频页面选择。' },
                        { nodeType: 'p', childs: '手动下载需要您提供视频ID!' }
                    ]
                },
                {
                    nodeType: 'div',
                    className: 'checkbox-container',
                    childs: [
                        {
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
                        },
                        {
                            nodeType: 'label',
                            className: 'checkbox-label',
                            attributes: {
                                for: 'agree-checkbox'
                            },
                            childs: '我已知晓如何使用',
                        },
                    ],
                },
                confirmButton
            ]
        }));
    }
    async function getAuth(url) {
        return Object.assign({
            'Cooike': config.cookies.map((i) => `${i.name}:${i.value}`).join('; '),
            'Authorization': config.authorization
        }, notNull(url) && !url.isEmpty() ? { 'X-Version': await getXVersion(url) } : {});
    }
    async function addDownloadTask() {
        let data = prompt('请输入需要下载的视频ID! (若需要批量下载请用 "|" 分割ID, 例如: AAAAAAAAAA|BBBBBBBBBBBB|CCCCCCCCCCCC... )', '');
        if (notNull(data) && !data.isEmpty()) {
            let IDList = new Dictionary();
            data.toLowerCase().split('|').map(ID => ID.match(/((?<=(\[)).*?(?=(\])))/g)?.pop() ?? ID.match(/((?<=(\_)).*?(?=(\_)))/g)?.pop() ?? ID).filter(Boolean).map(ID => IDList.set(ID, '手动解析'));
            analyzeDownloadTask(IDList);
        }
    }
    async function analyzeDownloadTask(list = videoList) {
        for (const key in list.items) {
            await delay(random(10, 200)); //脚本太快了,延迟一下防止被屏蔽
            let videoInfo = await (new VideoInfo(list[key])).init(key);
            if (videoInfo.State) {
                await pustDownloadTask(videoInfo);
                let button = document.querySelector(`.selectButton[videoid="${key}"]`);
                button && button.checked && button.click();
                list.remove(key);
            }
        }
    }
    /**
      * 检查字符串中是否包含下载链接特征
      * @param {string} comment - 待检查的字符串
      * @returns {boolean} - 如果字符串中包含下载链接特征则返回 true，否则返回 false
      */
    function checkIsHaveDownloadLink(comment) {
        if (!config.checkDownloadLink) {
            return false;
        }
        if (comment == null) {
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
            if (comment.indexOf(downloadLinkCharacteristics[index]) != -1) {
                return true;
            }
        }
        return false;
    }
    async function pustDownloadTask(videoInfo) {
        if (config.checkDownloadLink && checkIsHaveDownloadLink(videoInfo.Comments)) {
            let toast = Toastify({
                node: renderNode({
                    nodeType: 'div',
                    childs: [
                        {
                            nodeType: 'h3',
                            childs: `创建下载任务`
                        },
                        {
                            nodeType: 'p',
                            childs: [
                                `在创建 ${videoInfo.Name}[${videoInfo.ID}] 下载任务过程中发现疑似高画质下载连接! `, { nodeType: 'br' }, `→ 点击此处，进入视频页面 ←`
                            ]
                        }
                    ]
                }),
                duration: -1,
                newWindow: true,
                gravity: "top",
                position: "right",
                stopOnFocus: true,
                style: {
                    background: "linear-gradient(-30deg, rgb(119 76 0), rgb(255 165 0))"
                },
                onClick: () => {
                    GM_openInTab(`https://www.iwara.tv/video/${videoInfo.ID}`, { active: true, insert: true, setParent: true });
                    toast.hideToast();
                }
            });
            toast.showToast();
            console.warn(`${videoInfo.Name}[${videoInfo.ID}] 发现疑似高画质下载连接, 点击进入视频页面 https://www.iwara.tv/video/${videoInfo.ID}`);
            return;
        }
        if (videoInfo.getDownloadQuality() != 'Source') {
            let toast = Toastify({
                node: renderNode({
                    nodeType: 'div',
                    childs: [
                        {
                            nodeType: 'h3',
                            childs: `创建下载任务`
                        },
                        {
                            nodeType: 'p',
                            childs: [
                                `在创建 ${videoInfo.Name}[${videoInfo.ID}] 下载任务过程中发现无原画下载地址! `, { nodeType: 'br' }, `→ 点击此处，进入视频页面 ←`
                            ]
                        }
                    ]
                }),
                duration: -1,
                newWindow: true,
                gravity: "top",
                position: "right",
                stopOnFocus: true,
                style: {
                    background: "linear-gradient(-30deg, rgb(119 76 0), rgb(255 165 0))"
                },
                onClick: () => {
                    GM_openInTab(`https://www.iwara.tv/video/${videoInfo.ID}`, { active: true, insert: true, setParent: true });
                    toast.hideToast();
                }
            });
            toast.showToast();
            console.warn(`${videoInfo.Name}[${videoInfo.ID}] 无法解析到原画下载地址 https://www.iwara.tv/video/${videoInfo.ID}`);
            return;
        }
        switch (config.downloadType) {
            case DownloadType.Aria2:
                aria2Download(videoInfo);
                break;
            case DownloadType.IwaraDownloader:
                iwaraDownloaderDownload(videoInfo);
                break;
            default:
                othersDownload(videoInfo);
                break;
        }
    }
    function analyzeLocalPath(path) {
        let matchPath = path.match(/^([a-zA-Z]:)?[\/\\]?([^\/\\]+[\/\\])*([^\/\\]+\.\w+)$/) || '';
        return {
            fullPath: matchPath[0],
            drive: matchPath[1] || '',
            directories: matchPath[2].split(/[\/\\]/),
            filename: matchPath[3],
            match: matchPath !== null
        };
    }
    async function aria2Check() {
        try {
            let res = JSON.parse(await post(config.aria2Path, {
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
            let toast = Toastify({
                node: renderNode({
                    nodeType: 'div',
                    childs: [
                        {
                            nodeType: 'h3',
                            childs: `Aria2 RPC 连接测试`
                        },
                        {
                            nodeType: 'p',
                            childs: [
                                `无法保存配置, 请检查配置是否正确。`, { nodeType: 'br' },
                                `错误信息：${JSON.stringify(error)}`
                            ]
                        }
                    ]
                }),
                duration: -1,
                newWindow: true,
                gravity: "top",
                position: "center",
                stopOnFocus: true,
                style: {
                    background: "linear-gradient(-30deg, rgb(108 0 0), rgb(215 0 0))",
                },
                onClick: () => {
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
            let res = JSON.parse(await post(config.iwaraDownloaderPath, Object.assign({
                'ver': 1,
                'code': 'State'
            }, config.iwaraDownloaderToken.isEmpty() ? {} : { 'token': config.iwaraDownloaderToken })));
            if (res.code !== 0) {
                throw new Error(res.msg);
            }
        }
        catch (error) {
            let toast = Toastify({
                node: renderNode({
                    nodeType: 'div',
                    childs: [
                        {
                            nodeType: 'h3',
                            childs: `IwaraDownloader RPC 连接测试`
                        },
                        {
                            nodeType: 'p',
                            childs: [
                                `无法保存配置, 请检查配置是否正确。`, { nodeType: 'br' },
                                `错误信息：${JSON.stringify(error)}`
                            ]
                        }
                    ]
                }),
                duration: -1,
                newWindow: true,
                gravity: "top",
                position: "center",
                stopOnFocus: true,
                style: {
                    background: "linear-gradient(-30deg, rgb(108 0 0), rgb(215 0 0))",
                },
                onClick: () => {
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
                            'Cookie:' + config.cookies.map((i) => `${i.name}:${i.value}`).join('; '),
                            'Authorization:' + config.authorization
                        ]
                    })
                ]
            });
            console.log(`${name} 已推送到Aria2 ${await post(config.aria2Path, json)}`);
            Toastify({
                text: `${videoInfo.Name}[${videoInfo.ID}] 已推送到Aria2`,
                duration: 2000,
                newWindow: true,
                gravity: "top",
                position: "right",
                stopOnFocus: true
            }).showToast();
        }(videoInfo.ID, videoInfo.Author, videoInfo.Name, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.getDownloadUrl()));
    }
    function iwaraDownloaderDownload(videoInfo) {
        (async function (ID, Author, Name, UploadTime, Info, Tag, DownloadUrl, Size) {
            let r = JSON.parse(await post(config.iwaraDownloaderPath, Object.assign({
                'ver': 1,
                'code': 'add',
                'data': Object.assign({
                    'Source': ID,
                    'author': Author,
                    'name': Name,
                    'downloadTime': new Date(),
                    'uploadTime': UploadTime,
                    'downloadUrl': DownloadUrl,
                    'downloadCookies': config.cookies,
                    'authorization': config.authorization,
                    'size': Size,
                    'info': Info,
                    'tag': Tag
                }, config.downloadPath.isEmpty() ? {} : {
                    'path': config.downloadPath.replaceNowTime().replaceUploadTime(UploadTime).replaceVariable({
                        AUTHOR: Author,
                        ID: ID,
                        TITLE: Name
                    })
                })
            }, config.iwaraDownloaderToken.isEmpty() ? {} : { 'token': config.iwaraDownloaderToken })));
            if (r.code == 0) {
                console.log("已推送" + ID);
                Toastify({
                    text: `${videoInfo.Name}[${videoInfo.ID}] 已推送到IwaraDownloader`,
                    duration: 2000,
                    newWindow: true,
                    gravity: "top",
                    position: "right",
                    stopOnFocus: true
                }).showToast();
            }
            else {
                let toast = Toastify({
                    node: renderNode({
                        nodeType: 'div',
                        childs: [
                            {
                                nodeType: 'h3',
                                childs: `推送下载任务`
                            },
                            {
                                nodeType: 'p',
                                childs: [
                                    `在推送 ${videoInfo.Name}[${videoInfo.ID}] 下载任务到IwaraDownloader过程中出现错误! `,
                                    { nodeType: 'br' },
                                    `错误信息: ${r.msg}`
                                ]
                            }
                        ]
                    }),
                    duration: -1,
                    newWindow: true,
                    gravity: "top",
                    position: "right",
                    stopOnFocus: true,
                    style: {
                        background: "linear-gradient(-30deg, rgb(108 0 0), rgb(215 0 0))",
                    },
                    onClick: () => {
                        toast.hideToast();
                    }
                });
                toast.showToast();
                console.log("推送失败" + ID);
            }
        }(videoInfo.ID, videoInfo.Author, videoInfo.Name, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.getDownloadUrl(), videoInfo.Size));
    }
    function othersDownload(videoInfo) {
        (async function (ID, Author, Name, UploadTime, Info, Tag, DownloadUrl) {
            GM_openInTab(DownloadUrl, { active: true, insert: true, setParent: true });
        }(videoInfo.ID, videoInfo.Author, videoInfo.Name, videoInfo.UploadTime, videoInfo.Comments, videoInfo.Tags, videoInfo.getDownloadUrl()));
    }
    document.head.appendChild(renderNode({
        nodeType: 'link',
        attributes: {
            rel: 'stylesheet',
            type: 'text/css',
            href: 'https://cdn.staticfile.org/toastify-js/1.12.0/toastify.min.css'
        }
    }));
    GM_addStyle(`
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
        transition: transform 0.5s cubic-bezier(0.68, -0.24, 0.265, 1.20);
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

    #pluginOverlay .checkbox-container {
        display: flex;
        align-items: center;
    }

    #pluginOverlay .checkbox-label {
        color: white;
        font-size: 18px;
        margin-left: 10px;
    }

    .selectButton {
        position: absolute;
        width: 38px;
        height: 38px;
        bottom: 24px;
        right: 0px;
    }

    .toastify h3 {
        margin: 0 0 10px 0;
    }
    .toastify p {
        margin: 0 ;
    }
    `);
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
                            if (!document.querySelector('.selectButton')) {
                                //console.clear()
                                console.log("开始注入复选框 预计注入" + document.querySelectorAll('.videoTeaser .videoTeaser__thumbnail').length + "个复选框");
                                document.querySelectorAll('.videoTeaser .videoTeaser__thumbnail').forEach((element) => {
                                    element.appendChild(renderNode({
                                        nodeType: "input",
                                        attributes: Object.assign(videoList.has(element.getAttribute('href').trim().split('/')[2]) ? { checked: true } : {}, {
                                            type: "checkbox",
                                            videoid: element.getAttribute('href').trim().split('/')[2]
                                        }),
                                        className: 'selectButton',
                                        events: {
                                            click: (event) => {
                                                let target = event.target;
                                                let id = element.getAttribute('href').trim().split('/')[2];
                                                let name = element.parentElement.querySelector('.videoTeaser__title').getAttribute('title');
                                                target.checked ? videoList.set(id, name) : videoList.remove(id);
                                                event.stopPropagation();
                                                event.stopImmediatePropagation();
                                                return false;
                                            }
                                        }
                                    }));
                                });
                            }
                            else {
                                console.log("移除复选框");
                                document.querySelectorAll('.selectButton').forEach((element) => {
                                    videoList.remove(element.parentElement.getAttribute('href').trim().split('/')[2]);
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
    Toastify({
        text: `Iwara 批量下载工具加载完成`,
        duration: 10000,
        newWindow: true,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: "#1E90FF",
        }
    }).showToast();
})();
//# sourceMappingURL=IwaraDownloadTool.user.js.map