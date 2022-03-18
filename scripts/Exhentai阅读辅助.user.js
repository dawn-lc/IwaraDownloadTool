// ==UserScript==
// @name         E-hentai阅读辅助
// @namespace    https://github.com/dawn-lc/user.js/
// @version      1.4.1
// @description  可以在浏览E-hentai时需要双手离开键盘的时候, 帮你自动翻页。ctrl+上/下调整翻页间隔、左/右=上一页/下一页、回车开关自动翻页。[不支持多页查看器]
// @author       dawn-lc
// @icon         https://e-hentai.org/favicon.ico
// @match        *://exhentai.org/s/*/*
// @match        *://e-hentai.org/s/*/*
// @run-at       document-start
// @connect      exhentai.org
// @connect      e-hentai.org
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    const element = {
        createElement(detailedList) {
            if (detailedList instanceof Array) {
                return detailedList.map(item => this.createElement(item));
            } else {
                return this.generateElement(document.createElement(detailedList.nodeType), detailedList);
            };
        },
        generateElement(item, detailedList) {
            for (const i in detailedList) {
                if (i == 'nodeType') continue;
                if (i == 'childs' && detailedList.childs instanceof Array) {
                    detailedList.childs.forEach(child => {
                        if (child instanceof HTMLElement) item.appendChild(child);
                        else if (typeof (child) == 'string') item.insertAdjacentHTML('beforeend', child);
                        else item.appendChild(this.createElement(child));
                    });
                }
                else if (i == 'attribute') {
                    for (const key in detailedList.attribute) {
                        item.setAttribute(key, detailedList.attribute[key]);
                    };
                }
                else if (i == 'parent') {
                    detailedList.parent.appendChild(item);
                }
                else if (i == 'before') {
                    if (typeof detailedList.before == 'string') {
                        document.querySelector(detailedList.before).insertBefore(item, document.querySelector(detailedList.before).childNodes[0]);
                    } else {
                        detailedList.before.insertBefore(item, detailedList.before.childNodes[0]);
                    }
                }
                else if (detailedList[i] instanceof Object && item[i]) {
                    Object.entries(detailedList[i]).forEach(([k, v]) => {
                        item[i][k] = v;
                    });
                }
                else {
                    item[i] = detailedList[i];
                }
            }
            return item;
        },
        parseDom(dom) {
            return new DOMParser().parseFromString(dom, 'text/html');
        }
    };

    const setting = {
        nameSpaces: 'EHentai_WEB_Helper',
        Initialize: GM_getValue('Initialize', false),
        NextTimeOut: Number(GM_getValue('NextTimeOut', 5)),
        SlideShowMode: GM_getValue('SlideShowMode', false),
        setInitialize(value) {
            this.Initialize = value;
            GM_setValue('Initialize', this.Initialize);
        },
        setNextTimeOut(value) {
            this.NextTimeOut = Number(value);
            GM_setValue('NextTimeOut', this.NextTimeOut);
        },
        setSlideShowMode(value) {
            this.SlideShowMode = value;
            GM_setValue('SlideShowMode', this.SlideShowMode);
        }
    };

    const resources = {
        PluginUI: [{
            nodeType: 'style',
            innerHTML: `
        #@%nameSpaces%@PluginUI {
            width: 152px;
            overflow: hidden;
            position:absolute;
            /*top: 28px;*/
            right: -152px;
            z-index: 999;
            clip: rect(auto 0px auto auto);
            background-color: gray;
        }
        #@%nameSpaces%@PluginUI * {
            margin: 5px 3px 5px 3px;
        }
        .@%nameSpaces%@longAnimation{
            animation:@%nameSpaces%@info 5s ease-in-out forwards 0s 1 normal;
            -webkit-animation:@%nameSpaces%@info 5s ease-in-out forwards 0s 1 normal;
        }
        .@%nameSpaces%@shortAnimation{
            animation:@%nameSpaces%@info 2s ease-in-out forwards 0s 1 normal;
            -webkit-animation:@%nameSpaces%@info 2s ease-in-out forwards 0s 1 normal;
        }

        .@%nameSpaces%@longAnimationIn{
            animation:@%nameSpaces%@infoIn 0.5s ease-in forwards 0s 1 normal;
            -webkit-animation:infoIn 0.5s ease-in forwards 0s 1 normal;
        }
        .@%nameSpaces%@shortAnimationIn{
            animation:@%nameSpaces%@infoIn 0.2s ease-in 0s 1 normal;
            -webkit-animation:@%nameSpaces%@infoIn 0.2s ease-in forwards 0s 1 normal;
        }

        .@%nameSpaces%@longAnimationOut{
            animation:@%nameSpaces%@infoOut 0.25s ease-out forwards 0s 1 normal;
            -webkit-animation:@%nameSpaces%@infoOut 0.25s ease-out forwards 0s 1 normal;
        }
        .@%nameSpaces%@shortAnimationOut{
            animation:@%nameSpaces%@infoOut 0.1s ease-out forwards 0s 1 normal;
            -webkit-animation:@%nameSpaces%@infoOut 0.1s ease-out forwards 0s 1 normal;
        }

        .pauseAnimation{
            animation-play-state:paused;
            -webkit-animation-play-state:paused;
        }

        @keyframes @%nameSpaces%@info {
            0%   {right:-152px;clip: rect(auto 0px auto auto);}
            10%  {right:0px;clip: rect(auto 152px auto auto);}
            95%  {right:0px;clip: rect(auto 152px auto auto);}
            100% {right:-152px;clip: rect(auto 0px auto auto);}
        }
        @-moz-keyframes @%nameSpaces%@info {
            0%   {right:-152px;clip: rect(auto 0px auto auto);}
            10%  {right:0px;clip: rect(auto 152px auto auto);}
            95%  {right:0px;clip: rect(auto 152px auto auto);}
            100% {right:-152px;clip: rect(auto 0px auto auto);}
        }
        @-webkit-keyframes @%nameSpaces%@info {
            0%   {right:-152px;clip: rect(auto 0px auto auto);}
            10%  {right:0px;clip: rect(auto 152px auto auto);}
            95%  {right:0px;clip: rect(auto 152px auto auto);}
            100% {right:-152px;clip: rect(auto 0px auto auto);}
        }
        @-o-keyframes @%nameSpaces%@info {
            0%   {right:-152px;clip: rect(auto 0px auto auto);}
            10%  {right:0px;clip: rect(auto 152px auto auto);}
            95%  {right:0px;clip: rect(auto 152px auto auto);}
            100% {right:-152px;clip: rect(auto 0px auto auto);}
        }


        @keyframes @%nameSpaces%@infoIn {
            0%   {right:-152px;clip: rect(auto 0px auto auto);}
            100% {right:0px;clip: rect(auto 152px auto auto);}
        }
        @-moz-keyframes @%nameSpaces%@infoIn {
            0%   {right:-152px;clip: rect(auto 0px auto auto);}
            100% {right:0px;clip: rect(auto 152px auto auto);}
        }
        @-webkit-keyframes @%nameSpaces%@infoIn {
            0%   {right:-152px;clip: rect(auto 0px auto auto);}
            100% {right:0px;clip: rect(auto 152px auto auto);}
        }
        @-o-keyframes @%nameSpaces%@infoIn {
            0%   {right:-152px;clip: rect(auto 0px auto auto);}
            100% {right:0px;clip: rect(auto 152px auto auto);}
        }


        @keyframes @%nameSpaces%@infoOut {
            0%   {right:0px;clip: rect(auto 152px auto auto);}
            100% {right:-152px;clip: rect(auto 0px auto auto);}
        }
        @-moz-keyframes @%nameSpaces%@infoOut {
            0%   {right:0px;clip: rect(auto 152px auto auto);}
            100% {right:-152px;clip: rect(auto 0px auto auto);}
        }
        @-webkit-keyframes @%nameSpaces%@infoOut {
            0%   {right:0px;clip: rect(auto 152px auto auto);}
            100% {right:-152px;clip: rect(auto 0px auto auto);}
        }
        @-o-keyframes @%nameSpaces%@infoOut {
            0%   {right:0px;clip: rect(auto 152px auto auto);}
            100% {right:-152px;clip: rect(auto 0px auto auto);}
        }
        `.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_'),
            parent: document.head
        }, {
            nodeType: 'div',
            id: '@%nameSpaces%@PluginUI'.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_'),
            childs: [{
                nodeType: 'div',
                id: '@%nameSpaces%@PluginInfo'.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_'),
                childs: []
            }],
            before: '#i1'
        }],
        ShowType: {
            PauseAnimation: '@%nameSpaces%@pauseAnimation'.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_'),
            ContinueAnimation: '@%nameSpaces%@pauseAnimation'.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_'),
            LongAnimation: {
                InOut: '@%nameSpaces%@longAnimation'.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_'),
                In: '@%nameSpaces%@longAnimationIn'.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_'),
                Out: '@%nameSpaces%@longAnimationOut'.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_')
            },
            ShortAnimation: {
                InOut: '@%nameSpaces%@shortAnimation'.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_'),
                In: '@%nameSpaces%@shortAnimationIn'.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_'),
                Out: '@%nameSpaces%@shortAnimationOut'.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_')
            }
        },
        addClass(node, className) {
            if (!node.classList.contains(className)) {
                node.classList.add(className);
                node.offsetWidth = node.offsetWidth;
            };
        },
        removeClass(node, className) {
            if (node.classList.contains(className)) {
                node.classList.remove(className);
                node.offsetWidth = node.offsetWidth;
            };
        },
        clearClass(node) {
            node.classList = null;
            node.offsetWidth = node.offsetWidth;
        }
    };

    const main = {
        imgLoadComplete: false,
        imgLoading: false,
        img: undefined,
        nextImage: null,
        previousImage: null,
        slideShowLoop: null,
        showMessage(showType, message) {
            let PluginUI = document.getElementById('@%nameSpaces%@PluginUI'.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_'));
            let PluginInfo = document.getElementById('@%nameSpaces%@PluginInfo'.replace(new RegExp('@%nameSpaces%@', 'g'), setting.nameSpaces + '_'));
            PluginInfo.innerText = message || '';
            switch (showType) {
                case resources.ShowType.PauseAnimation:
                    resources.addClass(PluginUI, showType);
                    break;
                case resources.ShowType.ContinueAnimation:
                    resources.removeClass(PluginUI, showType);
                    break;
                default:
                    switch (showType) {
                        case resources.ShowType.LongAnimation.In:
                            resources.removeClass(PluginUI, resources.ShowType.LongAnimation.Out);
                            resources.addClass(PluginUI, showType);
                            break;
                        case resources.ShowType.LongAnimation.Out:
                            resources.removeClass(PluginUI, resources.ShowType.LongAnimation.In);
                            resources.addClass(PluginUI, showType);
                            break;
                        case resources.ShowType.ShortAnimation.In:
                            resources.removeClass(PluginUI, resources.ShowType.ShortAnimation.Out);
                            resources.addClass(PluginUI, showType);
                            break;
                        case resources.ShowType.ShortAnimation.Out:
                            resources.removeClass(PluginUI, resources.ShowType.ShortAnimation.In);
                            resources.addClass(PluginUI, showType);
                            break;
                        default:
                            resources.clearClass(PluginUI);
                            switch (showType) {
                                case resources.ShowType.LongAnimation:
                                    showType = resources.ShowType.LongAnimation.InOut;
                                    break;
                                case resources.ShowType.ShortAnimation:
                                    showType = resources.ShowType.ShortAnimation.InOut;
                                    break;
                                default:
                                    break;
                            }
                            resources.addClass(PluginUI, showType);
                            break;
                    }
                    break;
            };
        },
        start() {
            if (document.body != null) {
                console.log('载入时机错误!');
            }
            document.body.addEventListener('DOMNodeInserted', function (Node) {
                if (Node.relatedNode.nodeName == 'BODY') {
                    element.createElement(resources.PluginUI);
                    document.onkeydown = function (event) {
                        var e = event || window.e;
                        var keyCode = e.keyCode || e.which || e.charCode;
                        var altKey = e.altKey;
                        var shiftKey = e.shiftKey;
                        var ctrlKey = e.ctrlKey;
                        var metaKey = e.metaKey;
                        switch (keyCode) {
                            case 108:
                            case 13:
                                //回车
                                main.switchSlideShowMode();
                                break
                            case 32:
                                //空格
                                main.switchSlideShowMode();
                                break
                            case 37:
                                //左
                                main.switchPage("previousPage");
                                break
                            case 39:
                                //右
                                main.switchPage("nextPage");
                                break
                        }
                        if (ctrlKey && keyCode == 38) {
                            main.nextTimeOutAdd();
                        }
                        if (ctrlKey && keyCode == 40) {
                            main.nextTimeOutSub();
                        }
                    };
                    main.abductionSwitchPage();
                    document.getElementById('i1').addEventListener('DOMNodeRemoved', function (Node) {
                        main.abductionSwitchPage();
                        if (Node.relatedNode.id == 'i3') {
                            main.img = undefined;
                            main.showMessage(resources.ShowType.LongAnimation.In, '正在查找图片源...');
                        };
                    });
                    document.getElementById('i1').addEventListener('DOMNodeInserted', function (Node) {
                        if (Node.relatedNode.id == 'i3') {
                            main.showMessage(resources.ShowType.LongAnimation.Out);
                            main.showMessage(resources.ShowType.LongAnimation.In, '找到图片源!尝试连接中...');
                            window.scrollTo({
                                top: document.getElementById('i2').offsetTop,
                                behavior: 'smooth'
                            });
                            main.imgLoadComplete = false;
                            main.imgLoading = true;
                            main.img = document.getElementById('i3').childNodes[0].childNodes[0];
                            main.waitImgLoad();
                        };
                    });
                };
            });
        },
        abductionSwitchPage() {
            for (let index = 0; index < document.querySelectorAll('#next').length; index++) {
                const element = document.querySelectorAll('#next')[index];
                if (element.getAttribute('onclick') != null) {
                    main.nextImage = element.getAttribute('onclick').replace(new RegExp('return ', 'g'), '');
                    element.addEventListener("click", function () {
                        clearTimeout(main.slideShowLoop);
                        eval(main.nextImage);
                    });
                    element.removeAttribute('onclick');
                    element.removeAttribute('href');
                }
            }
            for (let index = 0; index < document.querySelectorAll('#prev').length; index++) {
                const element = document.querySelectorAll('#prev')[index];
                if (element.getAttribute('onclick') != null) {
                    main.previousImage = element.getAttribute('onclick').replace(new RegExp('return ', 'g'), '');
                    element.addEventListener("click", function () {
                        clearTimeout(main.slideShowLoop);
                        eval(main.previousImage);
                    });
                    element.removeAttribute('onclick');
                    element.removeAttribute('href');
                }
            }
        },
        waitImgLoad() {
            main.showMessage(resources.ShowType.LongAnimation.Out);
            main.showMessage(resources.ShowType.LongAnimation.In, '正在加载图片...');
            main.img.onload = function () {
                main.imgLoadComplete = true;
                main.imgLoading = false;
                main.showMessage(resources.ShowType.LongAnimation.Out);
                main.showMessage(resources.ShowType.ShortAnimation, '图片加载完成!');
                main.checkSlideShow();
            }
            main.img.onerror = function () {
                main.imgLoadComplete = false;
                main.imgLoading = false;
                main.showMessage(resources.ShowType.LongAnimation.Out);
                main.showMessage(resources.ShowType.ShortAnimation, '图片加载失败!');
                main.addListener();
                main.checkSlideShow();
            };
        },
        switchSlideShowMode() {
            if (setting.SlideShowMode) {
                setting.setSlideShowMode(false);
                main.showMessage(resources.ShowType.ShortAnimation, '关闭自动翻页模式!');
                main.checkSlideShow();
            } else {
                setting.setSlideShowMode(true);
                main.showMessage(resources.ShowType.ShortAnimation, '开启自动翻页模式!');
                main.checkSlideShow();
            };
        },
        checkSlideShow() {
            if (main.imgLoadComplete) {
                if (setting.SlideShowMode) {
                    main.slideShow();
                } else {
                    clearTimeout(main.slideShowLoop);
                };
            } else {
                if (setting.SlideShowMode) {
                    clearTimeout(main.slideShowLoop);
                    load_image(Number(document.getElementById('prev').parentNode.childNodes[2].childNodes[0].innerHTML), window.location.href.split('/')[4]);
                } else {
                    clearTimeout(main.slideShowLoop);
                };
            };
        },
        slideShow() {
            if (document.getElementById('next').parentNode.childNodes[2].childNodes[0].innerHTML == document.getElementById('next').parentNode.childNodes[2].childNodes[2].innerHTML) {
                main.showMessage(resources.ShowType.ShortAnimation, '最后一页，自动翻页已停止');
                setting.setSlideShowMode(false);
                clearTimeout(main.slideShowLoop);
            } else {
                main.showMessage(resources.ShowType.ShortAnimation, setting.NextTimeOut + '秒后翻页');
                main.slideShowLoop = setTimeout(function () {
                    main.switchPage("nextPage");
                }, setting.NextTimeOut * 1000);
            };
        },
        nextTimeOutAdd() {
            setting.setNextTimeOut(setting.NextTimeOut + 1);
            main.showMessage(resources.ShowType.ShortAnimation, '间隔为:' + setting.NextTimeOut + '秒(下次翻页生效)');
        },
        nextTimeOutSub() {
            setting.setNextTimeOut(setting.NextTimeOut - 1);
            main.showMessage(resources.ShowType.ShortAnimation, '间隔为:' + setting.NextTimeOut + '秒(下次翻页生效)');
        },
        switchPage(PreviousOrNext) {
            switch (PreviousOrNext) {
                case 'nextPage':
                    if (document.getElementById('next').parentNode.childNodes[2].childNodes[0].innerHTML == document.getElementById('next').parentNode.childNodes[2].childNodes[2].innerHTML) {
                        main.showMessage(resources.ShowType.ShortAnimation, '这是最后一页!');
                        setting.setSlideShowMode(false);
                        clearTimeout(main.slideShowLoop);
                        break;
                    } else {
                        main.next();
                        break;
                    };
                case 'previousPage':
                    if (document.getElementById('prev').parentNode.childNodes[2].childNodes[0].innerHTML == '1') {
                        main.showMessage(resources.ShowType.ShortAnimation, '这是第一页!');
                        setting.setSlideShowMode(false);
                        clearTimeout(main.slideShowLoop);
                        break;
                    } else {
                        main.previous();
                        break;
                    };
                default:
                    main.showMessage(resources.ShowType.ShortAnimation, '错误!');
                    setting.setSlideShowMode(false);
                    clearTimeout(main.slideShowLoop);
                    break;
            };
        },
        next() {
            document.getElementById('next').click();
        },
        previous() {
            document.getElementById('prev').click();
        }
    };
    main.start();
})();
