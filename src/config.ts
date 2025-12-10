
import "./env";
import { isNullOrUndefined, stringify } from "./env";
import { originalConsole } from "./hijack";
import { DownloadType } from "./enum";
import { i18nList } from "./i18n";
const DEFAULT_CONFIG = {
    language: 'zh_cn',
    autoFollow: false,
    autoLike: false,
    autoCopySaveFileName: false,
    autoDownloadMetadata: false,
    enableUnsafeMode: false,
    experimentalFeatures: false,
    autoInjectCheckbox: true,
    checkDownloadLink: false,
    filterLikedVideos: false,
    checkPriority: true,
    addUnlistedAndPrivate: false,
    downloadPriority: 'Source',
    downloadType: DownloadType.Others,
    downloadPath: '/Iwara/%#AUTHOR#%/%#TITLE#%[%#ID#%].mp4',
    downloadProxy: '',
    downloadProxyUsername: '',
    downloadProxyPassword: '',
    aria2Path: 'http://127.0.0.1:6800/jsonrpc',
    aria2Token: '',
    iwaraDownloaderPath: 'http://127.0.0.1:6800/jsonrpc',
    iwaraDownloaderToken: '',
    priority: {
        'Source': 100,
        '540': 99,
        '360': 98,
        'preview': 1
    }
};
export class Config {
    private static instance: Config;
    configChange?: Function;
    language: string
    autoFollow: boolean
    autoLike: boolean
    autoDownloadMetadata: boolean
    addUnlistedAndPrivate: boolean
    enableUnsafeMode: boolean
    experimentalFeatures: boolean
    autoInjectCheckbox: boolean
    autoCopySaveFileName: boolean
    filterLikedVideos: boolean
    checkDownloadLink: boolean
    checkPriority: boolean
    downloadPriority: string
    downloadType: DownloadType
    downloadPath: string
    downloadProxy: string
    downloadProxyUsername: string
    downloadProxyPassword: string
    aria2Path: string
    aria2Token: string
    iwaraDownloaderPath: string
    iwaraDownloaderToken: string
    authorization?: string;
    priority: Record<string, number>
    [key: string]: any
    constructor() {
        this.language = DEFAULT_CONFIG.language
        this.autoFollow = DEFAULT_CONFIG.autoFollow
        this.autoLike = DEFAULT_CONFIG.autoLike
        this.autoCopySaveFileName = DEFAULT_CONFIG.autoCopySaveFileName
        this.experimentalFeatures = DEFAULT_CONFIG.experimentalFeatures
        this.enableUnsafeMode = DEFAULT_CONFIG.enableUnsafeMode
        this.autoInjectCheckbox = DEFAULT_CONFIG.autoInjectCheckbox
        this.filterLikedVideos = DEFAULT_CONFIG.filterLikedVideos
        this.checkDownloadLink = DEFAULT_CONFIG.checkDownloadLink
        this.checkPriority = DEFAULT_CONFIG.checkPriority
        this.addUnlistedAndPrivate = DEFAULT_CONFIG.addUnlistedAndPrivate
        this.downloadPriority = DEFAULT_CONFIG.downloadPriority
        this.downloadType = DEFAULT_CONFIG.downloadType
        this.downloadPath = DEFAULT_CONFIG.downloadPath
        this.downloadProxy = DEFAULT_CONFIG.downloadProxy
        this.downloadProxyUsername = DEFAULT_CONFIG.downloadProxyUsername
        this.downloadProxyPassword = DEFAULT_CONFIG.downloadProxyPassword
        this.aria2Path = DEFAULT_CONFIG.aria2Path
        this.aria2Token = DEFAULT_CONFIG.aria2Token
        this.iwaraDownloaderPath = DEFAULT_CONFIG.iwaraDownloaderPath
        this.iwaraDownloaderToken = DEFAULT_CONFIG.iwaraDownloaderToken
        this.priority = DEFAULT_CONFIG.priority
        this.autoDownloadMetadata = DEFAULT_CONFIG.autoDownloadMetadata;
        let body = new Proxy(this, {
            get: function (target, property: string) {
                if (property === 'configChange') {
                    return target.configChange
                }
                let value = GM_getValue(property, target[property])
                if (property === 'language') {
                    return Config.getLanguage(value)
                }
                GM_getValue('isDebug') && originalConsole.debug(`[Debug] get: ${property} ${/password/i.test(property) || /token/i.test(property) || /authorization/i.test(property) ? '凭证已隐藏' : stringify(value)}`)
                return value
            },
            set: function (target, property: string, value) {
                if (property === 'configChange') {
                    target.configChange = value
                    return true
                }
                GM_setValue(property, value)
                GM_getValue('isDebug') && originalConsole.debug(`[Debug] set: ${property} ${/password/i.test(property) || /token/i.test(property) || /authorization/i.test(property) ? '凭证已隐藏' : stringify(value)}`)
                if (!isNullOrUndefined(target.configChange)) target.configChange(property)
                return true
            }
        })
        for (const item in body) {
            GM_addValueChangeListener(
                item,
                (name: string, old_value: any, new_value: any, remote: boolean) => {
                    if (remote && !isNullOrUndefined(body.configChange)) body.configChange(name)
                }
            )
        }
        return body
    }
    private static getLanguage(value?: string): string {
        function formatLanguage(value: string) {
            return value.replace('-', '_').toLowerCase()
        }
        function getMainLanguage(value: string) {
            return value.split('_').shift()!
        }
        let custom = formatLanguage(value ?? DEFAULT_CONFIG.language)
        if (!isNullOrUndefined(custom)) {
            if (!isNullOrUndefined(i18nList[custom])) {
                return custom
            } else {
                let customMain = getMainLanguage(custom)
                if (!isNullOrUndefined(i18nList[customMain])) {
                    return customMain
                }
            }
        }
        let env = formatLanguage(navigator.language ?? navigator.languages[0] ?? DEFAULT_CONFIG.language)
        if (!isNullOrUndefined(i18nList[env])) {
            return env
        } else {
            let main = getMainLanguage(env)
            if (!isNullOrUndefined(i18nList[main])) {
                return main
            }
        }
        return DEFAULT_CONFIG.language
    }
    public static getInstance(): Config {
        if (isNullOrUndefined(Config.instance)) Config.instance = new Config()
        return Config.instance;
    }
    public static destroyInstance() {
        Config.instance = undefined as any;
    }
}
export const config = Config.getInstance();
