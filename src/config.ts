
import { i18n } from "./i18n";
import { isNullOrUndefined, DownloadType } from "./env";
import { getString } from "./extension";
const DEFAULT_CONFIG = {
    language: 'zh_CN',
    autoFollow: false,
    autoLike: false,
    autoCopySaveFileName: false,
    autoInjectCheckbox: true,
    checkDownloadLink: true,
    checkPriority: true,
    addUnlistedAndPrivate: true,
    downloadPriority: 'Source',
    downloadType: DownloadType.Others,
    downloadPath: '/Iwara/%#AUTHOR#%/%#TITLE#%[%#ID#%].mp4',
    downloadProxy: '',
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
    addUnlistedAndPrivate: boolean
    autoInjectCheckbox: boolean
    autoCopySaveFileName: boolean
    checkDownloadLink: boolean
    checkPriority: boolean
    downloadPriority: string
    downloadType: DownloadType
    downloadPath: string
    downloadProxy: string
    aria2Path: string
    aria2Token: string
    iwaraDownloaderPath: string
    iwaraDownloaderToken: string
    authorization!: string;
    priority: Record<string, number>
    [key: string]: any
    constructor() {
        let env = (navigator.language ?? navigator.languages[0] ?? DEFAULT_CONFIG.language).replace('-', '_')
        let main = env.split('_').shift() ?? DEFAULT_CONFIG.language.split('_').shift()!
        this.language = isNullOrUndefined(i18n[env]) ? (!isNullOrUndefined(i18n[main]) ? main : DEFAULT_CONFIG.language) : env
        this.autoFollow = DEFAULT_CONFIG.autoFollow
        this.autoLike = DEFAULT_CONFIG.autoLike
        this.autoCopySaveFileName = DEFAULT_CONFIG.autoCopySaveFileName
        this.autoInjectCheckbox = DEFAULT_CONFIG.autoInjectCheckbox
        this.checkDownloadLink = DEFAULT_CONFIG.checkDownloadLink
        this.checkPriority = DEFAULT_CONFIG.checkPriority
        this.addUnlistedAndPrivate = DEFAULT_CONFIG.addUnlistedAndPrivate
        this.downloadPriority = DEFAULT_CONFIG.downloadPriority
        this.downloadType = DEFAULT_CONFIG.downloadType
        this.downloadPath = DEFAULT_CONFIG.downloadPath
        this.downloadProxy = DEFAULT_CONFIG.downloadProxy
        this.aria2Path = DEFAULT_CONFIG.aria2Path
        this.aria2Token = DEFAULT_CONFIG.aria2Token
        this.iwaraDownloaderPath = DEFAULT_CONFIG.iwaraDownloaderPath
        this.iwaraDownloaderToken = DEFAULT_CONFIG.iwaraDownloaderToken
        this.priority = DEFAULT_CONFIG.priority
        let body = new Proxy(this, {
            get: function (target, property: string) {
                if (property === 'configChange') {
                    return target.configChange
                }
                let value = GM_getValue(property, target[property])
                GM_getValue('isDebug') && console.debug(`get: ${property} ${getString(value)}`)
                return value
            },
            set: function (target, property: string, value) {
                if (property === 'configChange') {
                    target.configChange = value
                    return true
                }
                GM_setValue(property, value)
                GM_getValue('isDebug') && console.debug(`set: ${property} ${getString(value)}`)
                if (!isNullOrUndefined(target.configChange)) target.configChange(property)
                return true
            }
        })
        GM_listValues().forEach((value) => {
            GM_addValueChangeListener(value, (name: string, old_value: any, new_value: any, remote: boolean) => {
                GM_getValue('isDebug') && console.debug(`$Is Remote: ${remote} Change Value: ${name}`)//old: ${getString(old_value)} new: ${getString(new_value)}
                if (remote && !isNullOrUndefined(body.configChange)) body.configChange(name)
            })
        })
        return body
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