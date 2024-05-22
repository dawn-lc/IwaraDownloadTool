// ==UserScript==
// @name              Iwara Download Tool
// @description       Download videos from iwara.tv
// @name:ja           Iwara バッチダウンローダー
// @description:ja    Iwara 動画バッチをダウンロード
// @name:zh-CN        Iwara 批量下载工具
// @description:zh-CN 批量下载 Iwara 视频
// @icon              https://www.iwara.tv/logo.png
// @namespace         https://github.com/dawn-lc/
// @author            dawn-lc
// @license           Apache-2.0
// @copyright         2024, Dawnlc (https://dawnlc.me/)
// @source            https://github.com/dawn-lc/IwaraDownloadTool
// @supportURL        https://github.com/dawn-lc/IwaraDownloadTool/issues
// @updateURL         https://github.com/dawn-lc/IwaraDownloadTool/releases/download/%#release_tag#%/IwaraDownloadTool.mata.js
// @downloadURL       https://github.com/dawn-lc/IwaraDownloadTool/releases/download/%#release_tag#%/IwaraDownloadTool.user.js
// @connect           iwara.tv
// @connect           *.iwara.tv
// @connect           mmdfans.net
// @connect           *.mmdfans.net
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
// @grant             GM_addElement
// @grant             GM_getResourceText
// @grant             GM_setClipboard
// @grant             GM_download
// @grant             GM_xmlhttpRequest
// @grant             GM_openInTab
// @grant             GM_info
// @grant             unsafeWindow
// @run-at            document-start
// @require           https://cdn.staticfile.net/dexie/3.2.4/dexie.min.js
// @require           https://cdn.staticfile.net/toastify-js/1.12.0/toastify.min.js
// @require           https://cdn.staticfile.net/moment.js/2.30.1/moment.min.js
// @require           https://cdn.staticfile.net/moment.js/2.30.1/moment-with-locales.min.js
// @resource          toastify-css https://cdn.staticfile.net/toastify-js/1.12.0/toastify.min.css
// ==/UserScript==