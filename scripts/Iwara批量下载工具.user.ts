(async function () {
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
                case 'innerHTML':
                    RenderDOM.innerHTML = vdata.innerHTML
                    break
                case 'childs':
                    if (vdata.childs instanceof Array) {
                        vdata.childs.forEach((child: RenderCode) => {
                            if (child instanceof HTMLElement) {
                                RenderDOM.appendChild(child)
                            } else if (typeof (child) == 'string') {
                                RenderDOM.insertAdjacentHTML('beforeend', child)
                            } else {
                                console.log(RenderDOM)
                                console.log(child)
                                console.log(sourceRender(child))
                                RenderDOM.appendChild(sourceRender(child))
                            }
                        })
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
            }
        }
    }

    function reactRender(vdata: RenderCode, index?: any) {
        let VirtualDOM: RenderData;
        if (vdata.nodeType != undefined) {
            VirtualDOM = { type: vdata.nodeType }
            delete vdata.nodeType
            if (vdata.childs != undefined) {
                if (VirtualDOM.children == undefined) VirtualDOM.children = []
                if (vdata.childs instanceof Array) {
                    //VirtualDOM.children = vdata.childs.map((item: any, index: any) => reactRender(item,index))
                    VirtualDOM.children = React.Children.toArray(vdata.childs.map((item: any) => reactRender(item)))
                } else {
                    VirtualDOM.children.push(reactRender(vdata.childs))
                }
                delete vdata.childs
            }
            if (vdata.className != undefined) {
                VirtualDOM.props = Object.assign({ className: vdata.className }, VirtualDOM.props || {});
                delete vdata.className
            }
            if (vdata.attribute != undefined) {
                VirtualDOM.props = Object.assign(vdata.attribute, VirtualDOM.props || {});
                delete vdata.attribute
            }
            if (index != undefined) VirtualDOM.props = Object.assign({ key: index }, VirtualDOM.props || {})
            for (const key in vdata) {
                if (VirtualDOM.props == undefined) VirtualDOM.props = {}
                VirtualDOM.props[key] = vdata[key]
                delete vdata[key]
            }
        } else {
            return vdata
        }
        return React.createElement(VirtualDOM.type, VirtualDOM.props, VirtualDOM.children || null);
    }

    async function get(url: string, parameter: string[] = [], referrer: string, headers: object = {}) {
        referrer = referrer || url
        parameter = parameter || []
        headers = headers || {}
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
        return ''
    }


    enum DownloadType {
        aria2,
        default,
        others
    }

    if (window.location.hostname == '127.0.0.1') {
        sourceRender({
            nodeType: 'div',
            attribute: {
                id: 'PluginUI'
            },
            parent: document.body
        })
    } else {
        sourceRender({
            nodeType: 'div',
            attribute: {
                id: 'PluginUI',
                style: 'display: inline-block;'
            },
            parent: document.querySelector('#user-links')
        })
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
            margin: 15% auto;
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
            border-color: #ff5081;
        }
        .selectButton[checked=true] {
            border-color: #e7ff4b;
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
            cursor: pointer;
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
            id: 'PluginTips'
        },
        parent: document.body
    }])

    class pluginUI extends React.Component {
        declare state: any;
        constructor(props: any) {
            super(props)
            this.state = {
                style: {},
                main: 'btn-group',
            }
        }
        show() {
            this.setState({
                main: 'btn-group open'
            })
        }
        hide() {
            this.setState({
                main: 'btn-group'
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
                        title: '批量下载工具'
                    },
                    childs: [{
                        nodeType: 'span',
                        className: 'glyphicon glyphicon-download-alt'
                    }, {
                        nodeType: 'text',
                        childs: '批量下载工具'
                    }],
                    onClick: () => { this.show() }
                },
                {
                    nodeType: 'ul',
                    className: 'dropdown-menu',
                    attribute: {
                        role: 'menu'
                    },
                    childs: [{
                        nodeType: 'li',
                        attribute: {
                            role: 'menu',
                            style: { cursor: 'pointer' },
                            id: 'DownloadSelected',
                            dangerouslySetInnerHTML: { __html: '<a><span class="glyphicon glyphicon-check"></span>下载所选</a>' }
                        },
                        onClick: () => {
                            this.hide()
                            //main.DownloadSelected()
                        }
                    },
                    {
                        nodeType: 'li',
                        attribute: {
                            style: { display: 'none', cursor: 'pointer' },
                            id: 'DownloadAll',
                            dangerouslySetInnerHTML: { __html: '<a><span class="glyphicon glyphicon-save"></span>下载所有</a>' }
                        },
                        onClick: () => {
                            this.hide()
                            //main.DownloadAll()
                        }
                    },
                    {
                        nodeType: 'li',
                        attribute: {
                            style: { cursor: 'pointer' },
                            id: 'ManualDownload',
                            dangerouslySetInnerHTML: { __html: '<a><span class="glyphicon glyphicon-edit"></span>手动下载</a>' }
                        },
                        onClick: () => {
                            this.hide()
                            //main.ManualParseDownloadAddress()
                        }
                    },
                    {
                        nodeType: 'li',
                        attribute: {
                            style: { cursor: 'pointer' },
                            id: 'pluginSet',
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
        constructor(props: any) {
            super(props)
            this.synclistener = []
            this.state = {
                Initialize: GM_getValue('Initialize', false),
                DownloadType: GM_getValue('DownloadType', DownloadType.others),
                DownloadDir: GM_getValue('DownloadDir', ''),
                DownloadProxy: GM_getValue('DownloadProxy', ''),
                WebSocketAddress: GM_getValue('WebSocketAddress', 'ws://127.0.0.1:6800/'),
                WebSocketToken: GM_getValue('WebSocketToken', ''),
                WebSocketID: GM_getValue('WebSocketID', UUID()),
                style: {
                    radioLabel: { margin: '0px 20px 0px 0px' },
                    Line: { margin: '10px 0px' },
                    inputLabel: { margin: '5px' },
                    input: { width: '100%' },
                    main: { display: 'block' }
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
            this.setState((state: any) => {
                return {
                    style: Object.assign(state.style, {
                        main: { display: 'none' }
                    })
                }
            })
        }
        componentDidMount() {
            let values = GM_listValues()
            for (let index = 0; index < values.length; index++) {
                this.synclistener.push(GM_addValueChangeListener(values[index]!, (name: string, old_value: any, new_value: any, remote: boolean) => {
                    if (remote && (new_value != this.state[name])) {
                        this.setState({ [name]: new_value })
                        if (name == 'DownloadType' && this.state[name] == DownloadType.aria2 && /((((ws|wss):(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/.test(this.state['WebSocketAddress'])) {
                            /*
                            if (main.Aria2WebSocket != null) main.Aria2WebSocket.close()
                            main.ConnectionWebSocket()
                            */
                        }
                    }
                }))
            }
        }
        componentWillUnmount() {
            for (let index = 0; index < this.synclistener.length; index++) {
                GM_removeValueChangeListener(this.synclistener[index])
            }
        }
        configChange(e: any) {
            this.setState({ [e.name]: e.value })
            if (e.name == 'DownloadType' && e.value == DownloadType.aria2 && /((((ws|wss):(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/.test(this.state['WebSocketAddress'])) {
                /*
                if (main.Aria2WebSocket != null) main.Aria2WebSocket.close()
                main.ConnectionWebSocket()
            */
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
                        childs: 'X',
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
                                type: 'Radio',
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
                                type: 'Radio',
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
                                type: 'Radio',
                                value: DownloadType.others,
                                onChange: ({ target }: any) => this.configChange(target)
                            },
                            {
                                nodeType: 'label',
                                style: this.state.style.radioLabel,
                                childs: '其他下载器'
                            }
                            ]
                        }, {
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
                                type: 'Text',
                                value: this.state.DownloadDir,
                                style: this.state.style.input,
                                onChange: ({ target }: any) => this.configChange(target)
                            }
                            ]
                        }, {
                            nodeType: 'div',
                            style: this.state.style.Line,
                            childs: [{
                                nodeType: 'label',
                                style: this.state.style.inputLabel,
                                childs: '代理服务器:',
                            },
                            {
                                nodeType: 'input',
                                name: 'DownloadProxy',
                                type: 'Text',
                                value: this.state.DownloadProxy,
                                style: this.state.style.input,
                                onChange: ({ target }: any) => this.configChange(target)
                            }
                            ]
                        }, {
                            nodeType: 'div',
                            style: this.state.style.Line,
                            childs: [{
                                nodeType: 'label',
                                style: this.state.style.inputLabel,
                                childs: 'Aria2 RPC WebSocket 地址:',
                            },
                            {
                                nodeType: 'input',
                                name: 'WebSocketAddress',
                                type: 'Text',
                                value: this.state.WebSocketAddress,
                                style: this.state.style.input,
                                onChange: ({ target }: any) => this.configChange(target)
                            }
                            ]
                        }, {
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
                        }, {
                            nodeType: 'div',
                            style: this.state.style.Line,
                            childs: [{
                                nodeType: 'label',
                                style: this.state.style.inputLabel,
                                childs: [
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

    class tips extends React.Component {
        type: {
            Info: string;
            Warning: string;
            Success: string;
            Progress: string;
        }
        id: string;
        constructor(props: any) {
            super(props)
            this.type = {
                Info: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
                Warning: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
                Success: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
                Progress: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>'
            }
            this.id = this.props["id"]
        }
        render() {
            let classData = ' tips' + this.props["type"]
            if (this.props["wait"]) {
                classData += ' tipsWait'
            } else {
                classData += ' tipsActive'
            }
            return (reactRender({
                nodeType: 'div',
                className: 'tips' + classData,
                childs: [{
                    nodeType: 'div',
                    className: 'tipsIcon',
                    attribute: {
                        dangerouslySetInnerHTML: { __html: this.type[this.props["type"]] }
                    }
                }, {
                    nodeType: 'div',
                    className: 'tipsContent',
                    childs: [{
                        nodeType: 'h2',
                        childs: this.props["title"]
                    }, {
                        nodeType: 'p',
                        childs: this.props["content"]
                    }]
                }]
            }))
        }
    }

    type pluginTipsStateType = {
        TipsList: Array<React.CElement<tips, any>>
    }
    class pluginTips extends React.Component<any, pluginTipsStateType> {
        WaitingQueue: Queue
        DownloadingQueue: Queue
        constructor(props: any) {
            super(props)
            this.DownloadingQueue = new Queue()
            this.WaitingQueue = new Queue()
            this.state = {
                TipsList: Array<React.CElement<tips, any>>()
            }
        }
        downloadComplete(id: string) {
            this.DownloadingQueue.remove(id)
            this.setState({
                TipsList: this.state.TipsList.filter((element) => {
                    return element.props.id != id
                })
            })
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
            let i = this.state.TipsList.findIndex((element) => {
                return element.props.id == id
            })
            if (i > 0) this.state.TipsList.splice(i, 1)
            this.setState({
                TipsList: this.state.TipsList.concat(React.createElement(tips, {
                    wait: true,
                    id: id,
                    title: '下载中...',
                    content: [{
                        nodeType: 'div',
                        className: 'Progress',
                        childs: [{
                            nodeType: 'div',
                            className: 'value',
                            attribute: {
                                value: value.toFixed(2),
                                style: { width: value + '%' }
                            }
                        }]
                    }],
                    type: 'Progress'
                }))
            })
        }
        info(title: string, content: string, wait: boolean = false) {
            this.setState({
                TipsList: this.state.TipsList.concat(React.createElement(tips, {
                    title: title,
                    content: content,
                    type: 'Info',
                    wait: wait
                }))
            })
        }
        warning(title: string, content: string, wait: boolean = false) {
            this.setState({
                TipsList: this.state.TipsList.concat(React.createElement(tips, {
                    title: title,
                    content: content,
                    type: 'Warning',
                    wait: wait
                }))
            })
        }
        success(title: string, content: string, wait: boolean = false) {
            this.setState({
                TipsList: this.state.TipsList.concat(React.createElement(tips, {
                    title: title,
                    content: content,
                    type: 'Success',
                    wait: wait
                }))
            })
        }
        progress(title: string, content: any) {
            if (!this.state.TipsList.some((element) => { return element.props.id == content.id })) {
                this.setState({
                    TipsList: this.state.TipsList.concat(React.createElement(tips, {
                        title: title,
                        id: content.id,
                        wait: true,
                        content: [{
                            nodeType: 'div',
                            className: 'Progress',
                            childs: [{
                                nodeType: 'div',
                                className: 'value',
                                attribute: {
                                    value: 0
                                }
                            }]
                        }],
                        type: 'Progress'
                    }))
                })
            }
        }
        render() {
            return (reactRender({
                nodeType: 'section',
                className: 'tipsContainer',
                childs: this.state.TipsList
            }))
        }
    }

    console.log('test')
    let PluginUI = ReactDOM.render(React.createElement(pluginUI), document.getElementById('PluginUI'))
    let PluginControlPanel = ReactDOM.render(React.createElement(pluginControlPanel), document.getElementById('PluginControlPanel'))
    let PluginTips = ReactDOM.render(React.createElement(pluginTips), document.getElementById('PluginTips'))

    class VideoInfo {
        Url: string
        ID: string
        Page: Document
        Source: Array<any>
        Lock: boolean
        getAuthor: () => string
        getName: () => string
        getDownloadQuality: () => string
        getDownloadUrl: () => string
        getDownloadFileName: () => string
        getComment: () => string
        getLock() {
            if (this.Page.querySelector('.well') != null) return true
            return false
        }
        constructor(videoID: string) {
            return (async (): Promise<VideoInfo> => {
                this.ID = (videoID as string).toLowerCase()
                this.Url = 'https://ecchi.iwara.tv/videos/' + this.ID
                this.Page = parseDom(await get(this.Url, null, window.location.href))
                this.Lock = this.getLock();
                this.getAuthor = function () {
                    if (this.Lock) return (this.Page.querySelector('a.username') as HTMLElement).innerText
                    return (this.Page.querySelector('.submitted').querySelector('a.username') as HTMLElement).innerText
                }
                this.getName = function () {
                    if (this.Lock) return (this.Page.querySelector('.title').querySelector('a') as HTMLElement).innerText
                    return (this.Page.querySelector('.submitted').querySelector('h1.title') as HTMLElement).innerText
                }
                this.Source = await get('https://ecchi.iwara.tv/api/video/' + this.ID, null, this.Url)
                this.getDownloadQuality = function () {
                    if (this.Source.length != 0) {
                        return this.Source[0].resolution
                    }
                    return null
                }
                this.getDownloadUrl = function () { return decodeURIComponent('https:' + this.Source[this.getDownloadQuality()].uri); }
                this.getDownloadFileName = function () { return getQueryVariable(this.getDownloadUrl(), 'file').split('/')[3]; }
                this.getComment = function () {
                    let comment = ''
                    try {
                        let commentArea = this.Page.getElementsByClassName('node-info')[0].getElementsByClassName('field-type-text-with-summary field-label-hidden')[0].getElementsByClassName('field-item even')
                        for (let index = 0; index < commentArea.length; index++) {
                            const element = commentArea[index] as HTMLElement
                            comment += element.innerText.toLowerCase()
                        }
                    } catch (error) {
                        comment += error.toString()
                    }
                    return comment
                }
                return this;
            })() as unknown as VideoInfo;
        }
    }

    let videoList = document.querySelectorAll('.node-video')
    for (let index = 0; index < videoList.length; index++) {
        const element = videoList[index] as HTMLElement
        element.setAttribute('linkData', element.querySelector('a').href)
        element.querySelector('a').removeAttribute('href')
        element.setAttribute('checked', 'false')
        element.classList.add('selectButton')
        element.ondblclick = () => {
            element.setAttribute('checked', element.getAttribute('checked') == 'false' ? 'true' : 'false')
        }
    }

    PluginTips.info('测试0', '插件加载成功!')
    PluginTips.warning('测试1', '插件加载成功!')
    PluginTips.success('测试2', '插件加载成功!')
    PluginTips.progress('测试4', { id: 'test' })
    setTimeout(() => {
        PluginTips.downloading('test', 10)
        setTimeout(() => {
            PluginTips.downloading('test', 20)
            setTimeout(() => {
                PluginTips.downloading('test', 40)
                setTimeout(() => {
                    PluginTips.downloading('test', 80)
                    setTimeout(() => {
                        PluginTips.downloadComplete('test')
                    }, 1000);
                }, 1000);
            }, 1000);
        }, 1000);
    }, 1000);

})();