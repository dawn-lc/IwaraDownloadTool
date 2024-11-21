
import moment from "moment";
import { config, i18n } from "./main";

export const originalFetch = unsafeWindow.fetch
export const originalPushState = unsafeWindow.history.pushState;
export const originalReplaceState = unsafeWindow.history.replaceState;
export const originalNodeAppendChild = unsafeWindow.Node.prototype.appendChild
export const originalRemoveChild = unsafeWindow.Node.prototype.removeChild
export const originalRemove = unsafeWindow.Element.prototype.remove
export const originalAddEventListener = unsafeWindow.EventTarget.prototype.addEventListener
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

export const emojiSeq = String.raw`(?:\p{Emoji}\uFE0F\u20E3?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation})`
export const emojiSTags = String.raw`\u{E0061}-\u{E007A}`
export const emojiRegex = new RegExp(String.raw`[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[${emojiSTags}]{2}[\u{E0030}-\u{E0039}${emojiSTags}]{1,3}\u{E007F}|${emojiSeq}(?:\u200D${emojiSeq})*`, 'gu')

export const hasFunction = (obj: any, method: string): boolean => {
    return !method.isEmpty() && !isNull(obj) ? method in obj && typeof obj[method] === 'function' : false
}
export const getString = (obj: any): string => {
    obj = obj instanceof Error ? String(obj) : obj
    obj = obj instanceof Date ? obj.format('YYYY-MM-DD') : obj
    return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj)
}

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

Array.prototype.append = function (arr) {
    this.push(...arr)
}

Date.prototype.format = function (format?: string) {
    return moment(this).locale(language()).format(format)
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

export function prune(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.filter(isNotEmpty).map(prune);
    }
    if (isElement(obj) || isNode(obj)) {
        return obj
    }
    if (isObject(obj)) {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([key, value]) => isNotEmpty(value))
                .map(([key, value]) => [key, prune(value)])
        )
    }
    return isNotEmpty(obj) ? obj : undefined;
}
export function isNotEmpty(obj: any): boolean {
    if (isNull(obj)) {
        return false
    }
    if (Array.isArray(obj)) {
        return obj.some(isNotEmpty);
    }
    if (isString(obj)) {
        return !obj.isEmpty();
    }
    if (isNumber(obj)) {
        return !Number.isNaN(obj)
    }
    if (isElement(obj) || isNode(obj)) {
        return true
    }
    if (isObject(obj)) {
        return Object.values(obj).some(isNotEmpty)
    }
    return true
}

export function fetch (input: RequestInfo, init?: RequestInit, force?: boolean): Promise<Response> {
    if (init && init.headers && isStringTupleArray(init.headers)) throw new Error("init headers Error")
    if (init && init.method && !(init.method === 'GET' || init.method === 'HEAD' || init.method === 'POST')) throw new Error("init method Error")
    return force || (typeof input === 'string' ? input : input.url).toURL().hostname !== unsafeWindow.location.hostname ? new Promise((resolve, reject) => {
        GM_xmlhttpRequest(prune({
            method: (init && init.method) as "GET" | "HEAD" | "POST" || 'GET',
            url: typeof input === 'string' ? input : input.url,
            headers: (init && init.headers) as Tampermonkey.RequestHeaders || {},
            data: ((init && init.body) || null) as string,
            onload: function (response: Tampermonkey.ResponseBase) {
                resolve(new Response(response.responseText, {
                    status: response.status,
                    statusText: response.statusText,
                }))
            },
            onerror: function (error: Error) {
                reject(error)
            }
        }))
    }) : originalFetch(input, init)
}

export const UUID = function () {
    return Array.from({ length: 8 }, () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)).join('')
}
export const ceilDiv = function (dividend: number, divisor: number): number {
    return Math.floor(dividend / divisor) + (dividend % divisor > 0 ? 1 : 0)
}

export const findElement = function (element: Element, condition: string) {
    while (!isNullOrUndefined(element) && !element.matches(condition)) {
        if (isNullOrUndefined(element.parentElement)){
            return element
        }
        element = element.parentElement
    }
    return element
}

export const language = function () {
    let env = (!isNull(config) ? config.language : (navigator.language ?? navigator.languages[0] ?? 'en')).replace('-', '_')
    let main = env.split('_').shift() ?? 'en'
    return (!isNull(i18n[env]) ? env : !isNull(i18n[main]) ? main : 'en')
}

export const renderNode = function (renderCode: RenderCode): Node | Element {
    renderCode = prune(renderCode)
    if (isNullOrUndefined(renderCode)) throw new Error("RenderCode null")
    if (typeof renderCode === 'string') {
        return document.createTextNode(renderCode.replaceVariable(i18n[language()]).toString())
    }
    if (renderCode instanceof Node) {
        return renderCode
    }
    if (typeof renderCode !== 'object' || !renderCode.nodeType) {
        throw new Error('Invalid arguments')
    }
    const { nodeType, attributes, events, className, childs } = renderCode
    const node: Element = document.createElement(nodeType);
    (!isNullOrUndefined(attributes) && Object.keys(attributes).any()) && Object.entries(attributes).forEach(([key, value]: [string, string]) => node.setAttribute(key, value));
    (!isNullOrUndefined(events) && Object.keys(events).any()) && Object.entries(events).forEach(([eventName, eventHandler]: [string, EventListenerOrEventListenerObject]) => originalAddEventListener.call(node, eventName, eventHandler));
    (!isNullOrUndefined(className) && className.length > 0) && node.classList.add(...typeof className === 'string' ? [className] : className);
    !isNullOrUndefined(childs) && node.append(...(isArray(childs) ? childs : new Array(childs)).map(renderNode))
    return node
}
