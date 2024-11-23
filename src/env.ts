import moment from "moment";
import { i18n } from "./i18n";
import { getString, hasFunction } from "./extension";
import { Config } from "./class";

export const isNull = (obj: unknown): obj is null => obj === null;
export const isUndefined = (obj: unknown): obj is undefined => typeof obj === 'undefined';
export const isNullOrUndefined = (obj: unknown): obj is null | undefined => isUndefined(obj) || isNull(obj);
export const isObject = (obj: unknown): obj is Object => !isNull(obj) && typeof obj === 'object' && !Array.isArray(obj)
export const isString = (obj: unknown): obj is String => !isNull(obj) && typeof obj === 'string'
export const isNumber = (obj: unknown): obj is Number => !isNull(obj) && typeof obj === 'number'
export const isArray = (obj: unknown): obj is any[] => Array.isArray(obj)
export const isElement = (obj: unknown): obj is Element => !isNull(obj) && obj instanceof Element
export const isNode = (obj: unknown): obj is Node => !isNull(obj) && obj instanceof Node
export const isStringTupleArray = (obj: unknown): obj is [string, string][] => Array.isArray(obj) && obj.every(item => Array.isArray(item) && item.length === 2 && typeof item[0] === 'string' && typeof item[1] === 'string')

const emojiSeq = String.raw`(?:\p{Emoji}\uFE0F\u20E3?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation})`
const emojiSTags = String.raw`\u{E0061}-\u{E007A}`
const emojiRegex = new RegExp(String.raw`[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[${emojiSTags}]{2}[\u{E0030}-\u{E0039}${emojiSTags}]{1,3}\u{E007F}|${emojiSeq}(?:\u200D${emojiSeq})*`, 'gu')

Array.prototype.any = function () {
    return this.prune().length > 0
}
Array.prototype.prune = function () {
    return this.filter(i => i !== null && typeof i !== 'undefined')
}
Array.prototype.unique = function <T>(this: T[], prop?: keyof T): T[] {
    return this.filter((item, index, self) =>
        index === self.findIndex((t) => (
            prop ? t[prop] === item[prop] : t === item
        ))
    )
}
Array.prototype.union = function <T>(this: T[], that: T[], prop?: keyof T): T[] {
    return [...this, ...that].unique(prop)
}
Array.prototype.intersect = function <T>(this: T[], that: T[], prop?: keyof T): T[] {
    return this.filter((item) =>
        that.some((t) => prop ? t[prop] === item[prop] : t === item)
    ).unique(prop)
}
Array.prototype.difference = function <T>(this: T[], that: T[], prop?: keyof T): T[] {
    return this.filter((item) =>
        !that.some((t) => prop ? t[prop] === item[prop] : t === item)
    ).unique(prop)
}
Array.prototype.complement = function <T>(this: T[], that: T[], prop?: keyof T): T[] {
    return this.union(that, prop).difference(this.intersect(that, prop), prop)
}
String.prototype.isEmpty = function () {
    return !isNull(this) && this.length === 0
}
String.prototype.among = function (start: string, end: string, greedy: boolean = false) {
    if (this.isEmpty() || start.isEmpty() || end.isEmpty()) return ''
    const startIndex = this.indexOf(start)
    if (startIndex === -1) return ''
    const adjustedStartIndex = startIndex + start.length
    const endIndex = greedy ? this.lastIndexOf(end) : this.indexOf(end, adjustedStartIndex)
    if (endIndex === -1 || endIndex < adjustedStartIndex) return ''
    return this.slice(adjustedStartIndex, endIndex)
}
String.prototype.splitLimit = function (separator: string, limit?: number) {
    if (this.isEmpty() || isNull(separator)) {
        throw new Error('Empty')
    }
    let body = this.split(separator)
    return limit ? body.slice(0, limit).concat(body.slice(limit).join(separator)) : body
}
String.prototype.truncate = function (maxLength) {
    return this.length > maxLength ? this.substring(0, maxLength) : this.toString()
}
String.prototype.trimHead = function (prefix: string) {
    return this.startsWith(prefix) ? this.slice(prefix.length) : this.toString()
}
String.prototype.trimTail = function (suffix: string) {
    return this.endsWith(suffix) ? this.slice(0, -suffix.length) : this.toString()
}
String.prototype.replaceEmojis = function (replace?: string | null) {
    return this.replaceAll(emojiRegex, replace ?? '')
}

String.prototype.toURL = function () {
    let URLString = this
    if (URLString.split('//')[0].isEmpty()) {
        URLString = `${unsafeWindow.location.protocol}${URLString}`
    }
    return new URL(URLString.toString())
}

export const getLanguage = function (config?: Config): string {
    if (!isNullOrUndefined(config)) {
        GM_getValue('isDebug') && !isNullOrUndefined(i18n[config.language]) && console.debug(`language not found ${config.language}`)
        return isNullOrUndefined(i18n[config.language]) ? getLanguage() : config.language
    }
    let env = (navigator.language ?? navigator.languages[0] ?? 'en').replace('-', '_');
    let main = env.split('_').shift() ?? 'en';
    return !isNullOrUndefined(i18n[env]) ? env : (!isNullOrUndefined(i18n[main]) ? main : 'en') 
}
export const getRating = () => unsafeWindow.document.querySelector('input.radioField--checked[name=rating]')?.getAttribute('value') ?? 'all'
export const getCompatible = () => navigator.userAgent.toLowerCase().includes('firefox')

Date.prototype.format = function (format?: string) {
    return moment(this).locale(getLanguage()).format(format)
}

String.prototype.replaceVariable = function (replacements, count = 0) {
    let replaceString = this.toString()
    try {
        replaceString = Object.entries(replacements).reduce((str, [key, value]) => {
            if (str.includes(`%#${key}:`)) {
                let format = str.among(`%#${key}:`, '#%').toString()
                return str.replaceAll(`%#${key}:${format}#%`, getString(hasFunction(value, 'format') ? value.format(format) : value))
            } else {
                return str.replaceAll(`%#${key}#%`, getString(value))
            }
        },
            replaceString
        )
        count++
        return Object.keys(replacements).map((key) => this.includes(`%#${key}#%`)).includes(true) && count < 128 ? replaceString.replaceVariable(replacements, count) : replaceString
    } catch (error) {
        GM_getValue('isDebug') && console.debug(`replace variable error: ${getString(error)}`)
        return replaceString
    }
}

export enum DownloadType {
    Aria2,
    IwaraDownloader,
    Browser,
    Others
}

export enum PageType {
    Video = 'video',
    Image = 'image',
    VideoList = 'videoList',
    ImageList = 'imageList',
    Forum = 'forum',
    ForumSection = 'forumSection',
    ForumThread = 'forumThread',
    Page = 'page',
    Home = 'home',
    Profile = 'profile',
    Subscriptions = 'subscriptions',
    Playlist = 'playlist',
    Favorites = 'favorites',
    Search = 'search',
    Account = 'account'
}

export enum ToastType {
    Log,
    Info,
    Warn,
    Error
}

export enum MessageType {
    Close,
    Request,
    Receive,
    Set,
    Del
}

export enum VersionState {
    Low,
    Equal,
    High
}