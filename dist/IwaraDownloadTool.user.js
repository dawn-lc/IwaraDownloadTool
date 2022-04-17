// ==UserScript==
// @name              Iwara Download Tool
// @description       Download videos from iwara.tv
// @name:ja           Iwara バッチダウンローダー
// @description:ja    Iwara 動画バッチをダウンロード
// @name:zh-CN        Iwara 批量下载工具
// @description:zh-CN 批量下载 Iwara 视频
// @icon              https://iwara.tv/sites/all/themes/main/img/logo.png
// @namespace         https://github.com/dawn-lc/user.js
// @version           2.1.30
// @author            dawn-lc
// @license           Apache-2.0
// @copyright         2022, Dawnlc (https://dawnlc.me/)
// @source            https://github.com/dawn-lc/user.js
// @supportURL        https://github.com/dawn-lc/user.js/issues
// @updateURL         https://github.com/dawn-lc/user.js/raw/master/dist/IwaraDownloadTool.mata.js
// @downloadURL       https://github.com/dawn-lc/user.js/raw/master/dist/IwaraDownloadTool.user.js
// @connect           iwara.tv
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
// @require           https://lf6-cdn-tos.bytecdntp.com/cdn/expire-1-M/react/16.13.1/umd/react.production.min.js
// @require           https://lf26-cdn-tos.bytecdntp.com/cdn/expire-1-M/react-dom/16.13.1/umd/react-dom.production.min.js
// ==/UserScript==
(async function () {
    function UUID() {
        let UUID = '';
        for (let index = 0; index < 8; index++) {
            UUID += (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }
        return UUID;
    }
    function getType(obj) {
        return Object.prototype.toString.call(obj).split(' ')[1].slice(0, -1);
    }
    function sourceRender(vdata) {
        let RenderDOM;
        if (vdata instanceof Array)
            return vdata.map((item) => sourceRender(item));
        for (const item in vdata) {
            switch (item) {
                case 'nodeType':
                    RenderDOM = document.createElement(vdata.nodeType);
                    break;
                case 'attribute':
                    for (const key in vdata.attribute) {
                        RenderDOM.setAttribute(key, vdata.attribute[key]);
                    }
                    break;
                case 'className':
                    if (getType(vdata.className) == 'Array') {
                        RenderDOM.className = vdata.className.join(' ');
                    }
                    else {
                        RenderDOM.className = vdata.className.toString();
                    }
                    break;
                case 'childs':
                    switch (getType(vdata.childs)) {
                        case 'Array':
                            vdata.childs.forEach((child) => {
                                if (child instanceof HTMLElement) {
                                    RenderDOM.appendChild(child);
                                }
                                else if (getType(child) == 'string') {
                                    RenderDOM.insertAdjacentHTML('beforeend', child);
                                }
                                else {
                                    RenderDOM.appendChild(sourceRender(child));
                                }
                            });
                            break;
                        case 'String':
                            RenderDOM.insertAdjacentHTML('beforeend', vdata.childs);
                            break;
                        default:
                            RenderDOM.appendChild(sourceRender(vdata.childs));
                            break;
                    }
                    break;
                case 'parent':
                    vdata.parent.appendChild(RenderDOM);
                    break;
                case 'before':
                    vdata.before.insertBefore(RenderDOM, vdata.before.childNodes[0]);
                    break;
                default:
                    if (vdata[item] instanceof Object && RenderDOM[item]) {
                        Object.entries(vdata[item]).forEach(([k, v]) => {
                            RenderDOM[item][k] = v;
                        });
                    }
                    else {
                        RenderDOM[item] = vdata[item];
                    }
                    break;
            }
        }
        return RenderDOM;
    }
    function reactRender(vdata, index) {
        let VirtualDOM;
        if (vdata != null && vdata.nodeType != undefined) {
            VirtualDOM = { type: vdata.nodeType };
            delete vdata.nodeType;
            if (vdata.childs != undefined) {
                if (VirtualDOM.children == undefined)
                    VirtualDOM.children = [];
                if (vdata.childs instanceof Array) {
                    VirtualDOM.children = React.Children.toArray(vdata.childs.map((item) => reactRender(item)));
                }
                else {
                    VirtualDOM.children.push(reactRender(vdata.childs));
                }
                delete vdata.childs;
            }
            if (VirtualDOM.props == undefined)
                VirtualDOM.props = {};
            if (vdata.className != undefined) {
                VirtualDOM.props = Object.assign({ className: vdata.className }, VirtualDOM.props);
                delete vdata.className;
            }
            if (vdata.attribute != undefined) {
                VirtualDOM.props = Object.assign(vdata.attribute, VirtualDOM.props);
                delete vdata.attribute;
            }
            if (index != undefined)
                VirtualDOM.props = Object.assign({ key: index }, VirtualDOM.props);
            for (const key in vdata) {
                VirtualDOM.props[key] = vdata[key];
                delete vdata[key];
            }
        }
        else {
            return vdata;
        }
        return React.createElement(VirtualDOM.type, VirtualDOM.props, VirtualDOM.children || undefined);
    }
    async function get(url, parameter = [], referrer = window.location.hostname, headers = {}) {
        url += '?';
        for (var key in parameter) {
            url += key + '=' + parameter[key] + '&';
        }
        url = url.substring(0, url.length - 1);
        let responseData;
        if (url.split('//')[1].split('/')[0] == window.location.hostname) {
            responseData = await fetch(url, {
                'headers': Object.assign({
                    'accept': 'application/json, text/plain, */*',
                    'cache-control': 'no-cache',
                    'content-type': 'application/x-www-form-urlencoded',
                }, headers),
                'referrer': referrer,
                'method': 'GET',
                'mode': 'cors',
                'redirect': 'follow',
                'credentials': 'include'
            });
            if (responseData.status >= 200 && responseData.status < 300) {
                const contentType = responseData.headers.get('Content-Type');
                if (contentType != null) {
                    if (contentType.indexOf('text') > -1) {
                        return await responseData.text();
                    }
                    if (contentType.indexOf('form') > -1) {
                        return await responseData.formData();
                    }
                    if (contentType.indexOf('video') > -1) {
                        return await responseData.blob();
                    }
                    if (contentType.indexOf('json') > -1) {
                        return await responseData.json();
                    }
                }
                return responseData;
            }
        }
        else {
            responseData = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    headers: Object.assign({
                        'accept': 'application/json, text/plain, */*',
                        'cache-control': 'no-cache',
                        'content-type': 'application/x-www-form-urlencoded',
                    }, headers),
                    onload: function (response) {
                        resolve(response);
                    },
                    onerror: function (error) {
                        reject(error);
                    }
                });
            });
            if (responseData.status >= 200 && responseData.status < 300) {
                let headers = new Map();
                responseData.responseHeaders.split('\r\n').forEach((element) => {
                    element = element.split(': ');
                    headers.set(element[0], element[1]);
                });
                responseData.headers = headers;
                return responseData;
            }
        }
    }
    async function post(url, parameter, referrer = window.location.href) {
        if (typeof parameter == 'object')
            parameter = JSON.stringify(parameter);
        let responseData = await fetch(url, {
            'headers': {
                'accept': 'application/json, text/plain, */*',
                'cache-control': 'no-cache',
                'content-type': 'application/x-www-form-urlencoded',
            },
            'referrer': referrer,
            'body': parameter,
            'method': 'POST',
            'mode': 'cors',
            'redirect': 'follow',
            'credentials': 'include'
        });
        if (responseData.status >= 200 && responseData.status < 300) {
            const contentType = responseData.headers.get('Content-Type');
            if (contentType != null) {
                if (contentType.indexOf('text') > -1) {
                    return await responseData.text();
                }
                if (contentType.indexOf('form') > -1) {
                    return await responseData.formData();
                }
                if (contentType.indexOf('video') > -1) {
                    return await responseData.blob();
                }
                if (contentType.indexOf('json') > -1) {
                    return await responseData.json();
                }
            }
            return responseData.text();
        }
    }
    function parseDom(dom) {
        return new DOMParser().parseFromString(dom, 'text/html');
    }
    function getQueryVariable(query, variable) {
        let vars = query.split('&');
        for (let i = 0; i < vars.length; i++) {
            let pair = vars[i].split('=');
            if (pair[0] == variable) {
                return pair[1];
            }
        }
        return null;
    }
    let DownloadType;
    (function (DownloadType) {
        DownloadType[DownloadType["aria2"] = 0] = "aria2";
        DownloadType[DownloadType["default"] = 1] = "default";
        DownloadType[DownloadType["others"] = 2] = "others";
    })(DownloadType || (DownloadType = {}));
    let TipsType;
    (function (TipsType) {
        TipsType[TipsType["Info"] = 0] = "Info";
        TipsType[TipsType["Warning"] = 1] = "Warning";
        TipsType[TipsType["Success"] = 2] = "Success";
        TipsType[TipsType["Progress"] = 3] = "Progress";
    })(TipsType || (TipsType = {}));
    class Queue {
        queue;
        push;
        pop;
        remove;
        length;
        clear;
        constructor() {
            this.queue = [];
            this.push = function (data) {
                this.queue.unshift(data);
            };
            this.pop = function () {
                return this.queue.pop();
            };
            this.remove = function (id) {
                let index = this.queue.indexOf(id);
                if (index > -1) {
                    this.queue.splice(index, 1);
                }
            };
            this.length = function () {
                return this.queue.length;
            };
            this.clear = function () {
                this.queue = [];
            };
        }
    }
    class pluginTips {
        WaitingQueue;
        DownloadingQueue;
        static typeIcon = {
            Info: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
            Warning: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
            Success: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
            Progress: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>'
        };
        static Container = sourceRender({
            nodeType: 'section',
            attribute: {
                id: 'PluginTips'
            },
            className: 'tipsContainer',
            parent: document.body
        });
        constructor() {
            this.DownloadingQueue = new Queue();
            this.WaitingQueue = new Queue();
        }
        downloadComplete(id, name) {
            this.DownloadingQueue.remove(id);
            pluginTips.Container.children.namedItem(id).remove();
            if (this.WaitingQueue.length() > 0) {
                let downloadTask = this.WaitingQueue.pop();
                if (GM_info.downloadMode == 'native') {
                    this.progress(downloadTask.name + ' 下载中...', { id: downloadTask.id });
                }
                else {
                    this.info('下载', downloadTask.name + ' 已开始下载!');
                }
                this.DownloadingQueue.push(downloadTask.task);
                GM_download(downloadTask.task);
            }
        }
        downloading(id, value) {
            let downloadTask = pluginTips.Container.children.namedItem(id).querySelector('.value');
            downloadTask.setAttribute('value', value.toFixed(2));
            downloadTask.style.width = value.toFixed(2) + '%';
        }
        info(title, content, wait = false) {
            console.info('Iwara 批量下载工具', content);
            new tips(TipsType.Info, title, content, wait);
        }
        warning(title, content, wait = false) {
            console.warn('Iwara 批量下载工具', content);
            new tips(TipsType.Warning, title, content, wait);
        }
        success(title, content, wait = false) {
            console.log('Iwara 批量下载工具', content);
            new tips(TipsType.Success, title, content, wait);
        }
        progress(title, content) {
            new tips(TipsType.Progress, title, {
                nodeType: 'div',
                className: 'Progress',
                childs: [{
                        nodeType: 'div',
                        className: 'value',
                        attribute: {
                            value: 0
                        }
                    }]
            }, true, content.id);
        }
    }
    class tips {
        id;
        type;
        wait;
        constructor(type, title, content, wait = false, id = null) {
            this.type = type;
            this.id = id;
            this.wait = wait;
            sourceRender(Object.assign({
                nodeType: 'div',
                childs: [{
                        nodeType: 'div',
                        className: 'tipsIcon',
                        innerHTML: pluginTips.typeIcon[TipsType[type]]
                    }, {
                        nodeType: 'div',
                        className: 'tipsContent',
                        childs: [{
                                nodeType: 'h2',
                                childs: title
                            }, {
                                nodeType: 'p',
                                childs: content
                            }]
                    }],
                parent: pluginTips.Container
            }, this.style(), this.attribute(), this.event()));
        }
        event() {
            return {
                onclick: (e) => {
                    if (this.wait) {
                        if (this.type != TipsType.Progress) {
                            e.currentTarget.remove();
                        }
                    }
                    else {
                        e.currentTarget.remove();
                    }
                },
                onanimationend: (e) => {
                    if (!this.wait) {
                        e.currentTarget.remove();
                    }
                }
            };
        }
        style() {
            let style = {
                className: ['tips']
            };
            style.className.push('tips' + TipsType[this.type]);
            if (this.wait) {
                style.className.push('tipsWait');
            }
            else {
                style.className.push('tipsActive');
            }
            return style;
        }
        attribute() {
            if (this.id != undefined) {
                return {
                    attribute: {
                        id: this.id
                    }
                };
            }
            else {
                return {};
            }
        }
    }
    class VideoInfo {
        Url;
        ID;
        Page;
        Source;
        Private = true;
        getAuthor;
        getName;
        getDownloadQuality;
        getDownloadUrl;
        getSourceFileName;
        getComment;
        getLock;
        getFileName;
        constructor(videoID) {
            this.ID = videoID.toLowerCase();
            this.Url = 'https://' + window.location.hostname + '/videos/' + this.ID;
            return this;
        }
        async init(cooike = {}) {
            try {
                this.Page = parseDom(await get(this.Url, [], window.location.href, cooike));
                if (this.Page.querySelector('.well') == null) {
                    this.Private = false;
                }
                else {
                    if (cooike['cooike'] == undefined)
                        await this.init({ 'cooike': Cookies });
                    return;
                }
                this.Source = await get('https://' + window.location.hostname + '/api/video/' + this.ID, [], this.Url, cooike);
                this.getAuthor = function () {
                    return this.Page.querySelector('.submitted').querySelector('a.username').innerText.replace(/[\\\\/:*?\"<>|.]/g, '_');
                };
                this.getName = function () {
                    return this.Page.querySelector('.submitted').querySelector('h1.title').innerText.replace(/[\\\\/:*?\"<>|.]/g, '_');
                };
                this.getFileName = function () {
                    return replaceVar(PluginControlPanel.state.FileName).replace('%#TITLE#%', this.getName()).replace('%#ID#%', this.ID).replace('%#AUTHOR#%', this.getAuthor()).replace('%#SOURCE_NAME#%', this.getSourceFileName());
                };
                this.getDownloadQuality = function () {
                    if (this.Source.length == 0)
                        return 'null';
                    return this.Source[0].resolution;
                };
                this.getDownloadUrl = function () { return decodeURIComponent('https:' + this.Source.find(x => x.resolution == this.getDownloadQuality()).uri); };
                this.getSourceFileName = function () { return getQueryVariable(this.getDownloadUrl(), 'file').split('/')[3]; };
                this.getComment = function () {
                    let commentNode;
                    try {
                        commentNode = Array.from(this.Page.querySelector('.node-info').querySelector('.field-type-text-with-summary.field-label-hidden').querySelectorAll('.field-item.even'));
                    }
                    catch (error) {
                        return '';
                    }
                    return commentNode.map((element) => element.innerText).join('\n');
                };
            }
            catch (error) {
                PluginTips.warning('解析模块', '视频信息解析失败：' + error.toString(), true);
            }
        }
    }
    class pluginUI extends React.Component {
        showCondition;
        constructor(props) {
            super(props);
            this.showCondition = false;
            this.state = {
                style: {
                    base: { cursor: 'pointer' },
                    disable: { display: 'none' }
                },
                main: 'btn-group',
                downloadAllEnable: false,
                downloadSelectedEnable: false
            };
        }
        show() {
            this.showCondition = true;
            this.setState({
                main: 'btn-group open'
            });
        }
        hide() {
            this.showCondition = false;
            this.setState({
                main: 'btn-group'
            });
        }
        downloadAllEnabled() {
            this.setState({
                downloadAllEnable: true
            });
        }
        downloadSelectedEnabled() {
            this.setState({
                downloadSelectedEnable: true
            });
        }
        render() {
            return (reactRender({
                nodeType: 'div',
                className: this.state.main,
                childs: [{
                        nodeType: 'button',
                        className: 'btn btn-primary btn-sm dropdown-toggle',
                        attribute: {
                            type: 'button',
                            id: 'PluginUIStartUp',
                            title: '批量下载'
                        },
                        childs: [{
                                nodeType: 'span',
                                className: 'glyphicon glyphicon-download-alt'
                            }, '批量下载'],
                        onClick: () => { if (this.showCondition) {
                            this.hide();
                        }
                        else {
                            this.show();
                        } }
                    },
                    {
                        nodeType: 'ul',
                        className: 'dropdown-menu',
                        attribute: {
                            role: 'menu'
                        },
                        childs: [
                            this.state.downloadSelectedEnable ? {
                                nodeType: 'li',
                                attribute: {
                                    style: this.state.style.base,
                                    dangerouslySetInnerHTML: { __html: '<a><span class="glyphicon glyphicon-check"></span>下载所选</a>' }
                                },
                                onClick: () => {
                                    this.hide();
                                    DownloadSelected();
                                }
                            } : null,
                            this.state.downloadAllEnable ? {
                                nodeType: 'li',
                                attribute: {
                                    style: this.state.style.base,
                                    dangerouslySetInnerHTML: { __html: '<a><span class="glyphicon glyphicon-save"></span>下载所有</a>' }
                                },
                                onClick: () => {
                                    this.hide();
                                    DownloadAll();
                                }
                            } : null,
                            {
                                nodeType: 'li',
                                attribute: {
                                    style: this.state.style.base,
                                    dangerouslySetInnerHTML: { __html: '<a><span class="glyphicon glyphicon-edit"></span>手动下载</a>' }
                                },
                                onClick: () => {
                                    this.hide();
                                    ManualParseDownloadAddress();
                                }
                            }, {
                                nodeType: 'li',
                                attribute: {
                                    style: this.state.style.base,
                                    dangerouslySetInnerHTML: { __html: '<a><span class="glyphicon glyphicon-cog"></span>设置</a>' }
                                },
                                onClick: () => {
                                    this.hide();
                                    PluginControlPanel.show();
                                }
                            }
                        ]
                    }]
            }));
        }
    }
    class pluginControlPanel extends React.Component {
        Initialize;
        Cookies;
        synclistener;
        Aria2WebSocket;
        constructor(props) {
            super(props);
            this.Cookies = GM_getValue('Cookies', null);
            this.Initialize = GM_getValue('Initialize', false);
            this.synclistener = [];
            this.state = {
                Async: GM_getValue('Async', false),
                AutoRefresh: GM_getValue('AutoRefresh', false),
                DownloadType: Number(GM_getValue('DownloadType', DownloadType.others)),
                DownloadDir: GM_getValue('DownloadDir', '/%#AUTHOR#%'),
                DownloadProxy: GM_getValue('DownloadProxy', ''),
                WebSocketAddress: GM_getValue('WebSocketAddress', 'wss://127.0.0.1:6800/'),
                WebSocketToken: GM_getValue('WebSocketToken', ''),
                WebSocketID: GM_getValue('WebSocketID', UUID()),
                FileName: GM_getValue('FileName', '%#TITLE#%[%#ID#%].mp4'),
                style: {
                    radioLabel: { margin: '0px 20px 0px 0px' },
                    Line: { margin: '10px 0px', display: 'flex', alignItems: 'center' },
                    inputLabel: {
                        marginRight: '8px',
                        marginBottom: '0px',
                        verticalAlign: 'middle',
                        lineHeight: '1.2'
                    },
                    input: {
                        flex: 1,
                        minWidth: 0,
                        font: 'menu',
                        verticalAlign: 'middle'
                    },
                    main: { display: 'none' }
                }
            };
            if (!this.Initialize) {
                for (const key in this.state) {
                    if (key != 'style') {
                        GM_setValue(key, this.state[key]);
                    }
                }
                this.Initialize = true;
                GM_setValue('Initialize', this.Initialize);
            }
            if (document.querySelector('.user-btn') != null || this.Cookies == null) {
                this.getCookies();
            }
        }
        getCookies() {
            try {
                GM_cookie('list', { domain: 'iwara.tv', httpOnly: true }, (list, error) => {
                    let newCookies = document.cookie;
                    if (error) {
                        PluginTips.warning('注意', '获取账号信息失败！<br />请检查脚本加载器配置！<br />错误：' + error.toString(), true);
                    }
                    else {
                        for (let index = 0; index < list.length; index++) {
                            const Cookie = list[index];
                            if (Cookie.httpOnly == true)
                                newCookies += '; ' + Cookie.name + '=' + Cookie.value;
                        }
                        if (newCookies != this.Cookies) {
                            this.Cookies = newCookies;
                            GM_setValue('Cookies', this.Cookies);
                        }
                    }
                });
            }
            catch (error) {
                PluginTips.warning('注意', '获取账号信息失败！<br />如需下载私有(上锁)视频，请尝试使用Tampermonkey Beta载入本脚本。<br />错误：' + error.toString());
            }
        }
        show() {
            this.setState((state) => {
                return {
                    style: Object.assign(state.style, {
                        main: { display: 'block' }
                    })
                };
            });
        }
        hide() {
            switch (this.state.DownloadType) {
                case DownloadType.aria2:
                    if (this.Aria2WebSocket != undefined) {
                        this.Aria2WebSocket.close();
                    }
                    this.ConnectionWebSocket();
                    this.setState((state) => {
                        return {
                            style: Object.assign(state.style, {
                                main: { display: 'none' }
                            })
                        };
                    });
                    break;
                default:
                    this.setState((state) => {
                        return {
                            style: Object.assign(state.style, {
                                main: { display: 'none' }
                            })
                        };
                    });
                    break;
            }
        }
        componentDidMount() {
            let values = GM_listValues();
            for (let index = 0; index < values.length; index++) {
                this.synclistener.push(GM_addValueChangeListener(values[index], (name, old_value, new_value, remote) => {
                    if (remote) {
                        if (this[name] != undefined && this[name] != new_value) {
                            this[name] = new_value;
                        }
                        else {
                            if (new_value != this.state[name]) {
                                this.setState({ [name]: new_value });
                                if (name == 'DownloadType' && this.state[name] == DownloadType.aria2) {
                                    if (this.Aria2WebSocket != undefined) {
                                        this.Aria2WebSocket.close();
                                    }
                                    this.ConnectionWebSocket();
                                }
                            }
                        }
                    }
                }));
            }
        }
        componentWillUnmount() {
            this.Aria2WebSocket.close();
            for (let index = 0; index < this.synclistener.length; index++) {
                GM_removeValueChangeListener(this.synclistener[index]);
            }
        }
        ConnectionWebSocket() {
            try {
                PluginTips.info('Aria2 RPC', '正在连接...');
                this.Aria2WebSocket = new WebSocket(this.state.WebSocketAddress + 'jsonrpc');
                this.Aria2WebSocket.onopen = wsopen;
                this.Aria2WebSocket.onmessage = wsmessage;
                this.Aria2WebSocket.onclose = wsclose;
            }
            catch (err) {
                this.Initialize = false;
                PluginTips.warning('Aria2 RPC', '连接 Aria2 RPC 时出现错误! <br />请检查Aria2 RPC WebSocket地址是否正确(尽量使用wss而非ws) <br />' + err);
            }
            function wsopen() {
                PluginTips.success('Aria2 RPC', '连接成功!');
            }
            function wsmessage() {
                //todo 接收信息
            }
            function wsclose() {
                PluginTips.warning('Aria2 RPC', '连接断开! <br />请检查Aria2 RPC WebSocket地址是否正确(尽量使用wss而非ws)');
            }
        }
        configChange(e) {
            this.setState({ [e.name]: e.value });
            if (e.name == 'DownloadType' && e.value == DownloadType.aria2) {
                if (this.Aria2WebSocket != undefined) {
                    this.Aria2WebSocket.close();
                }
                this.ConnectionWebSocket();
            }
            GM_setValue(e.name, e.value);
        }
        render() {
            return (reactRender({
                nodeType: 'div',
                className: 'controlPanel',
                attribute: {
                    style: this.state.style.main
                },
                childs: [{
                        nodeType: 'div',
                        className: 'controlPanel-content',
                        childs: [{
                                nodeType: 'span',
                                className: 'controlPanelClose',
                                childs: '❌',
                                onClick: () => {
                                    this.hide();
                                }
                            },
                            {
                                nodeType: 'div',
                                childs: [{
                                        nodeType: 'div',
                                        style: this.state.style.Line,
                                        childs: [{
                                                nodeType: 'label',
                                                style: this.state.style.radioLabel,
                                                childs: '下载方式:'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'DownloadType',
                                                type: 'radio',
                                                value: DownloadType.aria2,
                                                onChange: ({ target }) => this.configChange(target)
                                            },
                                            {
                                                nodeType: 'label',
                                                style: this.state.style.radioLabel,
                                                childs: 'Aria2'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'DownloadType',
                                                type: 'radio',
                                                value: DownloadType.default,
                                                onChange: ({ target }) => this.configChange(target)
                                            },
                                            {
                                                nodeType: 'label',
                                                style: this.state.style.radioLabel,
                                                childs: '浏览器默认'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'DownloadType',
                                                type: 'radio',
                                                value: DownloadType.others,
                                                onChange: ({ target }) => this.configChange(target)
                                            },
                                            {
                                                nodeType: 'label',
                                                style: this.state.style.radioLabel,
                                                childs: '其他下载器'
                                            }].map((item) => { if (item.value == this.state.DownloadType) {
                                            item.checked = true;
                                        } return item; })
                                    },
                                    {
                                        nodeType: 'div',
                                        style: this.state.style.Line,
                                        childs: [{
                                                nodeType: 'label',
                                                style: this.state.style.inputLabel,
                                                childs: '解析模式[推荐同步模式]：',
                                                title: '异步解析可能会因为解析速度过快导致服务器拒绝回应'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'Async',
                                                type: 'button',
                                                style: this.state.style.input,
                                                attribute: {
                                                    switch: this.state.Async ? 'on' : 'off'
                                                },
                                                value: this.state.Async ? '异步' : '同步',
                                                className: 'switchButton',
                                                onClick: () => this.configChange({ name: 'Async', value: !this.state.Async })
                                            }
                                        ]
                                    }, {
                                        nodeType: 'div',
                                        style: this.state.style.Line,
                                        childs: [{
                                                nodeType: 'label',
                                                style: this.state.style.inputLabel,
                                                childs: '列表页未加载自动刷新：',
                                                title: '可能会因为自动刷新导致服务器拒绝回应'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'AutoRefresh',
                                                type: 'button',
                                                style: this.state.style.input,
                                                attribute: {
                                                    switch: this.state.AutoRefresh ? 'on' : 'off'
                                                },
                                                value: this.state.AutoRefresh ? '开启' : '关闭',
                                                className: 'switchButton',
                                                onClick: () => this.configChange({ name: 'AutoRefresh', value: !this.state.AutoRefresh })
                                            }
                                        ]
                                    },
                                    this.state.DownloadType != DownloadType.others ? {
                                        nodeType: 'div',
                                        style: this.state.style.Line,
                                        childs: [{
                                                nodeType: 'label',
                                                style: this.state.style.inputLabel,
                                                childs: '重命名:'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'FileName',
                                                type: 'text',
                                                value: this.state.FileName,
                                                style: this.state.style.input,
                                                onChange: ({ target }) => this.configChange(target)
                                            }
                                        ]
                                    } : null,
                                    this.state.DownloadType == DownloadType.aria2 ? {
                                        nodeType: 'div',
                                        style: this.state.style.Line,
                                        childs: [{
                                                nodeType: 'label',
                                                style: this.state.style.inputLabel,
                                                childs: '下载到:'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'DownloadDir',
                                                value: this.state.DownloadDir,
                                                style: this.state.style.input,
                                                onChange: ({ target }) => this.configChange(target)
                                            }
                                        ]
                                    } : null,
                                    this.state.DownloadType == DownloadType.aria2 ? {
                                        nodeType: 'div',
                                        style: this.state.style.Line,
                                        childs: [{
                                                nodeType: 'label',
                                                style: this.state.style.inputLabel,
                                                childs: '代理服务器(可选):'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'DownloadProxy',
                                                value: this.state.DownloadProxy,
                                                style: this.state.style.input,
                                                onChange: ({ target }) => this.configChange(target)
                                            }
                                        ]
                                    } : null,
                                    this.state.DownloadType == DownloadType.aria2 ? {
                                        nodeType: 'div',
                                        style: this.state.style.Line,
                                        childs: [{
                                                nodeType: 'label',
                                                style: this.state.style.inputLabel,
                                                childs: 'Aria2 RPC WebSocket:'
                                            },
                                            {
                                                nodeType: 'input',
                                                pattern: '^(ws|wss)://.*$',
                                                name: 'WebSocketAddress',
                                                value: this.state.WebSocketAddress,
                                                style: this.state.style.input,
                                                onChange: ({ target }) => this.configChange(target)
                                            }
                                        ]
                                    } : null,
                                    this.state.DownloadType == DownloadType.aria2 ? {
                                        nodeType: 'div',
                                        style: this.state.style.Line,
                                        childs: [{
                                                nodeType: 'label',
                                                style: this.state.style.inputLabel,
                                                childs: 'Aria2 RPC Token(密钥):'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'WebSocketToken',
                                                type: 'Password',
                                                value: this.state.WebSocketToken,
                                                style: this.state.style.input,
                                                onChange: ({ target }) => this.configChange(target)
                                            }
                                        ]
                                    } : null,
                                    {
                                        nodeType: 'div',
                                        style: this.state.style.Line,
                                        childs: [{
                                                nodeType: 'label',
                                                style: this.state.style.inputLabel,
                                                childs: [
                                                    '全局可用变量： %#Y#% (年) | %#M#% (月) | %#D#% (日) | %#h#% (时) | %#m#% (分) | %#s#% (秒)', { nodeType: 'br' },
                                                    '重命名可用变量： %#TITLE#% (标题) | %#ID#% (ID) | %#AUTHOR#% (作者) | %#SOURCE_NAME#% (原文件名)', { nodeType: 'br' },
                                                    '下载目录可用变量： %#AUTHOR#% (作者)', { nodeType: 'br' },
                                                    '双击视频选中，再次双击取消选中。选中仅在本页面有效！', { nodeType: 'br' },
                                                    '在作者用户页面可以点击下载全部，将会搜索该用户的所有视频进行下载。', { nodeType: 'br' },
                                                    '插件下载视频前会检查视频简介，如果在简介中发现疑似第三方下载链接，将会弹窗提示，您可以手动打开视频页面选择。', { nodeType: 'br' },
                                                    '手动下载需要您提供视频ID!'
                                                ]
                                            }]
                                    }]
                            }
                        ]
                    }]
            }));
        }
    }
    sourceRender([{
            nodeType: 'style',
            innerHTML: `
        .controlPanel {
                display: none;
                position: fixed;
                z-index: 2147483646;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0, 0, 0, 0.4);
                scrollbar-width: none;
                -ms-overflow-style: none;
                overflow-x: hidden;
                overflow-y: auto;
        }
        .controlPanel::-webkit-scrollbar {
            display: none;
        }
        .controlPanel-content {
            background-color: #fefefe;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            padding: 20px;
            border: 1px solid #888;
            width: 60%;
            max-width: 720px;
        }
        .controlPanelClose {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
        }
        .controlPanelClose:hover,
        .controlPanelClose:focus {
            color: black;
            text-decoration: none;
            cursor: pointer;
        }
        .switchButton {
            background-color: #bf360c;
        }
        .switchButton[switch=off] {
            background-color: #43a047;
        }
        .selectButton {
            border-style: solid;
            border-color: #ff8c26;
        }
        .selectButton[checked=true] {
            border-color: #ff8c26;
        }
        .selectButton[checked=true]:before {
            z-index: 2147483640;
            position: absolute;
            display: block;
            width: 100%;
            height: 100%;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(150, 150, 150, 0.6);
            font-weight: 900;
            font-size: 36px;
            text-align: right;
            color: rgb(20, 20, 20);
            content: '✔';
        }
        .tips {
            letter-spacing:3px;
            box-sizing: border-box;
            display: none;
            width: 100%;
            max-width: 640px;
            font-size: 0.825em;
            border-top-right-radius: 5px;
            border-top-left-radius: 5px;
            background: #ffffff;
            box-shadow: 0 2.8px 2.2px rgba(0, 0, 0, 0.02), 0 6.7px 5.3px rgba(0, 0, 0, 0.028), 0 12.5px 10px rgba(0, 0, 0, 0.035), 0 22.3px 17.9px rgba(0, 0, 0, 0.042), 0 41.8px 33.4px rgba(0, 0, 0, 0.05), 0 100px 80px rgba(0, 0, 0, 0.07);
            -webkit-transition: 0.2s ease-in;
            transition: 0.2s ease-in;
        }
        @media (min-width: 640px) {
            .tips {
                border-radius: 5px;
                margin-bottom: 0.5em;
            }
        }
        .tipsActive {
            display: -webkit-box;
            display: flex;
            -webkit-animation: slideinBottom 5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
            animation: slideinBottom 5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
        .tipsWait {
            display: -webkit-box;
            display: flex;
            -webkit-animation: slidein 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
            animation: slidein 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
        .tipsWarning {
            background: #bf360c;
            color: white;
        }
        .tipsSuccess {
            background: #43a047;
            color: white;
        }
        .tipsProgress {
            width: 100%;
            background-color: #ddd;
        }
        .tipsProgress .value {
            text-align: right;
            height: 24px;
            color: white;
            background-color: #2196F3;
            width: 0%;
            -webkit-transition: all 0.2s ease;
            -moz-transition: all 0.2s ease;
            -o-transition: all 0.2s ease;
            transition: all 0.2s ease;
        }
        .Progress :after{
            content: attr(value)"%";
        }
        .tipsActions {
            width: 100%;
            max-width: 768px;
            margin: 0 auto;
            display: -webkit-box;
            display: flex;
            -webkit-box-orient: vertical;
            -webkit-box-direction: normal;
            flex-flow: column;
        }
        @media (min-width: 640px) {
            .tipsActions {
                -webkit-box-orient: horizontal;
                -webkit-box-direction: normal;
                flex-flow: row;
            }
        }
        .tipsContainer {
            z-index: 2147483647;
            box-sizing: border-box;
            padding: 0em 1em;
            position: fixed;
            width: 100%;
            max-width: 640px;
            margin: 0 auto;
            display: -webkit-box;
            display: flex;
            -webkit-box-orient: vertical;
            -webkit-box-direction: normal;
            flex-flow: column;
            bottom: 0;
            left: 0;
            right: 0;
            -webkit-box-align: center;
            align-items: center;
            -webkit-box-pack: center;
            justify-content: center;
        }
        @media (min-width: 640px) {
            .tipsContainer {
                padding: 0 1em;
            }
        }
        @media (min-width: 1024px) {
            .tipsContainer {
                left: initial;
                right: 0;
            }
        }
        .tipsIcon {
            height: 60px;
            width: 60px;
            box-sizing: border-box;
            padding: 1em;
            display: none;
            -webkit-box-align: center;
                align-items: center;
            -webkit-box-pack: center;
                justify-content: center;
        }
        .tipsIcon svg {
            height: 100%;
        }
        @media (min-width: 640px) {
            .tipsIcon {
                display: -webkit-box;
                display: flex;
            }
        }
        .tipsIcon ~ .tipsContent {
            padding: 1em;
        }
        @media (min-width: 640px) {
            .tipsIcon ~ .tipsContent {
                padding: 1em 1em 1em 0;
            }
        }
        .tipsContent {
            box-sizing: border-box;
            padding: 1em;
            width: 100%;
        }
        .tipsContent h2 {
            margin: 0 0 0.25em 0;
            padding: 0;
            font-size: 1.2em;
        }
        .tipsContent p {
            margin: 0;
            padding: 0;
            font-size: 1em;
        }
        @-webkit-keyframes slidein {
            0% {
                opacity: 0;
                -webkit-transform: translateY(100%);
                        transform: translateY(100%);
            }
            100% {
                opacity: 1;
                -webkit-transform: translateY(0);
                        transform: translateY(0);
            }
        }
        @keyframes slidein {
            0% {
                opacity: 0;
                -webkit-transform: translateY(100%);
                        transform: translateY(100%);
            }
            100% {
                opacity: 1;
                -webkit-transform: translateY(0);
                        transform: translateY(0);
            }
        }
        @-webkit-keyframes slideinBottom {
            0% {
                opacity: 0;
                -webkit-transform: translateY(100%);
                        transform: translateY(100%);
            }
            15% {
                opacity: 1;
                -webkit-transform: translateY(0);
                        transform: translateY(0);
            }
            85% {
                opacity: 1;
                -webkit-transform: translateY(0);
                        transform: translateY(0);
            }
            100% {
                opacity: 0;
                -webkit-transform: translateY(100%);
                        transform: translateY(100%);
            }
        }
        @keyframes slideinBottom {
            0% {
                opacity: 0;
                -webkit-transform: translateY(100%);
                        transform: translateY(100%);
            }
            15% {
                opacity: 1;
                -webkit-transform: translateY(0);
                        transform: translateY(0);
            }
            85% {
                opacity: 1;
                -webkit-transform: translateY(0);
                        transform: translateY(0);
            }
            100% {
                opacity: 0;
                -webkit-transform: translateY(100%);
                        transform: translateY(100%);
            }
        }
        `,
            parent: document.head
        },
        {
            nodeType: 'div',
            attribute: {
                id: 'PluginControlPanel'
            },
            parent: document.body
        }, {
            nodeType: 'div',
            attribute: {
                id: 'PluginUI',
                style: 'display: inline-block;'
            },
            parent: document.querySelector('#user-links')
        }]);
    let PluginUI = ReactDOM.render(React.createElement(pluginUI), document.getElementById('PluginUI'));
    let PluginControlPanel = ReactDOM.render(React.createElement(pluginControlPanel), document.getElementById('PluginControlPanel'));
    let PluginTips = new pluginTips();
    let Cookies = document.cookie;
    let DownloadLinkCharacteristics = [
        '/s/',
        'mega.nz/',
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
        'uploaded',
        'icerbox',
        'alfafile',
        'drv.ms',
        'onedrive'
    ];
    function ParseVideoID(data) {
        if (data.getAttribute('linkdata') != null) {
            return data.getAttribute('linkdata').split('?')[0].split('/')[4].toLowerCase();
        }
        else {
            return data.querySelector('h3.title').querySelector('a').href.toLowerCase().split('?')[0].split('/')[4].toLowerCase();
        }
    }
    async function ManualParseDownloadAddress() {
        let ID = prompt('请输入需要下载的视频ID', '');
        if (ID.split('_')[1] != undefined) {
            ID = ID.split('_')[1];
        }
        await ParseDownloadAddress(ID);
        PluginTips.success('下载', '解析完成!');
    }
    async function DownloadSelected() {
        PluginTips.info('下载', '开始解析...');
        let videoList = document.querySelectorAll('.selectButton[checked="true"]');
        if (PluginControlPanel.state.Async) {
            videoList.forEach(async (element, index) => {
                await ParseDownloadAddress(ParseVideoID(element));
                if (index == videoList.length - 1)
                    PluginTips.success('下载', '已全部解析完成!');
            });
        }
        else {
            for (let index = 0; index < videoList.length; index++) {
                await ParseDownloadAddress(ParseVideoID(videoList[index]));
            }
            PluginTips.success('下载', '已全部解析完成!');
        }
    }
    async function DownloadAll() {
        PluginTips.info('下载', '正在解析...');
        if (document.querySelector('#block-views-videos-block-2') != null) {
            if (document.querySelector('#block-views-videos-block-2').querySelector('.more-link') != null) {
                await GetAllData(document.querySelector('.more-link').querySelector('a').href, [], window.location.href);
            }
            else {
                let videoList = document.querySelector('#block-views-videos-block-2').querySelectorAll('.node-video');
                if (PluginControlPanel.state.Async) {
                    videoList.forEach(async (element, index) => {
                        await ParseDownloadAddress(ParseVideoID(element));
                        if (index == videoList.length - 1)
                            PluginTips.success('下载', '已全部解析完成!');
                    });
                }
                else {
                    for (let index = 0; index < videoList.length; index++) {
                        await ParseDownloadAddress(ParseVideoID(videoList[index]));
                    }
                    PluginTips.success('下载', '已全部解析完成!');
                }
            }
        }
        else {
            await GetAllData(window.location.href, [], window.location.href);
        }
    }
    async function GetAllData(videoListUrl, data, referrer) {
        let videoListPage = parseDom(await get(videoListUrl, data, referrer));
        let videoList = videoListPage.querySelector('.view-videos').querySelectorAll('.node-video');
        if (PluginControlPanel.state.Async) {
            videoList.forEach(async (element, index) => {
                await ParseDownloadAddress(ParseVideoID(element));
                if (index == videoList.length - 1) {
                    if (videoListPage.querySelectorAll('.pager-next').length != 0) {
                        await GetAllData(videoListPage.querySelector('.pager-next').querySelector('a').href, data, referrer);
                    }
                    else {
                        PluginTips.success('下载', '已全部解析完成!');
                    }
                }
            });
        }
        else {
            for (let i = 0; i < videoList.length; i++) {
                await ParseDownloadAddress(ParseVideoID(videoList[i]));
            }
            if (videoListPage.querySelectorAll('.pager-next').length != 0) {
                await GetAllData(videoListPage.querySelector('.pager-next').querySelector('a').href, data, referrer);
            }
            else {
                PluginTips.success('下载', '已全部解析完成!');
            }
        }
    }
    function CheckIsHaveDownloadLink(comment) {
        if (comment == null)
            return false;
        for (let index = 0; index < DownloadLinkCharacteristics.length; index++) {
            if (comment.indexOf(DownloadLinkCharacteristics[index]) != -1)
                return true;
        }
        return false;
    }
    async function ParseDownloadAddress(Data) {
        let videoInfo = new VideoInfo(Data);
        await videoInfo.init();
        if (videoInfo.Private) {
            let TipsText = '检测到无权限访问的私有(上锁)视频! <br />';
            if (document.querySelector('.btn.btn-info.btn-sm.user') == null) {
                TipsText += '请<a href="https://' + window.location.hostname + '/user/login" target="_blank" >登录</a>或<a href="https://' + window.location.hostname + '/user/register" target="_blank">注册</a>后进入视频页面与作者成为好友获得访问权限。<br />';
            }
            else {
                TipsText += '请进入视频页面与作者成为好友获得访问权限。<br />';
            }
            PluginTips.warning('警告', TipsText + '<a href="' + videoInfo.Url + '" target="_blank" > → 点击此处，进入视频页面 ← </a>', true);
        }
        else {
            if (CheckIsHaveDownloadLink(videoInfo.getComment())) {
                PluginTips.warning('警告', '<a href="' + videoInfo.Url + '" title="' + videoInfo.getName() + '" target="_blank" >' + videoInfo.getName() + '</a> <br />发现疑似第三方高画质下载链接,请手动处理!', true);
            }
            else {
                if (videoInfo.getDownloadQuality() != 'Source') {
                    PluginTips.warning('警告', '<a href="' + videoInfo.Url + '" title="' + videoInfo.getName() + '" target="_blank" >' + videoInfo.getName() + '</a> <br />没有解析到原画下载地址,请手动处理!', true);
                }
                else {
                    SendDownloadRequest(videoInfo, Cookies);
                }
            }
        }
    }
    function defaultDownload(Info) {
        (function (ID, Name, FileName, DownloadUrl) {
            let Task = {
                url: DownloadUrl,
                name: FileName,
                saveAs: false,
                onload: function () {
                    PluginTips.downloadComplete(ID);
                    PluginTips.success('下载', Name + ' 下载完成!');
                },
                onerror: function (error) {
                    PluginTips.downloadComplete(ID);
                    PluginTips.warning('下载', Name + ' 下载失败! <br />错误报告: ' + JSON.stringify(error));
                },
                onprogress: function (progress) {
                    if (progress.lengthComputable) {
                        PluginTips.downloading(ID, progress.position / progress.totalSize * 100);
                    }
                },
                ontimeout: function () {
                    PluginTips.downloadComplete(ID);
                    PluginTips.warning('下载', Name + ' 下载超时! ');
                }
            };
            if (PluginTips.DownloadingQueue.length() < 4) {
                PluginTips.DownloadingQueue.push({ id: ID, name: Name, task: Task });
                GM_download(Task);
                if (GM_info.downloadMode == 'native') {
                    PluginTips.progress(Name + ' 下载中...', {
                        id: ID
                    });
                }
                else {
                    PluginTips.info('下载', Name + ' 已开始下载!');
                }
            }
            else {
                PluginTips.WaitingQueue.push({ id: ID, name: Name, task: Task });
            }
        }(Info.ID, Info.getName(), Info.getFileName(), Info.getDownloadUrl()));
    }
    function aria2Download(Info, Cookies) {
        (function (ID, Name, FileName, Author, Cookie, DownloadUrl) {
            PluginControlPanel.Aria2WebSocket.send(JSON.stringify({
                'jsonrpc': '2.0',
                'method': 'aria2.addUri',
                'id': PluginControlPanel.state.WebSocketID,
                'params': [
                    'token:' + PluginControlPanel.state.WebSocketToken,
                    [DownloadUrl],
                    {
                        'referer': 'https://ecchi.iwara.tv/',
                        'header': [
                            'Cookie:' + Cookie
                        ],
                        'out': FileName,
                        'dir': replaceVar(PluginControlPanel.state.DownloadDir).replace('%#AUTHOR#%', Author),
                        'all-proxy': PluginControlPanel.state.DownloadProxy
                    }
                ]
            }));
            PluginTips.info('提示', '已将 ' + Name + ' 的下载地址推送到Aria2!');
        }(Info.ID, Info.getName(), Info.getFileName(), Info.getAuthor(), Cookies, Info.getDownloadUrl()));
    }
    function SendDownloadRequest(Info, Cookie) {
        switch (DownloadType[PluginControlPanel.state.DownloadType]) {
            case DownloadType[DownloadType.aria2]:
                aria2Download(Info, Cookie);
                break;
            case DownloadType[DownloadType.default]:
                defaultDownload(Info);
                break;
            case DownloadType[DownloadType.others]:
            default:
                PluginTips.info('提示', '已将下载请求提交给浏览器!');
                GM_openInTab(Info.getDownloadUrl(), { active: true, insert: true, setParent: true });
                break;
        }
    }
    function replaceVar(data) {
        let gVar = [
            { 'Y': new Date().getFullYear() },
            { 'M': new Date().getMonth() },
            { 'D': new Date().getDay() },
            { 'h': new Date().getHours() },
            { 'm': new Date().getMinutes() },
            { 's': new Date().getSeconds() }
        ];
        for (let i = 0; i < gVar.length; i++) {
            for (const d in gVar[i]) {
                data.replace('%#' + d + '#%', gVar[i][d]);
            }
        }
        return data;
    }
    if (!PluginControlPanel.Initialize) {
        PluginControlPanel.show();
    }
    let videoList = document.querySelectorAll('.node-video');
    for (let index = 0; index < videoList.length; index++) {
        const video = videoList[index];
        if (!video.classList.contains('node-full')) {
            video.ondblclick = () => {
                video.setAttribute('checked', video.getAttribute('checked') == 'false' ? 'true' : 'false');
            };
            video.setAttribute('checked', 'false');
            video.classList.add('selectButton');
            let videoLink = video.querySelector('div').querySelector('a');
            if (videoLink != null) {
                video.setAttribute('linkdata', videoLink.href);
                videoLink.removeAttribute('href');
            }
        }
        else if (video.querySelector('.field-name-field-video-url') != null) {
            console.log('跳过视频: ' + video.getAttribute('data-original-title'));
            PluginTips.warning('Iwara批量下载工具', video.getAttribute('data-original-title') + ' 无法解析视频源，可能不是Iwara视频源!');
        }
    }
    if (document.querySelectorAll('.selectButton').length > 0) {
        PluginUI.downloadSelectedEnabled();
        if (window.location.href.indexOf('/users/') > -1) {
            PluginUI.downloadAllEnabled();
        }
        switch (PluginControlPanel.state.DownloadType) {
            case DownloadType.aria2:
                PluginControlPanel.ConnectionWebSocket();
                break;
            case DownloadType.default:
                PluginTips.warning('Iwara批量下载工具', '该下载模式为实验性模式，无法保证下载稳定性！');
                break;
            case DownloadType.others:
                break;
            default:
                console.log('未知的下载模式!');
                break;
        }
        PluginTips.success('Iwara批量下载工具', '加载完成!');
    }
    else {
        if (window.location.href.indexOf('iwara.tv/videos') > -1 && PluginControlPanel.state.AutoRefresh) {
            PluginTips.warning('Iwara批量下载工具', '未找到可供下载的视频，10秒后尝试重新加载页面...(本功能可在设置中关闭或开启)', true);
            setTimeout(() => {
                window.location.reload();
            }, 10000);
        }
    }
})();
//# sourceMappingURL=IwaraDownloadTool.user.js.map