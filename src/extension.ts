import { isArray, isElement, isNode, isNull, isNullOrUndefined, isNumber, isObject, isString, isStringTupleArray } from "./env"
import { i18n } from "./i18n";
import { config } from "./config";
import { originalAddEventListener, originalFetch } from "./hijack";

export const delay = (time: number) => new Promise(resolve => setTimeout(resolve, time))
export const hasFunction = (obj: any, method: string): boolean => {
    return !method.isEmpty() && !isNull(obj) ? method in obj && typeof obj[method] === 'function' : false
}
export const getString = (obj: any): string => {
    obj = obj instanceof Error ? String(obj) : obj
    obj = obj instanceof Date ? obj.toISOString() : obj
    return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj)
}
export const prune = (obj: any): any => {
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
export const isNotEmpty = (obj: any): boolean => {
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
export const unlimitedFetch = (input: RequestInfo, init?: RequestInit, force?: boolean): Promise<Response> => {
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
export const UUID = () => {
    return isNullOrUndefined(crypto) ? Array.from({ length: 8 }, () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)).join('') : crypto.randomUUID().replaceAll('-', '')
}
export const ceilDiv = (dividend: number, divisor: number): number => {
    return Math.floor(dividend / divisor) + (dividend % divisor > 0 ? 1 : 0)
}
export const findElement = (element: Element, condition: string) => {
    while (!isNullOrUndefined(element) && !element.matches(condition)) {
        if (isNullOrUndefined(element.parentElement)) {
            return element
        }
        element = element.parentElement
    }
    return element
}
export const renderNode = <T extends keyof HTMLElementTagNameMap>(renderCode: RenderCode<T> | string): HTMLElementTagNameMap[T] => {
    renderCode = prune(renderCode);
    if (isNullOrUndefined(renderCode)) throw new Error("RenderCode null");
    if (typeof renderCode === 'string') {
        return document.createTextNode(renderCode.replaceVariable(i18n[config.language])) as any;
    }
    if (renderCode instanceof Node) {
        return renderCode as any;
    }
    if (typeof renderCode !== 'object' || !renderCode.nodeType) {
        throw new Error('Invalid arguments');
    }
    const { nodeType, attributes, events, className, childs } = renderCode;
    const node: ElementTypeFromNodeType<T> = document.createElement(nodeType);

    (!isNullOrUndefined(events) && Object.keys(events).length > 0) && Object.entries(events).forEach(([eventName, eventHandler]: [string, EventListenerOrEventListenerObject]) => originalAddEventListener.call(node, eventName, eventHandler));
    (!isNullOrUndefined(className) && className.length > 0) && node.classList.add(...(typeof className === 'string' ? [className] : className));
    !isNullOrUndefined(childs) && node.append(...(isArray(childs) ? childs : [childs]).map(renderNode));
    (!isNullOrUndefined(attributes) && Object.keys(attributes).length > 0) && Object.entries(attributes).forEach(([key, value]: [string, string]) => { node[key] = value; node.setAttribute(key, value) });

    return node;
}


String.prototype.isEmpty = function () {
    return !isNullOrUndefined(this) && this.length === 0
}
String.prototype.splitLimit = function (separator: string, limit?: number) {
    if (this.isEmpty() || isNullOrUndefined(separator)) {
        throw new Error('Empty')
    }
    let body = this.split(separator)
    return limit ? body.slice(0, limit).concat(body.slice(limit).join(separator)) : body
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
        return Object.keys(replacements).map((key) => this.includes(`%#${key}`)).includes(true) && count < 128 ? replaceString.replaceVariable(replacements, count) : replaceString
    } catch (error) {
        GM_getValue('isDebug') && console.debug(`replace variable error: ${getString(error)}`)
        return replaceString
    }
}