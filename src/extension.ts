import { i18n } from "./i18n";
import { getLanguage, isArray, isElement, isNode, isNull, isNullOrUndefined, isNumber, isObject, isString, isStringTupleArray} from "./env";
import { originalAddEventListener, originalFetch } from "./hijack";
import { Config } from "./config";

export const hasFunction = (obj: any, method: string): boolean => {
    return !method.isEmpty() && !isNull(obj) ? method in obj && typeof obj[method] === 'function' : false
}
export const getString = (obj: any): string => {
    obj = obj instanceof Error ? String(obj) : obj
    obj = obj instanceof Date ? obj.format('YYYY-MM-DD') : obj
    return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj)
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

export function unlimitedFetch (input: RequestInfo, init?: RequestInit, force?: boolean): Promise<Response> {
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

export const renderNode = function (renderCode: RenderCode, config: Config): Node | Element {
    renderCode = prune(renderCode)
    if (isNullOrUndefined(renderCode)) throw new Error("RenderCode null")
    if (typeof renderCode === 'string') {
        return document.createTextNode(renderCode.replaceVariable(i18n[getLanguage(config)]))
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
    !isNullOrUndefined(childs) && node.append(...(isArray(childs) ? childs : new Array(childs)).map(i=>renderNode(i,config)))
    return node
}