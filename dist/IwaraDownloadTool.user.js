// ==UserScript==
// @name              Iwara Download Tool
// @description       Download videos from iwara.tv
// @name:ja           Iwara バッチダウンローダー
// @description:ja    Iwara 動画バッチをダウンロード
// @name:zh-CN        Iwara 批量下载工具
// @description:zh-CN 批量下载 Iwara 视频
// @icon              https://iwara.tv/sites/all/themes/main/img/logo.png
// @namespace         https://github.com/dawn-lc/user.js
// @version           2.1.150
// @author            dawn-lc
// @license           Apache-2.0
// @copyright         2023, Dawnlc (https://dawnlc.me/)
// @source            https://github.com/dawn-lc/user.js
// @supportURL        https://github.com/dawn-lc/user.js/issues
// @updateURL         https://github.com/dawn-lc/user.js/raw/master/dist/IwaraDownloadTool.mata.js
// @downloadURL       https://github.com/dawn-lc/user.js/raw/master/dist/IwaraDownloadTool.user.js
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
    function sourceRender(vdata) {
        if (vdata.nodeType == undefined) {
            debugger;
        }
        let RenderDOM = document.createElement(vdata.nodeType);
        for (const item in vdata) {
            switch (item) {
                case 'nodeType':
                    break;
                case 'attributes':
                    for (const key in vdata.attributes) {
                        RenderDOM.setAttribute(key, vdata.attributes[key]);
                    }
                    break;
                case 'className':
                    if (vdata.className instanceof Array) {
                        RenderDOM.className = vdata.className.join(' ');
                    }
                    else {
                        RenderDOM.className = vdata.className.toString();
                    }
                    break;
                case 'childs':
                    if (vdata.childs instanceof Array) {
                        vdata.childs.forEach((child) => {
                            if (child instanceof HTMLElement) {
                                RenderDOM.appendChild(child);
                                return;
                            }
                            if (child instanceof String || typeof child == 'string') {
                                RenderDOM.insertAdjacentHTML('beforeend', child);
                                return;
                            }
                            RenderDOM.appendChild(sourceRender(child));
                        });
                        break;
                    }
                    if (vdata.childs instanceof HTMLElement) {
                        RenderDOM.appendChild(vdata.childs);
                        break;
                    }
                    if (vdata.childs instanceof String || typeof vdata.childs == 'string') {
                        RenderDOM.insertAdjacentHTML('beforeend', vdata.childs);
                        break;
                    }
                    RenderDOM.appendChild(sourceRender(vdata.childs));
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
        if (vdata == null || vdata.nodeType == undefined) {
            return vdata;
        }
        let VirtualDOM = { type: vdata.nodeType };
        Reflect.deleteProperty(vdata, "nodeType");
        VirtualDOM.props ??= {};
        if (vdata.className != undefined) {
            VirtualDOM.props = Object.assign({ className: vdata.className }, VirtualDOM.props);
            Reflect.deleteProperty(vdata, "className");
        }
        if (vdata.attribute != undefined) {
            VirtualDOM.props = Object.assign(vdata.attribute, VirtualDOM.props);
            Reflect.deleteProperty(vdata, "attribute");
        }
        if (vdata.childs != undefined) {
            VirtualDOM.children ??= [];
            if (vdata.childs instanceof Array) {
                VirtualDOM.children = React.Children.toArray(vdata.childs.map((item) => reactRender(item)));
            }
            else {
                VirtualDOM.children.push(reactRender(vdata.childs));
            }
            Reflect.deleteProperty(vdata, "childs");
        }
        if (index != undefined)
            VirtualDOM.props = Object.assign({ key: index }, VirtualDOM.props);
        for (const key in vdata) {
            VirtualDOM.props[key] = vdata[key];
            Reflect.deleteProperty(vdata, key);
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
                        'Accept': 'application/json, text/plain, */*',
                        'Content-Type': 'application/x-www-form-urlencoded',
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
        let responseData;
        if (url.split('//')[1].split('/')[0] == window.location.hostname) {
            responseData = await fetch(url, {
                'headers': {
                    'accept': 'application/json, text/plain, */*',
                    'content-type': 'application/json;charset=UTF-8'
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
        else {
            responseData = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: url,
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Content-Type': 'application/json'
                    },
                    data: parameter,
                    onload: function (response) {
                        resolve(response);
                    },
                    onerror: function (error) {
                        reject(error);
                    }
                });
            });
            if (responseData.status >= 200 && responseData.status < 300) {
                if (responseData.responseHeaders.indexOf('json') > -1) {
                    return JSON.parse(responseData.responseText);
                }
                else {
                    return responseData.response;
                }
            }
            else {
                return responseData;
            }
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
    let APIType;
    (function (APIType) {
        APIType[APIType["http"] = 0] = "http";
        APIType[APIType["ws"] = 1] = "ws";
        APIType[APIType["https"] = 2] = "https";
        APIType[APIType["wss"] = 3] = "wss";
    })(APIType || (APIType = {}));
    let TipsType;
    (function (TipsType) {
        TipsType[TipsType["Info"] = 0] = "Info";
        TipsType[TipsType["Warning"] = 1] = "Warning";
        TipsType[TipsType["Success"] = 2] = "Success";
        TipsType[TipsType["Progress"] = 3] = "Progress";
        TipsType[TipsType["Dialog"] = 4] = "Dialog";
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
        static Title = { nodeType: 'h2', childs: 'Iwara批量下载工具' };
        static typeIcon = {
            Info: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
            Warning: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
            Success: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
            Progress: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>'
        };
        static Container = sourceRender({
            nodeType: 'section',
            attributes: {
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
                    this.progress({
                        title: {
                            nodeType: 'h2',
                            childs: `${downloadTask.name} 下载中...`
                        },
                        id: downloadTask.id
                    });
                }
                else {
                    this.info({
                        content: {
                            nodeType: 'p',
                            childs: `${downloadTask.name} 已开始下载!`
                        }
                    });
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
        info(params) {
            let code = params;
            new tips(TipsType.Info, code.content, code.title, code.id, code.wait);
            console.info(code.title?.childs ?? pluginTips.Title.childs, code.content.childs);
        }
        warning(params) {
            let code = params;
            new tips(TipsType.Warning, code.content, code.title, code.id, code.wait);
            console.warn(code.title?.childs ?? pluginTips.Title.childs, code.content.childs);
        }
        success(params) {
            let code = params;
            new tips(TipsType.Success, code.content, code.title, code.id, code.wait);
            console.log(code.title?.childs ?? pluginTips.Title.childs, code.content.childs);
        }
        progress(params) {
            if (pluginTips.Container.children.namedItem(params.id) != null) {
                this.warning({
                    content: {
                        nodeType: 'p',
                        childs: [
                            params.content,
                            '任务已存在。'
                        ]
                    }
                });
                return;
            }
            new tips(TipsType.Progress, params.title, {
                nodeType: 'div',
                className: 'Progress',
                childs: [{
                        nodeType: 'div',
                        className: 'value',
                        attributes: {
                            value: 0
                        }
                    }]
            }, params.id, true);
        }
        dialog(params) {
            params.content =
                {
                    nodeType: "div",
                    childs: [
                        params.content, {
                            nodeType: "button",
                            className: "btn-primary tipsButton",
                            childs: "取消下载",
                            onclick() {
                                pluginTips.Container.children.namedItem(params.id).remove();
                            }
                        }, {
                            nodeType: "button",
                            className: "btn-primary tipsButton",
                            childs: "重新下载",
                            attributes: {
                                id: true
                            },
                            onclick() {
                                ParseDownloadAddress(params.id, false);
                                pluginTips.Container.children.namedItem(params.id).remove();
                            }
                        }
                    ]
                };
            new tips(TipsType.Dialog, params.content, params.title, params.id, true, TipsType.Warning);
        }
    }
    class tips {
        id;
        type;
        show;
        wait;
        constructor(type, content, title, id = null, wait = false, show = null) {
            this.type = type;
            this.show = show ??= type;
            this.wait = wait;
            switch (this.type) {
                case TipsType.Progress:
                    //todo 取消任务
                    break;
                case TipsType.Dialog:
                    //todo 确认框
                    break;
                default:
                    break;
            }
            sourceRender(Object.assign({
                nodeType: 'div',
                childs: [{
                        nodeType: 'div',
                        className: 'tipsIcon',
                        innerHTML: pluginTips.typeIcon[TipsType[show]]
                    }, {
                        nodeType: 'div',
                        className: 'tipsContent',
                        childs: [title ?? pluginTips.Title].concat(content)
                    }],
                parent: pluginTips.Container
            }, this.style(), this.event(), id != null ? {
                attributes: {
                    id: id
                }
            } : {}));
        }
        event() {
            return {
                onclick: (e) => {
                    switch (this.type) {
                        case TipsType.Info:
                        case TipsType.Success:
                        case TipsType.Warning:
                            e.currentTarget.remove();
                            break;
                        case TipsType.Dialog:
                        default:
                            break;
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
            style.className.push('tips' + TipsType[this.show]);
            style.className.push(this.wait ? 'tipsWait' : 'tipsActive');
            return style;
        }
    }
    class VideoInfo {
        Title;
        Url;
        ID;
        Page;
        UploadTime;
        Name;
        Author;
        Exist;
        Private;
        Source;
        getAuthor;
        getName;
        getDownloadQuality;
        getDownloadUrl;
        getSourceFileName;
        getComment;
        getLock;
        getFileName;
        constructor(ID, Name, Author) {
            this.Title = { nodeType: 'h2', childs: 'Iwara批量下载工具-解析模块' };
            this.ID = ID.toLowerCase();
            this.Name = Name ?? '视频标题获取失败';
            this.Author = Author ?? '视频作者获取失败';
            this.Url = `https://${window.location.hostname}/videos/${this.ID}?language=en`;
            this.Exist = false;
            this.Private = false;
            this.getAuthor = function () {
                return this.Author.trim().replace(/^\.|[\\\\/:*?\"<>|.]/img, '_');
            };
            this.getName = function () {
                return this.Name.trim().replace(/^\.|[\\\\/:*?\"<>|.]/img, '_');
            };
            return this;
        }
        async init(cooike = {}) {
            try {
                this.Page = parseDom(await get(this.Url, [], window.location.href, cooike));
                this.Private = this.Page.querySelector('.well') != null;
                this.Exist = this.Page.querySelector('video') != null;
                if (this.Private) {
                    if (cooike['cooike'] == undefined) {
                        await this.init({ 'cooike': PluginControlPanel.Cookies });
                        return;
                    }
                    this.Exist = true;
                }
                else {
                    if (this.Exist) {
                        let submitted = this.Page.querySelector('.submitted');
                        this.Author = submitted.querySelector('a.username')?.innerText;
                        this.Name = submitted.querySelector('h1.title')?.innerText;
                        this.UploadTime = new Date(submitted.childNodes[submitted.childNodes.length - 1].textContent.replace('on', '').trim());
                        this.Source = await get('https://' + window.location.hostname + '/api/video/' + this.ID, [], this.Url, cooike);
                        this.getFileName = function () {
                            return replaceVar(PluginControlPanel.state.FileName, this.UploadTime)
                                .replace('%#TITLE#%', this.getName())
                                .replace('%#ID#%', this.ID)
                                .replace('%#AUTHOR#%', this.getAuthor())
                                .replace('%#SOURCE_NAME#%', this.getSourceFileName());
                        };
                        this.getDownloadQuality = function () {
                            if (this.Source.length == 0)
                                return 'null';
                            return this.Source[0].resolution;
                        };
                        this.getDownloadUrl = function () { return decodeURIComponent('https:' + this.Source.find(x => x.resolution == this.getDownloadQuality()).uri); };
                        this.getSourceFileName = function () { return getQueryVariable(this.getDownloadUrl(), 'file').split('/')[3]; };
                        this.getComment = function () {
                            let commentsNode;
                            try {
                                commentsNode = Array.from(this.Page.querySelectorAll(".node-video.node-full > .content > .node-info > .field > .field-items > .field-item"));
                                Array.from(this.Page.querySelector('#comments').querySelectorAll(".submitted")).map((node) => {
                                    if (node.querySelector('a.username')?.innerText == this.Author) {
                                        commentsNode = commentsNode.concat(Array.from(node.parentNode.querySelectorAll('.content > .field > .field-items > .field-item')));
                                    }
                                });
                            }
                            catch (error) {
                                PluginTips.warning({
                                    title: this.Title,
                                    content: {
                                        nodeType: 'p',
                                        childs: error.toString()
                                    }
                                });
                                return '';
                            }
                            return commentsNode.map((element) => element.innerText).join('\n');
                        };
                    }
                }
            }
            catch (error) {
                PluginTips.warning({
                    title: this.Title,
                    content: {
                        nodeType: 'p',
                        childs: `视频信息解析失败：${error.toString()}`
                    },
                    wait: true
                });
            }
        }
    }
    class pluginUI extends React.Component {
        Title;
        showCondition;
        constructor(props) {
            super(props);
            this.showCondition = false;
            this.Title = { nodeType: 'h2', childs: 'Iwara批量下载工具-插件UI' };
            this.state = {
                style: {
                    base: { cursor: 'pointer' },
                    disable: { display: 'none' }
                },
                main: 'btn-group',
                downloadEnable: false,
                downloadManualParseEnable: false,
                downloadAllEnable: false,
                downloadSelectedEnable: false
            };
        }
        show() {
            this.showCondition = true;
            this.setState({
                main: 'btn-group open'
            });
            this.downloadManualParseSwitch(true);
            if (document.querySelectorAll('.selectButton').length > 0) {
                this.downloadSelectedSwitch(true);
            }
            if (window.location.href.indexOf('/users/') > -1) {
                this.downloadAllSwitch(true);
            }
        }
        hide() {
            this.showCondition = false;
            this.setState({
                main: 'btn-group'
            });
        }
        downloadSwitch(p = undefined) {
            if (p != undefined) {
                this.setState({
                    downloadEnable: p
                });
            }
            else {
                this.setState({
                    downloadEnable: this.state.downloadEnable ? true : false
                });
            }
            this.downloadManualParseSwitch(this.state.downloadManualParseEnable);
            this.downloadAllSwitch(this.state.downloadAllEnable);
            this.downloadSelectedSwitch(this.state.downloadSelectedEnable);
        }
        downloadManualParseSwitch(p = undefined) {
            if (p != undefined) {
                this.setState({
                    downloadManualParseEnable: this.state.downloadEnable && p
                });
            }
            else {
                this.setState({
                    downloadManualParseEnable: this.state.downloadManualParseEnable ? this.state.downloadEnable && true : false
                });
            }
        }
        downloadAllSwitch(p = undefined) {
            if (p != undefined) {
                this.setState({
                    downloadAllEnable: this.state.downloadEnable && p
                });
            }
            else {
                this.setState({
                    downloadAllEnable: this.state.downloadAllEnable ? this.state.downloadEnable && true : false
                });
            }
        }
        downloadSelectedSwitch(p = undefined) {
            if (p != undefined) {
                this.setState({
                    downloadSelectedEnable: this.state.downloadEnable && p
                });
            }
            else {
                this.setState({
                    downloadSelectedEnable: this.state.downloadSelectedEnable ? this.state.downloadEnable && true : false
                });
            }
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
                            this.state.downloadManualParseEnable ? {
                                nodeType: 'li',
                                attribute: {
                                    style: this.state.style.base,
                                    dangerouslySetInnerHTML: { __html: '<a><span class="glyphicon glyphicon-edit"></span>手动下载</a>' }
                                },
                                onClick: () => {
                                    this.hide();
                                    ManualParseDownloadAddress();
                                }
                            } : null,
                            {
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
        Title;
        Cookies;
        synclistener;
        Aria2WebSocket;
        constructor(props) {
            super(props);
            this.Title = { nodeType: 'h2', childs: 'Iwara批量下载工具-选项' };
            this.Cookies = GM_getValue('Cookies', document.cookie);
            this.Initialize = GM_getValue('Initialize', false);
            this.synclistener = [];
            this.state = {
                Downloaded: GM_getValue('Downloaded', []),
                Async: GM_getValue('Async', false),
                AutoRefresh: GM_getValue('AutoRefresh', false),
                CheckDownloadLink: GM_getValue('CheckDownloadLink', true),
                Version: GM_getValue('Version', null),
                DownloadType: Number(GM_getValue('DownloadType', DownloadType.others)),
                DownloadDir: GM_getValue('DownloadDir', 'iwara/%#AUTHOR#%'),
                DownloadProxy: GM_getValue('DownloadProxy', ''),
                Aria2Type: Number(GM_getValue('Aria2Type', APIType.ws)),
                Aria2Path: GM_getValue('Aria2Path', '127.0.0.1:6800'),
                Aria2Token: GM_getValue('Aria2Token', ''),
                Aria2ID: GM_getValue('Aria2ID', UUID()),
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
            if (document.querySelector('.user-btn') != null) {
                this.getCookies();
            }
        }
        getCookies() {
            try {
                GM_cookie('list', { domain: 'iwara.tv', httpOnly: true }, (list, error) => {
                    let newCookies = document.cookie.trim();
                    if (error) {
                        PluginTips.warning({
                            title: this.Title,
                            content: {
                                nodeType: 'p',
                                childs: `获取账号信息失败！<br />
                                如需下载私有(上锁)视频，需要使用 <a href="https://docs.scriptcat.org/">ScriptCat</a> 或 <a href="https://www.tampermonkey.net/index.php?#download_gcal">Tampermonkey Beta</a> 载入本脚本。<br />
                                错误：${error}`
                            },
                            wait: true
                        });
                    }
                    else {
                        for (let index = 0; index < list.length; index++) {
                            const Cookie = list[index];
                            if (Cookie.httpOnly == true)
                                newCookies += '; ' + Cookie.name + '=' + Cookie.value;
                        }
                        if (newCookies != this.Cookies) {
                            this.Cookies = newCookies;
                            PluginControlPanel.configChange({ name: "Cookies", value: this.Cookies });
                        }
                    }
                });
            }
            catch (error) {
                PluginTips.warning({
                    title: this.Title,
                    content: {
                        nodeType: 'p',
                        childs: `获取账号信息失败！<br />
                        请检查脚本加载器是否支持获取Cookies！<br />
                        或使用 <a href="https://docs.scriptcat.org/">ScriptCat</a> 或 <a href="https://www.tampermonkey.net/index.php?#download_gcal">Tampermonkey Beta</a> 载入本脚本。 <br />
                        错误：${error}`
                    },
                    wait: true
                });
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
                    this.setState((state) => {
                        return {
                            style: Object.assign(state.style, {
                                main: { display: 'none' }
                            })
                        };
                    });
                    this.ConnectionAria2(this.state.Aria2Type);
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
                                this.configChange({ name: name, value: new_value });
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
        async ConnectionAria2(type) {
            let url = APIType[type] + '://' + this.state.Aria2Path + '/jsonrpc';
            PluginTips.info({
                title: this.Title,
                content: {
                    nodeType: 'p',
                    childs: `正在连接Aria2...`
                }
            });
            try {
                switch (APIType[type]) {
                    case APIType[APIType.http]:
                    case APIType[APIType.https]:
                        if (this.Aria2WebSocket != null) {
                            this.Aria2WebSocket.close();
                            this.Aria2WebSocket = null;
                        }
                        let response = await post(url, JSON.stringify({
                            'jsonrpc': '2.0',
                            'method': 'aria2.getGlobalStat',
                            'id': PluginControlPanel.state.Aria2ID,
                            'params': [
                                'token:' + PluginControlPanel.state.Aria2Token
                            ]
                        }));
                        if (response['result'] != null) {
                            PluginTips.success({
                                title: this.Title,
                                content: {
                                    nodeType: 'p',
                                    childs: `Aria2连接成功!`
                                }
                            });
                            PluginUI.downloadSwitch(true);
                        }
                        else {
                            PluginTips.warning({
                                title: this.Title,
                                content: {
                                    nodeType: 'p',
                                    childs: `连接失败, 请检查是否授权脚本访问Aria2RPC地址, 或者是否已经启动Aria2。<br />以及Aria2配置是否正确!`
                                },
                                wait: true
                            });
                            PluginUI.downloadSwitch(false);
                        }
                        break;
                    case APIType[APIType.ws]:
                    case APIType[APIType.wss]:
                        this.Aria2WebSocket = new WebSocket(url);
                        this.Aria2WebSocket.onopen = wsopen;
                        this.Aria2WebSocket.onmessage = wsmessage;
                        this.Aria2WebSocket.onclose = wsclose;
                        function wsopen() {
                            PluginTips.success({
                                title: { nodeType: 'h2', childs: 'Iwara批量下载工具-选项' },
                                content: {
                                    nodeType: 'p',
                                    childs: `Aria2连接成功!`
                                }
                            });
                            PluginUI.downloadSwitch(true);
                        }
                        function wsmessage() {
                            //todo 接收信息
                        }
                        function wsclose() {
                            PluginControlPanel.Aria2WebSocket = null;
                            PluginTips.warning({
                                title: { nodeType: 'h2', childs: 'Iwara批量下载工具-选项' },
                                content: {
                                    nodeType: 'p',
                                    childs: `连接失败, Aria2 连接断开! <br />请检查Aria2 有关配置是否正确!`
                                },
                                wait: true
                            });
                        }
                        break;
                    default:
                        throw new Error('未知的下载模式!');
                }
            }
            catch (err) {
                PluginTips.warning({
                    title: { nodeType: 'h2', childs: 'Iwara批量下载工具-选项' },
                    content: {
                        nodeType: 'p',
                        childs: `连接失败, Aria2 连接断开! <br />请检查Aria2 有关配置是否正确!`
                    },
                    wait: true
                });
            }
        }
        configChange(e) {
            this.setState({ [e.name]: e.value });
            if ((e.name == 'DownloadType' && e.value == DownloadType.aria2) || e.name == 'Aria2Type') {
                this.ConnectionAria2(e.value);
            }
            if (e.value != GM_getValue(e.name)) {
                GM_setValue(e.name, e.value);
            }
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
                                    }, {
                                        nodeType: 'div',
                                        style: this.state.style.Line,
                                        childs: [{
                                                nodeType: 'label',
                                                style: this.state.style.inputLabel,
                                                childs: '检查是否存在可能的高画质下载链接：',
                                                title: '有一定概率误判'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'CheckDownloadLink',
                                                type: 'button',
                                                style: this.state.style.input,
                                                attribute: {
                                                    switch: this.state.CheckDownloadLink ? 'off' : 'on'
                                                },
                                                value: this.state.CheckDownloadLink ? '开启' : '关闭',
                                                className: 'switchButton',
                                                onClick: () => this.configChange({ name: 'CheckDownloadLink', value: !this.state.CheckDownloadLink })
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
                                        childs: [
                                            {
                                                nodeType: 'label',
                                                style: this.state.style.radioLabel,
                                                childs: 'Aria2 RPC 连接方式:'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'Aria2Type',
                                                type: 'radio',
                                                value: APIType.http,
                                                onChange: ({ target }) => this.configChange(target)
                                            },
                                            {
                                                nodeType: 'label',
                                                style: this.state.style.radioLabel,
                                                childs: 'http'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'Aria2Type',
                                                type: 'radio',
                                                value: APIType.https,
                                                onChange: ({ target }) => this.configChange(target)
                                            },
                                            {
                                                nodeType: 'label',
                                                style: this.state.style.radioLabel,
                                                childs: 'https'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'Aria2Type',
                                                type: 'radio',
                                                value: APIType.ws,
                                                onChange: ({ target }) => this.configChange(target)
                                            },
                                            {
                                                nodeType: 'label',
                                                style: this.state.style.radioLabel,
                                                childs: 'ws'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'Aria2Type',
                                                type: 'radio',
                                                value: APIType.wss,
                                                onChange: ({ target }) => this.configChange(target)
                                            },
                                            {
                                                nodeType: 'label',
                                                style: this.state.style.radioLabel,
                                                childs: 'wss'
                                            }
                                        ].map((item) => { if (item.value == this.state.Aria2Type) {
                                            item.checked = true;
                                        } return item; })
                                    } : null,
                                    this.state.DownloadType == DownloadType.aria2 ? {
                                        nodeType: 'div',
                                        style: this.state.style.Line,
                                        childs: [{
                                                nodeType: 'label',
                                                style: this.state.style.inputLabel,
                                                childs: 'Aria2 地址:'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'Aria2Path',
                                                value: this.state.Aria2Path,
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
                                                childs: 'Aria2 Token(密钥):'
                                            },
                                            {
                                                nodeType: 'input',
                                                name: 'Aria2Token',
                                                type: 'Password',
                                                value: this.state.Aria2Token,
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
                                                    {
                                                        nodeType: 'h2',
                                                        childs: [
                                                            '下载私有(上锁)视频请使用',
                                                            { nodeType: 'br' },
                                                            {
                                                                nodeType: 'a',
                                                                href: 'https://docs.scriptcat.org/',
                                                                childs: 'ScriptCat'
                                                            },
                                                            ' 或 ',
                                                            {
                                                                nodeType: 'a',
                                                                href: 'https://www.tampermonkey.net/index.php?#download_gcal',
                                                                childs: 'Tampermonkey Beta'
                                                            },
                                                            '载入本脚本。'
                                                        ]
                                                    }, { nodeType: 'br' },
                                                    '全局可用变量： %#Y#% (当前时间[年]) | %#M#% (当前时间[月]) | %#D#% (当前时间[日]) | %#h#% (当前时间[时]) | %#m#% (当前时间[分]) | %#s#% (当前时间[秒])', { nodeType: 'br' },
                                                    '重命名可用变量： %#TITLE#% (标题) | %#ID#% (ID) | %#AUTHOR#% (作者) | %#SOURCE_NAME#% (原文件名) | %#UploadY#% (发布时间[年]) | %#UploadM#% (发布时间[月]) | %#UploadD#% (发布时间[日]) | %#Uploadh#% (发布时间[时]) | %#Uploadm#% (发布时间[分]) | %#Uploads#% (发布时间[秒])', { nodeType: 'br' },
                                                    '下载目录可用变量： %#AUTHOR#% (作者)', { nodeType: 'br' },
                                                    '例: %#Y#%-%#M#%-%#D#%_%#TITLE#%[%#ID#%].MP4', { nodeType: 'br' },
                                                    '结果: ' + replaceVar('%#Y#%-%#M#%-%#D#%_%#TITLE#%[%#ID#%].MP4').replace('%#TITLE#%', '演示标题').replace('%#ID#%', '演示ID'), { nodeType: 'br' },
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
    sourceRender({
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
        .tipsButton {
            border: none;
            padding: 6px 18px;
            margin: 2px 8px;
            cursor: pointer;
            border-radius: 4px;
            float: right;
            transition: border 0.25s linear, color 0.25s linear, background-color 0.25s linear;
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
        h6.stitle{
            white-space: nowrap;
            text-overflow:ellipsis;
            overflow: hidden;
            margin: 0px;
        }
        `,
        parent: document.head
    });
    sourceRender({
        nodeType: 'div',
        attributes: {
            id: 'PluginControlPanel'
        },
        parent: document.body
    });
    sourceRender({
        nodeType: 'div',
        attributes: {
            id: 'PluginUI',
            style: 'display: inline-block;'
        },
        parent: document.querySelector('#user-links')
    });
    let site = `https://${window.location.hostname}`;
    let login = `<a href="${site}/user/login" target="_blank">登录</a>`;
    let signin = `<a href="${site}/user/register" target="_blank">注册</a>`;
    let VideoList = document.querySelectorAll('.node-video');
    let PluginUI = ReactDOM.render(React.createElement(pluginUI), document.getElementById('PluginUI'));
    let PluginControlPanel = ReactDOM.render(React.createElement(pluginControlPanel), document.getElementById('PluginControlPanel'));
    let PluginTips = new pluginTips();
    let DownloadLinkCharacteristics = [
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
        'pixeldrain\.com'
    ];
    function ParseVideoID(data) {
        if (data.getAttribute('linkdata') != null) {
            return data.getAttribute('linkdata').split('?')[0].split('/').pop().toLowerCase();
        }
        else {
            return data.querySelector('.title>a')?.href.toLowerCase().split('?')[0].split('/').pop().toLowerCase();
        }
    }
    async function ManualParseDownloadAddress() {
        let ID = prompt('请输入需要下载的视频ID', '').toLowerCase();
        ID = ID?.match(/((?<=(\[)).*?(?=(\])))/g)?.pop() ?? ID?.match(/((?<=(\_)).*?(?=(\_)))/g)?.pop() ?? ID;
        if (ID != '' && (ID.length > 15 && ID.length < 19)) {
            await ParseDownloadAddress(ID);
        }
        else {
            PluginTips.warning({
                content: {
                    nodeType: 'p',
                    childs: '无法解析出视频ID!'
                }
            });
        }
    }
    async function DownloadSelected() {
        PluginTips.info({
            content: {
                nodeType: 'p',
                childs: '开始解析...'
            }
        });
        let List = document.querySelectorAll('.selectButton[checked="true"]');
        if (PluginControlPanel.state.Async) {
            List.forEach(async (element, index) => {
                await ParseDownloadAddress(ParseVideoID(element));
                if (index == List.length - 1)
                    PluginTips.success({
                        content: {
                            nodeType: 'p',
                            childs: '已全部解析完成!'
                        },
                        wait: true
                    });
            });
        }
        else {
            for (let index = 0; index < List.length; index++) {
                await ParseDownloadAddress(ParseVideoID(List[index]));
            }
            PluginTips.success({
                content: {
                    nodeType: 'p',
                    childs: '已全部解析完成!'
                },
                wait: true
            });
        }
    }
    async function DownloadAll() {
        PluginTips.info({
            content: {
                nodeType: 'p',
                childs: '开始解析...'
            }
        });
        if (document.querySelector('#block-views-videos-block-2') != null) {
            if (document.querySelector('#block-views-videos-block-2 *.more-link') != null) {
                await GetAllData(document.querySelector('.more-link>a').href, [], window.location.href);
            }
            else {
                let videoList = document.querySelectorAll('#block-views-videos-block-2 *.node-video');
                if (PluginControlPanel.state.Async) {
                    videoList.forEach(async (element, index) => {
                        await ParseDownloadAddress(ParseVideoID(element));
                        if (index == videoList.length - 1)
                            PluginTips.success({
                                content: {
                                    nodeType: 'p',
                                    childs: '已全部解析完成!'
                                },
                                wait: true
                            });
                    });
                }
                else {
                    for (let index = 0; index < videoList.length; index++) {
                        await ParseDownloadAddress(ParseVideoID(videoList[index]));
                    }
                    PluginTips.success({
                        content: {
                            nodeType: 'p',
                            childs: '已全部解析完成!'
                        },
                        wait: true
                    });
                }
            }
        }
        else {
            await GetAllData(window.location.href, [], window.location.href);
        }
    }
    async function GetAllData(videoListUrl, data, referrer) {
        let videoListPage = parseDom(await get(videoListUrl, data, referrer));
        let videoList = videoListPage.querySelectorAll('.view-videos *.node-video');
        if (PluginControlPanel.state.Async) {
            videoList.forEach(async (element, index) => {
                await ParseDownloadAddress(ParseVideoID(element));
                if (index == videoList.length - 1) {
                    if (videoListPage.querySelectorAll('.pager-next').length != 0) {
                        await GetAllData(videoListPage.querySelector('.pager-next>a').href, data, referrer);
                    }
                    else {
                        PluginTips.success({
                            content: {
                                nodeType: 'p',
                                childs: '已全部解析完成!'
                            },
                            wait: true
                        });
                    }
                }
            });
        }
        else {
            for (let i = 0; i < videoList.length; i++) {
                await ParseDownloadAddress(ParseVideoID(videoList[i]));
            }
            if (videoListPage.querySelectorAll('.pager-next').length != 0) {
                await GetAllData(videoListPage.querySelector('.pager-next>a').href, data, referrer);
            }
            else {
                PluginTips.success({
                    content: {
                        nodeType: 'p',
                        childs: '已全部解析完成!'
                    },
                    wait: true
                });
            }
        }
    }
    function CheckIsHaveDownloadLink(comment) {
        if (PluginControlPanel.state.CheckDownloadLink) {
            if (comment == null) {
                return false;
            }
            for (let index = 0; index < DownloadLinkCharacteristics.length; index++) {
                if (comment.indexOf(DownloadLinkCharacteristics[index]) != -1) {
                    return true;
                }
            }
        }
        return false;
    }
    async function ParseDownloadAddress(Data, downloadedCheck = true) {
        let videoInfo = new VideoInfo(Data);
        for (const item of VideoList) {
            if (item?.getAttribute('linkdata')?.indexOf(Data) != -1) {
                videoInfo = new VideoInfo(Data, item.querySelector('.title>a')?.innerText ?? item.querySelector('.stitle>a')?.innerText ?? item.getAttribute('data-original-title'), item.querySelector('.username')?.innerText);
                break;
            }
        }
        let videoLink = `<a href="${videoInfo.Url}" ${videoInfo.getName() != null ? `title="${videoInfo.getName()}"` : ''} target="_blank" >${videoInfo.getName() ?? '→ 点击此处，进入视频页面 ←'}</a> <br />`;
        if (downloadedCheck && PluginControlPanel.state.Downloaded.includes(videoInfo.ID)) {
            return PluginTips.dialog({
                content: {
                    nodeType: 'p',
                    childs: `${videoLink} 查询到下载记录, 是否重新下载?`
                },
                id: videoInfo.ID,
                wait: true
            });
        }
        await videoInfo.init();
        videoLink = `<a href="${videoInfo.Url}" ${videoInfo.getName() != null ? `title="${videoInfo.getName()}"` : ''} target="_blank" >${videoInfo.getName() ?? '→ 点击此处，进入视频页面 ←'}</a> <br />`;
        if (!videoInfo.Exist) {
            return PluginTips.warning({
                content: {
                    nodeType: 'p',
                    childs: `${videoLink}未能获取到相关信息，请检查视频是否存在。`
                },
                wait: true
            });
        }
        if (videoInfo.Private) {
            return PluginTips.warning({
                content: {
                    nodeType: 'p',
                    childs: `检测到无权限访问的私有(上锁)视频! <br />
                    ${document.querySelector('.btn.btn-info.btn-sm.user') == null ? `请${login}或${signin}后进入视频页面与作者成为好友获得访问权限。<br />` : '请进入视频页面与作者成为好友获得访问权限。<br />'}
                    ${videoLink}`
                },
                wait: true
            });
        }
        if (CheckIsHaveDownloadLink(videoInfo.getComment())) {
            return PluginTips.warning({
                content: {
                    nodeType: 'p',
                    childs: `${videoLink}发现疑似第三方高画质下载链接,请手动处理!`
                },
                wait: true
            });
        }
        if (videoInfo.getDownloadQuality() != 'Source') {
            return PluginTips.warning({
                content: {
                    nodeType: 'p',
                    childs: `${videoLink} 没有解析到原画下载地址,请手动处理!`
                },
                wait: true
            });
        }
        SendDownloadRequest(videoInfo, PluginControlPanel.Cookies);
        PluginControlPanel.configChange({ name: "Downloaded", value: PluginControlPanel.state.Downloaded.concat([videoInfo.ID]) });
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
                PluginTips.info({
                    content: {
                        nodeType: 'p',
                        childs: `<a href="${Info.Url}" ${Info.getName() != null ? `title="${Info.getName()}"` : ''} target="_blank" >${Info.getName() ?? '→ 点击此处，进入视频页面 ←'}</a> <br />下载请求已提交给浏览器!`
                    }
                });
                GM_openInTab(Info.getDownloadUrl(), { active: true, insert: true, setParent: true });
                break;
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
                    PluginTips.success({
                        content: {
                            nodeType: 'p',
                            childs: `${Name} 下载完成!`
                        }
                    });
                },
                onerror: function (error) {
                    PluginTips.downloadComplete(ID);
                    return PluginTips.warning({
                        content: {
                            nodeType: 'p',
                            childs: `${Name} 没下载失败! <br />错误报告: ${JSON.stringify(error)}`
                        },
                        wait: true
                    });
                },
                onprogress: function (progress) {
                    if (progress.lengthComputable) {
                        PluginTips.downloading(ID, progress.position / progress.totalSize * 100);
                    }
                },
                ontimeout: function () {
                    PluginTips.downloadComplete(ID);
                    return PluginTips.warning({
                        content: {
                            nodeType: 'p',
                            childs: `${Name} 下载超时! `
                        },
                        wait: true
                    });
                }
            };
            if (PluginTips.DownloadingQueue.length() < 4) {
                PluginTips.DownloadingQueue.push({ id: ID, name: Name, task: Task });
                GM_download(Task);
                if (GM_info.downloadMode == 'native') {
                    PluginTips.progress({ title: { nodeType: 'h2', childs: `${Name} 下载中...` }, id: ID });
                }
                else {
                    PluginTips.info({
                        content: {
                            nodeType: 'p',
                            childs: `${Name} 已开始下载!`
                        }
                    });
                }
            }
            else {
                PluginTips.WaitingQueue.push({ id: ID, name: Name, task: Task });
            }
        }(Info.ID, `<a href="${Info.Url}" ${Info.getName() != null ? `title="${Info.getName()}"` : ''} target="_blank" >${Info.getName() ?? '→ 点击此处，进入视频页面 ←'}</a>`, Info.getFileName(), Info.getDownloadUrl()));
    }
    function aria2Download(Info, Cookies) {
        (function (ID, Name, FileName, Author, Cookie, DownloadUrl) {
            let json = JSON.stringify({
                'jsonrpc': '2.0',
                'method': 'aria2.addUri',
                'id': PluginControlPanel.state.Aria2ID,
                'params': [
                    'token:' + PluginControlPanel.state.Aria2Token,
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
            });
            switch (APIType[PluginControlPanel.state.Aria2Type]) {
                case APIType[APIType.http]:
                case APIType[APIType.https]:
                    post(APIType[PluginControlPanel.state.Aria2Type] + '://' + PluginControlPanel.state.Aria2Path + '/jsonrpc', json);
                    break;
                case APIType[APIType.ws]:
                case APIType[APIType.wss]:
                    PluginControlPanel.Aria2WebSocket.send(json);
                    break;
            }
            PluginTips.info({
                content: {
                    nodeType: 'p',
                    childs: `${Name} 下载任务已推送到Aria2!`
                }
            });
        }(Info.ID, `<a href="${Info.Url}" ${Info.getName() != null ? `title="${Info.getName()}"` : ''} target="_blank" >${Info.getName() ?? '→ 点击此处，进入视频页面 ←'}</a> <br />`, Info.getFileName(), Info.getAuthor(), Cookies, Info.getDownloadUrl()));
    }
    function replaceVar(data, time = new Date()) {
        let gVar = [
            { 'Y': new Date().getFullYear() },
            { 'M': new Date().getMonth() + 1 },
            { 'D': new Date().getDate() },
            { 'h': new Date().getHours() },
            { 'm': new Date().getMinutes() },
            { 's': new Date().getSeconds() },
            { 'UploadY': time.getFullYear() },
            { 'UploadM': time.getMonth() + 1 },
            { 'UploadD': time.getDate() },
            { 'Uploadh': time.getHours() },
            { 'Uploadm': time.getMinutes() },
            { 'Uploads': time.getSeconds() }
        ];
        for (let i = 0; i < gVar.length; i++) {
            for (const d in gVar[i]) {
                data = data.replace(new RegExp('%#' + d + '#%', 'g'), gVar[i][d]);
            }
        }
        return data;
    }
    if (!PluginControlPanel.Initialize) {
        PluginControlPanel.show();
    }
    for (let index = 0; index < VideoList.length; index++) {
        const video = VideoList[index];
        if (video.classList.contains('node-full')) {
            continue;
        }
        let videoLink = video.querySelector('.even>a');
        if (videoLink != null) {
            video.setAttribute('linkdata', videoLink.href ?? video.querySelector('.title>a').href);
            videoLink.removeAttribute('href');
            if (video.querySelector('img[src*="/"]') == null) {
                videoLink.append(sourceRender({
                    nodeType: 'img',
                    attributes: {
                        src: "https://oreno3d.com/storage/img/noimage.png"
                    }
                }));
            }
            if (video.querySelector('.title') == null) {
                sourceRender({
                    nodeType: 'h6',
                    className: 'stitle',
                    childs: {
                        nodeType: 'a',
                        attributes: {
                            href: video.getAttribute('linkdata')
                        },
                        innerText: video.getAttribute('title') == '' ? video.getAttribute('data-original-title') : video.getAttribute('title')
                    },
                    parent: video
                });
            }
        }
        if (video.querySelector('.field-name-field-video-url') != null) {
            PluginTips.warning({
                content: {
                    nodeType: 'p',
                    childs: `因视频非本站源跳过该视频:${video.querySelector('.title>a')?.innerText ?? video.querySelector('.stitle>a')?.innerText ?? video.getAttribute('data-original-title')}`
                }
            });
            continue;
        }
        video.ondblclick = () => {
            video.setAttribute('checked', video.getAttribute('checked') == 'false' ? 'true' : 'false');
        };
        video.setAttribute('checked', 'false');
        video.classList.add('selectButton');
    }
    if (document.querySelectorAll('.selectButton').length == 0 && window.location.href.search('iwara.tv/videos') != -1 && PluginControlPanel.state.AutoRefresh) {
        PluginTips.warning({
            content: {
                nodeType: 'p',
                childs: '未找到可供下载的视频，10秒后尝试重新加载页面...(本功能可在设置中关闭或开启)'
            },
            wait: true
        });
        setTimeout(() => {
            window.location.reload();
        }, 10000);
    }
    try {
        switch (PluginControlPanel.state.DownloadType) {
            case DownloadType.aria2:
                PluginControlPanel.ConnectionAria2(PluginControlPanel.state.Aria2Type);
                break;
            case DownloadType.default:
                PluginTips.warning({
                    content: {
                        nodeType: 'p',
                        childs: '该下载模式为实验性模式，无法保证下载稳定性！'
                    }
                });
                break;
            case DownloadType.others:
                break;
            default:
                throw new Error('未知的下载模式!');
        }
        PluginUI.downloadSwitch(true);
        PluginTips.success({
            content: {
                nodeType: 'p',
                childs: '加载完成!'
            }
        });
    }
    catch (error) {
        PluginTips.warning({
            content: {
                nodeType: 'p',
                childs: `加载失败! <br /> 错误信息: ${error}`
            }
        });
    }
})();
//# sourceMappingURL=IwaraDownloadTool.user.js.map