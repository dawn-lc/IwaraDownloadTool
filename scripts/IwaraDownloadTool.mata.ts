// ==UserScript==
// @name              Iwara Download Tool
// @description       Download videos from iwara.tv
// @name:ja           Iwara バッチダウンローダー
// @description:ja    Iwara 動画バッチをダウンロード
// @name:zh-CN        Iwara 批量下载工具
// @description:zh-CN 批量下载 Iwara 视频
// @icon              https://i.harem-battle.club/images/2023/03/21/wMQ.png
// @namespace         https://github.com/dawn-lc/
// @version           3.1.89
// @author            dawn-lc
// @license           Apache-2.0
// @copyright         2023, Dawnlc (https://dawnlc.me/)
// @source            https://github.com/dawn-lc/IwaraDownloadTool
// @supportURL        https://github.com/dawn-lc/IwaraDownloadTool/issues
// @updateURL         https://github.com/dawn-lc/IwaraDownloadTool/raw/master/dist/IwaraDownloadTool.mata.js
// @downloadURL       https://github.com/dawn-lc/IwaraDownloadTool/raw/master/dist/IwaraDownloadTool.user.js
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