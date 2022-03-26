// ==UserScript==
// @name           Iwara 批量下载工具
// @name:en        Iwara Download Tool
// @name:ja        Iwara バッチダウンローダー
// @description    批量下载 Iwara 视频
// @description:en Download videos from iwara.tv
// @description:ja Iwara 動画バッチをダウンロード
// @namespace      https://github.com/dawn-lc/user.js
// @icon           https://iwara.tv/sites/all/themes/main/img/logo.png
// @version        2.0.18
// @author         dawn-lc
// @license        Apache-2.0
// @connect        iwara.tv
// @match          *://*.iwara.tv/*
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_listValues
// @grant          GM_deleteValue
// @grant          GM_addValueChangeListener
// @grant          GM_removeValueChangeListener
// @grant          GM_addStyle
// @grant          GM_getResourceText
// @grant          GM_download
// @grant          GM_xmlhttpRequest
// @grant          GM_openInTab
// @grant          GM_info
// @grant          GM_cookie
// @grant          unsafeWindow
// @require        https://lf6-cdn-tos.bytecdntp.com/cdn/expire-1-M/react/16.13.1/umd/react.production.min.js
// @require        https://lf26-cdn-tos.bytecdntp.com/cdn/expire-1-M/react-dom/16.13.1/umd/react-dom.production.min.js
// ==/UserScript==
(async function () {
    function UUID() {
        let UUID = '';
        for (let index = 0; index < 8; index++) {
            UUID += (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
        }
        return UUID
    }
    function getType(obj: any) {
        return Object.prototype.toString.call(obj).split(' ')[1].slice(0, -1)
    }
    function sourceRender(vdata: RenderCode | Array<RenderCode>): any {
        let RenderDOM: HTMLElement
        if (vdata instanceof Array) return vdata.map((item: RenderCode) => sourceRender(item))
        for (const item in vdata) {
            switch (item) {
                case 'nodeType':
                    RenderDOM = document.createElement(vdata.nodeType)
                    break
                case 'attribute':
                    for (const key in vdata.attribute) {
                        RenderDOM.setAttribute(key, vdata.attribute[key])
                    }
                    break
                case 'className':
                    if (getType(vdata.className) == 'Array') {
                        RenderDOM.className = (vdata.className as Array<string>).join(' ')
                    } else {
                        RenderDOM.className = vdata.className.toString()
                    }
                    break
                case 'childs':
                    switch (getType(vdata.childs)) {
                        case 'Array':
                            vdata.childs.forEach((child: any) => {
                                if (child instanceof HTMLElement) {
                                    RenderDOM.appendChild(child)
                                } else if (getType(child) == 'string') {
                                    RenderDOM.insertAdjacentHTML('beforeend', child)
                                } else {
                                    RenderDOM.appendChild(sourceRender(child))
                                }
                            })
                            break
                        case 'String':
                            RenderDOM.insertAdjacentHTML('beforeend', vdata.childs)
                            break
                        default:
                            RenderDOM.appendChild(sourceRender(vdata.childs))
                            break
                    }
                    break
                case 'parent':
                    vdata.parent.appendChild(RenderDOM)
                    break
                case 'before':
                    vdata.before.insertBefore(RenderDOM, vdata.before.childNodes[0])
                    break
                default:
                    if (vdata[item] instanceof Object && RenderDOM[item]) {
                        Object.entries(vdata[item]).forEach(([k, v]) => {
                            RenderDOM[item][k] = v
                        })
                    } else {
                        RenderDOM[item] = vdata[item]
                    }
                    break
            }
        }
        return RenderDOM
    }
    function reactRender(vdata: RenderCode | any, index?: any) {
        let VirtualDOM: RenderData;
        if (vdata != null && vdata.nodeType != undefined) {
            VirtualDOM = { type: vdata.nodeType }
            delete vdata.nodeType
            if (vdata.childs != undefined) {
                if (VirtualDOM.children == undefined) VirtualDOM.children = []
                if (vdata.childs instanceof Array) {
                    VirtualDOM.children = React.Children.toArray(vdata.childs.map((item: any) => reactRender(item)))
                } else {
                    VirtualDOM.children.push(reactRender(vdata.childs))
                }
                delete vdata.childs
            }
            if (VirtualDOM.props == undefined) VirtualDOM.props = {}
            if (vdata.className != undefined) {
                VirtualDOM.props = Object.assign({ className: vdata.className }, VirtualDOM.props);
                delete vdata.className
            }
            if (vdata.attribute != undefined) {
                VirtualDOM.props = Object.assign(vdata.attribute, VirtualDOM.props);
                delete vdata.attribute
            }
            if (index != undefined) VirtualDOM.props = Object.assign({ key: index }, VirtualDOM.props)
            for (const key in vdata) {
                VirtualDOM.props[key] = vdata[key]
                delete vdata[key]
            }
        } else {
            return vdata
        }
        return React.createElement(VirtualDOM.type, VirtualDOM.props, VirtualDOM.children || undefined);
    }
    async function get(url: string, parameter: string[] = [], referrer: string = window.location.hostname, headers: object = {}) {
        if (parameter.length != 0) {
            url += '?'
            for (var key in parameter) {
                url += key + '=' + parameter[key] + '&'
            }
            url = url.substring(0, url.length - 1)
        }
        let responseData: any
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
            })
            if (responseData.status >= 200 && responseData.status < 300) {
                const contentType = responseData.headers.get('Content-Type')
                if (contentType != null) {
                    if (contentType.indexOf('text') > -1) {
                        return await responseData.text()
                    }
                    if (contentType.indexOf('form') > -1) {
                        return await responseData.formData()
                    }
                    if (contentType.indexOf('video') > -1) {
                        return await responseData.blob()
                    }
                    if (contentType.indexOf('json') > -1) {
                        return await responseData.json()
                    }
                }
                return responseData
            }
        } else {
            responseData = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    headers: Object.assign({
                        'accept': 'application/json, text/plain, */*',
                        'cache-control': 'no-cache',
                        'content-type': 'application/x-www-form-urlencoded',
                    }, headers),
                    onload: function (response: any) {
                        resolve(response)
                    },
                    onerror: function (error: any) {
                        reject(error)
                    }
                })
            })
            if (responseData.status >= 200 && responseData.status < 300) {
                let headers = new Map()
                responseData.responseHeaders.split('\r\n').forEach((element: any) => {
                    element = element.split(': ')
                    headers.set(element[0], element[1])
                })
                responseData.headers = headers
                return responseData
            }
        }
    }
    async function post(url: string, parameter: any, referrer: string) {
        referrer = referrer || window.location.href
        if (typeof parameter == 'object') parameter = JSON.stringify(parameter)
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
        })
        if (responseData.status >= 200 && responseData.status < 300) {
            const contentType = responseData.headers.get('Content-Type')
            if (contentType != null) {
                if (contentType.indexOf('text') > -1) {
                    return await responseData.text()
                }
                if (contentType.indexOf('form') > -1) {
                    return await responseData.formData()
                }
                if (contentType.indexOf('video') > -1) {
                    return await responseData.blob()
                }
                if (contentType.indexOf('json') > -1) {
                    return await responseData.json()
                }
            }
            return responseData.text()
        }
    }
    function parseDom(dom: string) {
        return new DOMParser().parseFromString(dom, 'text/html')
    }
    function getQueryVariable(query: string, variable: string) {
        let vars = query.split('&')
        for (let i = 0; i < vars.length; i++) {
            let pair = vars[i].split('=')
            if (pair[0] == variable) { return pair[1]; }
        }
        return null
    }
    enum DownloadType {
        aria2,
        default,
        others
    }
    enum TipsType {
        Info,
        Warning,
        Success,
        Progress
    }
    class Queue {
        queue: [];
        push: (data: any) => void;
        pop: () => any;
        remove: (id: any) => void;
        length: () => number;
        clear: () => void;
        constructor() {
            this.queue = []
            this.push = function (data) {
                this.queue.unshift(data as never)
            }
            this.pop = function () {
                return this.queue.pop()
            }
            this.remove = function (id) {
                let index = this.queue.indexOf(id as never)
                if (index > -1) {
                    this.queue.splice(index, 1)
                }
            }
            this.length = function () {
                return this.queue.length
            }
            this.clear = function () {
                this.queue = []
            }
        }
    }
    class pluginTips {
        WaitingQueue: Queue
        DownloadingQueue: Queue
        static typeIcon: object = {
            Info: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
            Warning: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
            Success: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
            Progress: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>'
        }
        static Container: HTMLElement = sourceRender({
            nodeType: 'section',
            attribute: {
                id: 'PluginTips'
            },
            className: 'tipsContainer',
            parent: document.body
        })
        constructor() {
            this.DownloadingQueue = new Queue()
            this.WaitingQueue = new Queue()
        }
        downloadComplete(id: string, name?: string) {
            this.DownloadingQueue.remove(id)
            pluginTips.Container.children.namedItem(id).remove()
            if (this.WaitingQueue.length() > 0) {
                let downloadTask = this.WaitingQueue.pop()
                if (GM_info.downloadMode == 'native') {
                    this.progress(downloadTask.name + ' 下载中...', { id: downloadTask.id })
                } else {
                    this.info('下载', downloadTask.name + ' 已开始下载!')
                }
                this.DownloadingQueue.push(downloadTask.task)
                GM_download(downloadTask.task)
            }
        }
        downloading(id: string, value: number) {
            let downloadTask = pluginTips.Container.children.namedItem(id).querySelector('.value') as HTMLElement
            downloadTask.setAttribute('value', value.toFixed(2))
            downloadTask.style.width = value.toFixed(2) + '%'
        }
        info(title: string, content: string, wait: boolean = false) {
            console.info('Iwara 批量下载工具', content)
            new tips(TipsType.Info, title, content, wait)
        }
        warning(title: string, content: string, wait: boolean = false) {
            console.warn('Iwara 批量下载工具', content)
            new tips(TipsType.Warning, title, content, wait)
        }
        success(title: string, content: string, wait: boolean = false) {
            console.log('Iwara 批量下载工具', content)
            new tips(TipsType.Success, title, content, wait)
        }
        progress(title: string, content: any) {
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
            }, true, content.id)
        }
    }
    class tips {
        id: string;
        type: TipsType
        wait: boolean
        constructor(type: TipsType, title: string, content: string | RenderCode, wait: boolean = false, id: string = null) {
            this.type = type
            this.id = id
            this.wait = wait
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
            }, this.style(), this.attribute(), this.event()))
        }
        event() {
            return {
                onclick: (e: any) => {
                    if (this.wait) {
                        if (this.type != TipsType.Progress) {
                            e.currentTarget.remove()
                        }
                    } else {
                        e.currentTarget.remove()
                    }
                },
                onanimationend: (e: any) => {
                    if (!this.wait) {
                        e.currentTarget.remove()
                    }
                }
            }
        }
        style() {
            let style = {
                className: ['tips']
            }
            style.className.push('tips' + TipsType[this.type])
            if (this.wait) {
                style.className.push('tipsWait')
            } else {
                style.className.push('tipsActive')
            }
            return style
        }
        attribute() {
            if (this.id != undefined) {
                return {
                    attribute: {
                        id: this.id
                    }
                }
            } else {
                return {}
            }
        }
    }
    class VideoInfo {
        Url: string
        ID: string
        Page: Document
        Source: Array<any>
        Private: boolean = true
        getAuthor: () => string
        getName: () => string
        getDownloadQuality: () => string
        getDownloadUrl: () => string
        getSourceFileName: () => string | null
        getComment: () => string
        getLock: () => boolean
        getFileName: () => string;
        constructor(videoID: string) {
            this.ID = videoID.toLowerCase()
            this.Url = 'https://' + window.location.hostname + '/videos/' + this.ID
            return this;
        }
        async init(cooike: object = {}) {
            this.Page = parseDom(await get(this.Url, [], window.location.href, cooike))
            if (this.Page.querySelector('.well') == null) {
                this.Private = false
            } else {
                if (cooike['cooike'] == undefined) await this.init({ 'cooike': Cookies })
                return
            }
            this.Source = await get('https://' + window.location.hostname + '/api/video/' + this.ID, [], this.Url, cooike)
            this.getAuthor = function () {
                return (this.Page.querySelector('.submitted').querySelector('a.username') as HTMLElement).innerText
            }
            this.getName = function () {
                return (this.Page.querySelector('.submitted').querySelector('h1.title') as HTMLElement).innerText
            }
            this.getFileName = function () {
                return replaceVar(PluginControlPanel.state.FileName).replace('%#TITLE#%', this.getName()).replace('%#ID#%', this.ID).replace('%#AUTHOR#%', this.getAuthor().replace(/[\\\\/:*?\"<>|.]/g, '_')).replace('%#SOURCE_NAME#%', this.getSourceFileName())
            }
            this.getDownloadQuality = function () {
                if (this.Source.length == 0) return 'null'
                return this.Source[0].resolution
            }
            this.getDownloadUrl = function () { return decodeURIComponent('https:' + this.Source.find(x => x.resolution == this.getDownloadQuality()).uri) }
            this.getSourceFileName = function () { return getQueryVariable(this.getDownloadUrl(), 'file').split('/')[3] }
            this.getComment = function () {
                let commentNode : Array<any>
                try {
                    commentNode = Array.from(this.Page.querySelector('.node-info').querySelector('.field-type-text-with-summary.field-label-hidden').querySelectorAll('.field-item.even'))
                } catch (error) {
                    return ''
                }
                return commentNode.map((element: Element) => (element as HTMLElement).innerText).join('\n')
            }
        }
    }
    class pluginUI extends React.Component {
        declare state: any
        showCondition: boolean
        constructor(props: any) {
            super(props)
            this.showCondition = false
            this.state = {
                style: {
                    base: { cursor: 'pointer' },
                    disable: { display: 'none' }
                },
                main: 'btn-group',
                downloadAllEnable: false,
                downloadSelectedEnable: false
            }
        }
        show() {
            this.showCondition = true
            this.setState({
                main: 'btn-group open'
            })
        }
        hide() {
            this.showCondition = false
            this.setState({
                main: 'btn-group'
            })
        }
        downloadAllEnabled() {
            this.setState({
                downloadAllEnable: true
            })
        }
        downloadSelectedEnabled() {
            this.setState({
                downloadSelectedEnable: true
            })
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
                    onClick: () => { if (this.showCondition) { this.hide() } else { this.show() } }
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
                                this.hide()
                                DownloadSelected()
                            }
                        } : null,
                        this.state.downloadAllEnable ? {
                            nodeType: 'li',
                            attribute: {
                                style: this.state.style.base,
                                dangerouslySetInnerHTML: { __html: '<a><span class="glyphicon glyphicon-save"></span>下载所有</a>' }
                            },
                            onClick: () => {
                                this.hide()
                                DownloadAll()
                            }
                        } : null,
                        {
                            nodeType: 'li',
                            attribute: {
                                style: this.state.style.base,
                                dangerouslySetInnerHTML: { __html: '<a><span class="glyphicon glyphicon-edit"></span>手动下载</a>' }
                            },
                            onClick: () => {
                                this.hide()
                                ManualParseDownloadAddress()
                            }
                        }, {
                            nodeType: 'li',
                            attribute: {
                                style: this.state.style.base,
                                dangerouslySetInnerHTML: { __html: '<a><span class="glyphicon glyphicon-cog"></span>设置</a>' }
                            },
                            onClick: () => {
                                this.hide()
                                PluginControlPanel.show()
                            }
                        }]
                }]
            }))
        }
    }
    class pluginControlPanel extends React.Component {
        synclistener: Array<any>;
        declare state: any;
        Aria2WebSocket: WebSocket;
        constructor(props: any) {
            super(props)
            this.synclistener = []
            this.state = {
                Initialize: GM_getValue('Initialize', false),
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
                        lineHeight: '1'
                    },
                    input: {
                        flex: 1,
                        minWidth: 0,
                        font: 'menu',
                        verticalAlign: 'middle'
                    },
                    main: { display: 'none' }
                }
            }
        }
        show() {
            this.setState((state: any) => {
                return {
                    style: Object.assign(state.style, {
                        main: { display: 'block' }
                    })
                }
            })
        }
        hide() {
            if (this.state.Initialize) {
                this.setState((state: any) => {
                    return {
                        style: Object.assign(state.style, {
                            main: { display: 'none' }
                        })
                    }
                })
            } else {
                switch (this.state.DownloadType) {
                    case DownloadType.aria2:
                        if (/((((ws|wss):(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/.test(this.state.WebSocketAddress) && this.state.WebSocketToken != '') {
                            this.configChange({ name: 'Initialize', value: true })
                            this.hide()
                        }
                        break
                    case DownloadType.default:
                    case DownloadType.others:
                    default:
                        this.configChange({ name: 'Initialize', value: true })
                        this.hide()
                        break
                }
            }
        }
        componentDidMount() {
            let values = GM_listValues()
            for (let index = 0; index < values.length; index++) {
                this.synclistener.push(GM_addValueChangeListener(values[index]!, (name: string, old_value: any, new_value: any, remote: boolean) => {
                    if (remote && (new_value != this.state[name])) {
                        this.setState({ [name]: new_value })
                        if (name == 'DownloadType' && this.state[name] == DownloadType.aria2 && /((((ws|wss):(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/.test(this.state['WebSocketAddress'])) {
                            if (this.Aria2WebSocket != undefined) {
                                this.Aria2WebSocket.close()
                            }
                            this.ConnectionWebSocket()
                        }
                    }
                }))
            }
        }
        componentWillUnmount() {
            this.Aria2WebSocket.close()
            for (let index = 0; index < this.synclistener.length; index++) {
                GM_removeValueChangeListener(this.synclistener[index])
            }
        }
        ConnectionWebSocket() {
            try {
                PluginTips.info('Aria2 RPC', '正在连接...')
                this.Aria2WebSocket = new WebSocket(this.state.WebSocketAddress + 'jsonrpc')
                this.Aria2WebSocket.onopen = wsopen
                this.Aria2WebSocket.onmessage = wsmessage
                this.Aria2WebSocket.onclose = wsclose
            } catch (err) {
                this.state.Initialize = false
                PluginTips.warning('Aria2 RPC', '连接 Aria2 RPC 时出现错误! <br />请检查Aria2 RPC WebSocket地址是否正确(尽量使用wss而非ws) <br />' + err)
            }
            function wsopen() {
                PluginTips.success('Aria2 RPC', '连接成功!')
            }
            function wsmessage() {
                //todo 接收信息
            }
            function wsclose() {
                PluginTips.warning('Aria2 RPC', '连接断开! <br />请检查Aria2 RPC WebSocket地址是否正确(尽量使用wss而非ws)')
            }
        }
        configChange(e: any) {
            this.setState({ [e.name]: e.value })
            if (e.name == 'DownloadType' && e.value == DownloadType.aria2 && /((((ws|wss):(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/.test(this.state['WebSocketAddress'])) {
                if (this.Aria2WebSocket != undefined) {
                    this.Aria2WebSocket.close()
                }
                this.ConnectionWebSocket()
            }
            GM_setValue(e.name, e.value)
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
                            this.hide()
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
                                onChange: ({ target }: any) => this.configChange(target)
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
                                onChange: ({ target }: any) => this.configChange(target)
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
                                onChange: ({ target }: any) => this.configChange(target)
                            },
                            {
                                nodeType: 'label',
                                style: this.state.style.radioLabel,
                                childs: '其他下载器'
                            }].map((item: any) => { if (item.value == this.state.DownloadType) { item.checked = true } return item })
                        },
                        this.state.DownloadType != DownloadType.others ? {
                            nodeType: 'div',
                            style: this.state.style.Line,
                            childs: [{
                                nodeType: 'label',
                                style: this.state.style.inputLabel,
                                childs: '重命名:',
                            },
                            {
                                nodeType: 'input',
                                name: 'FileName',
                                type: 'text',
                                value: this.state.FileName,
                                style: this.state.style.input,
                                onChange: ({ target }: any) => this.configChange(target)
                            }
                            ]
                        } : null,  
                        this.state.DownloadType == DownloadType.aria2 ? {
                            nodeType: 'div',
                            style: this.state.style.Line,
                            childs: [{
                                nodeType: 'label',
                                style: this.state.style.inputLabel,
                                childs: '下载到:',
                            },
                            {
                                nodeType: 'input',
                                name: 'DownloadDir',
                                value: this.state.DownloadDir,
                                style: this.state.style.input,
                                onChange: ({ target }: any) => this.configChange(target)
                            }
                            ]
                        } : null,
                        this.state.DownloadType == DownloadType.aria2 ?  {
                            nodeType: 'div',
                            style: this.state.style.Line,
                            childs: [{
                                nodeType: 'label',
                                style: this.state.style.inputLabel,
                                childs: '代理服务器(可选):',
                            },
                            {
                                nodeType: 'input',
                                name: 'DownloadProxy',
                                value: this.state.DownloadProxy,
                                style: this.state.style.input,
                                onChange: ({ target }: any) => this.configChange(target)
                            }
                            ]
                        }: null,
                        this.state.DownloadType == DownloadType.aria2 ? {
                            nodeType: 'div',
                            style: this.state.style.Line,
                            childs: [{
                                nodeType: 'label',
                                style: this.state.style.inputLabel,
                                childs: 'Aria2 RPC WebSocket:',
                            },
                            {
                                nodeType: 'input',
                                name: 'WebSocketAddress',
                                value: this.state.WebSocketAddress,
                                style: this.state.style.input,
                                onChange: ({ target }: any) => this.configChange(target)
                            }
                            ]
                        } : null,
                        this.state.DownloadType == DownloadType.aria2 ? {
                            nodeType: 'div',
                            style: this.state.style.Line,
                            childs: [{
                                nodeType: 'label',
                                style: this.state.style.inputLabel,
                                childs: 'Aria2 RPC Token(密钥):',
                            },
                            {
                                nodeType: 'input',
                                name: 'WebSocketToken',
                                type: 'Password',
                                value: this.state.WebSocketToken,
                                style: this.state.style.input,
                                onChange: ({ target }: any) => this.configChange(target)
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
            }))
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
        }])
    let PluginUI = ReactDOM.render(React.createElement(pluginUI), document.getElementById('PluginUI'))
    let PluginControlPanel = ReactDOM.render(React.createElement(pluginControlPanel), document.getElementById('PluginControlPanel'))
    let PluginTips = new pluginTips()
    let Cookies = document.cookie
    try {
        GM_cookie('list', { domain: 'iwara.tv', httpOnly: true }, (list, error) => {
            if (error) {
                PluginTips.warning('警告', '获取HttpOnly Cookie失败！<br />错误：' + error.toString(), true)
            } else {
                list.forEach(Cookie => {
                    if (Cookie.httpOnly == true) Cookies += Cookie.name + '=' + Cookie.value + '; '
                })
            }
        })
    } catch (error) {
        PluginTips.warning('警告', '获取HttpOnly Cookie失败！<br />如需下载私有(上锁)视频，请尝试使用Tampermonkey Beta载入本脚本。', true)
    }
    let DownloadLinkCharacteristics = [
        'http',
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
    ]
    function ParseVideoID(data: Element) {
        return data.getAttribute('linkdata').split('?')[0].split('/')[4].toLowerCase()
    }
    async function ManualParseDownloadAddress() {
        let ID = prompt('请输入需要下载的视频ID', '')
        if (ID!.split('_')[1] != undefined) {
            ID = ID!.split('_')[1]
        }
        await ParseDownloadAddress(ID!)
        PluginTips.success('下载', '解析完成!')
    }
    async function DownloadSelected() {
        PluginTips.info('下载', '开始解析...')
        let videoList =  document.querySelectorAll('.selectButton[checked="true"]')
        videoList.forEach(async (element: Element, index: number) => {
            await ParseDownloadAddress(ParseVideoID(element))
            if (index == videoList.length - 1) PluginTips.success('下载', '已全部解析完成!')
        })
    }
    async function DownloadAll() {
        PluginTips.info('下载', '正在解析...')
        if (document.querySelector('#block-views-videos-block-2').querySelector('.more-link') != null) {
            await GetAllData(document.querySelector('.more-link').querySelector('a').href, [], window.location.href)
        } else {
            let videoList = document.querySelector('#block-views-videos-block-2').querySelectorAll('.node-video')
            videoList.forEach(async (element: Element, index: number) => {
                await ParseDownloadAddress(ParseVideoID(element))
                if (index == videoList.length - 1) PluginTips.success('下载', '已全部解析完成!')
            })
        }
    }
    async function GetAllData(videoListUrl: string, data: string[], referrer: string) {
        let videoListPage = parseDom(await get(videoListUrl, data, referrer))
        let videoList = videoListPage.querySelector('.view-videos').querySelectorAll('.node-video')
        videoList.forEach(async (element: Element, index: number) => {
            await ParseDownloadAddress(ParseVideoID(element))
            if (index == videoList.length - 1) {
                if (videoListPage.querySelectorAll('.pager-next').length != 0) {
                    await GetAllData(videoListPage.querySelector('.pager-next').querySelector('a').href, data, referrer)
                } else {
                    PluginTips.success('下载', '已全部解析完成!')
                }
            } 
        })
    }
    function CheckIsHaveDownloadLink(comment: string) {
        if (comment == null) return false
        for (let index = 0; index < DownloadLinkCharacteristics.length; index++) {
            if (comment.indexOf(DownloadLinkCharacteristics[index]) != -1) return true
        }
        return false
    }
    async function ParseDownloadAddress(Data: string) {
        let videoInfo = new VideoInfo(Data)
        await videoInfo.init()
        if (videoInfo.Private) {
            let TipsText = '检测到无权限访问的私有(上锁)视频! <br />'
            if (document.querySelector('.btn.btn-info.btn-sm.user') == null) {
                TipsText += '请<a href="https://' + window.location.hostname + '/user/login" target="_blank" >登录</a>或<a href="https://' + window.location.hostname + '/user/register" target="_blank">注册</a>后进入视频页面与作者成为好友获得访问权限。<br />'
            } else {
                TipsText += '请进入视频页面与作者成为好友获得访问权限。<br />'
            }
            PluginTips.warning('警告', TipsText + '<a href="' + videoInfo.Url + '" target="_blank" > → 点击此处，进入视频页面 ← </a>', true)
        } else {
            if (CheckIsHaveDownloadLink(videoInfo.getComment())) {
                PluginTips.warning('警告', '<a href="' + videoInfo.Url + '" title="' + videoInfo.getName() + '" target="_blank" >' + videoInfo.getName() + '</a> <br />发现疑似第三方高画质下载链接,请手动处理!', true)
            } else {
                if (videoInfo.getDownloadQuality() != 'Source') {
                    PluginTips.warning('警告', '<a href="' + videoInfo.Url + '" title="' + videoInfo.getName() + '" target="_blank" >' + videoInfo.getName() + '</a> <br />没有解析到原画下载地址,请手动处理!', true)
                } else {
                    SendDownloadRequest(videoInfo, Cookies)
                }
            }
        }
    }
    function defaultDownload(Info: VideoInfo) {
        (function (ID, Name, FileName, DownloadUrl) {
            let Task = {
                url: DownloadUrl,
                name: FileName,
                saveAs: false,
                onload: function () {
                    PluginTips.downloadComplete(ID)
                    PluginTips.success('下载', Name + ' 下载完成!')
                },
                onerror: function (error: any) {
                    PluginTips.downloadComplete(ID)
                    PluginTips.warning('下载', Name + ' 下载失败! <br />错误报告: ' + JSON.stringify(error))
                },
                onprogress: function (progress: { lengthComputable: any, position: number, totalSize: number }) {
                    if (progress.lengthComputable) {
                        PluginTips.downloading(ID, progress.position / progress.totalSize * 100)
                    }
                },
                ontimeout: function () {
                    PluginTips.downloadComplete(ID)
                    PluginTips.warning('下载', Name + ' 下载超时! ')
                }
            }
            if (PluginTips.DownloadingQueue.length() < 4) {
                PluginTips.DownloadingQueue.push({ id: ID, name: Name, task: Task })
                GM_download(Task)
                if (GM_info.downloadMode == 'native') {
                    PluginTips.progress(Name + ' 下载中...', {
                        id: ID
                    })
                } else {
                    PluginTips.info('下载', Name + ' 已开始下载!')
                }
            } else {
                PluginTips.WaitingQueue.push({ id: ID, name: Name, task: Task })
            }
        }(Info.ID, Info.getName(), Info.getFileName(), Info.getDownloadUrl()))
    }
    function aria2Download(Info: VideoInfo, Cookies: string) {
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
                        'dir': replaceVar(PluginControlPanel.state.DownloadDir).replace('%#AUTHOR#%',Author.replace(/[\\\\/:*?\"<>|.]/g, '_')),
                        'all-proxy': PluginControlPanel.state.DownloadProxy
                    }

                ]
            }))
            PluginTips.info('提示', '已将 ' + Name + ' 的下载地址推送到Aria2!')
        }(Info.ID, Info.getName(), Info.getFileName(), Info.getAuthor(), Cookies, Info.getDownloadUrl()))
    }
    function SendDownloadRequest(Info: VideoInfo, Cookie: string) {
        switch (DownloadType[PluginControlPanel.state.DownloadType]) {
            case DownloadType[DownloadType.aria2]:
                aria2Download(Info, Cookie)
                break
            case DownloadType[DownloadType.default]:
                defaultDownload(Info)
                break
            case DownloadType[DownloadType.others]:
            default:
                PluginTips.info('提示', '已将下载请求提交给浏览器!')
                GM_openInTab(Info.getDownloadUrl(), { active: true, insert: true, setParent: true })
                break
        }
    }

    function replaceVar(data:string) {
        let gVar = [
            { 'Y': new Date().getFullYear() },
            { 'M': new Date().getMonth() },
            { 'D': new Date().getDay() },
            { 'h': new Date().getHours() },
            { 'm': new Date().getMinutes() },
            { 's': new Date().getSeconds() }
        ]
        gVar.forEach((item) => {
            for (const d in item) {
                data.replace('%#'+d+'#%',item[d]) 
            }
        })
        return data
    }

    if (!PluginControlPanel.state.Initialize) {
        PluginControlPanel.show()
    }
    document.querySelectorAll('.node-video').forEach((video) => {
        if (!video.classList.contains('node-full')) {
            (video as HTMLElement).ondblclick = () => {
                video.setAttribute('checked', video.getAttribute('checked') == 'false' ? 'true' : 'false')
            }
            video.setAttribute('linkdata', video.querySelector('a').href)
            video.querySelector('a').removeAttribute('href')
            video.setAttribute('checked', 'false')
            video.classList.add('selectButton')
        }
    })
    if (document.querySelectorAll('.selectButton').length > 0) {
        PluginUI.downloadSelectedEnabled()
        if (window.location.href.indexOf('/users/') > -1) {
            PluginUI.downloadAllEnabled()
        }
    }
    switch (PluginControlPanel.state.DownloadType) {
        case DownloadType.aria2:
            PluginControlPanel.ConnectionWebSocket()
            break
        case DownloadType.default:
            PluginTips.warning('Iwara批量下载工具', '该下载模式为实验性模式，无法保证下载稳定性！', true)
            break
        case DownloadType.others:
            break
        default:
            console.log('未知的下载模式!')
            break
    }
    PluginTips.success('Iwara批量下载工具', '加载完成!')
})()