import "./env"
import { i18nList } from "./i18n";
import { config } from "./config";
import { originalAddEventListener, originalFetch } from "./hijack";
import { hasFunction, isArray, isNullOrUndefined, isStringTupleArray, prune, stringify } from "./env";

export const unlimitedFetch = (input: RequestInfo, init?: RequestInit, force?: boolean): Promise<Response> => {
    if (init && init.headers && isStringTupleArray(init.headers)) throw new Error("init headers Error")
    return force || (typeof input === 'string' ? input : input.url).toURL().hostname !== unsafeWindow.location.hostname ? new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: (init && init.method) as Tampermonkey.Request['method'],
            url: typeof input === 'string' ? input : input.url,
            headers: (init && init.headers) as Tampermonkey.RequestHeaders || {},
            data: ((init && init.body) || null) as Tampermonkey.Request['data'],
            onload: function (response: Tampermonkey.ResponseBase) {
                resolve(new Response(response.responseText, {
                    status: response.status,
                    statusText: response.statusText,
                }))
            },
            onerror: function (error: Tampermonkey.ErrorResponse) {
                reject(error);
            }
        })
    }) : originalFetch(input, init)
}

export const findElement = (element: Element, condition: string) => {
    while (!isNullOrUndefined(element) && !element.matches(condition)) {
        if (isNullOrUndefined(element.parentElement)) return undefined
        element = element.parentElement
    }
    return element.querySelectorAll(condition).length > 1 ? undefined : element
}

export const renderNode = <T extends keyof HTMLElementTagNameMap>(renderCode: RenderCode<T> | string): HTMLElementTagNameMap[T] => {
    let code = prune(renderCode);
    if (isNullOrUndefined(code)) throw new Error("RenderCode null");
    if (typeof code === 'string') {
        return document.createTextNode(code.replaceVariable(i18nList[config.language])) as any;
    }
    if (code instanceof Node) {
        return code as any;
    }
    if (typeof renderCode !== 'object' || !renderCode.nodeType) {
        throw new Error('Invalid arguments');
    }
    const { nodeType, attributes, events, className, childs } = renderCode;
    const node = document.createElement(nodeType);

    (!isNullOrUndefined(events) && Object.keys(events).length > 0) && Object.entries(events).forEach(([eventName, eventHandler]: [string, EventListenerOrEventListenerObject]) => originalAddEventListener.call(node, eventName, eventHandler));
    (!isNullOrUndefined(className) && className.length > 0) && node.classList.add(...(typeof className === 'string' ? [className] : className));
    !isNullOrUndefined(childs) && node.append(...(isArray(childs) ? childs : [childs]).filter(child => !isNullOrUndefined(child)).map(renderNode));
    (!isNullOrUndefined(attributes) && Object.keys(attributes).length > 0) && Object.entries(attributes).forEach(([key, value]: [string, string]) => { (node as any)[key] = value; node.setAttribute(key, value) });

    return node;
}

String.prototype.replaceVariable = function (replacements, count = 0) {
    let replaceString = this.toString()
    try {
        replaceString = Object.entries(replacements).reduce((str, [key, value]) => {
            if (str.includes(`%#${key}:`)) {
                let format = str.among(`%#${key}:`, '#%').toString()
                return str.replaceAll(`%#${key}:${format}#%`, stringify(hasFunction(value, 'format') ? value.format(format) : value))
            } if (value instanceof Date) {
                return str.replaceAll(`%#${key}#%`, value.format('YYYY-MM-DD'))
            } else {
                return str.replaceAll(`%#${key}#%`, stringify(value))
            }
        },
            replaceString
        )
        count++
        return Object.keys(replacements).map((key) => this.includes(`%#${key}`)).includes(true) && count < 128 ? replaceString.replaceVariable(replacements, count) : replaceString
    } catch (error: unknown) {
        GM_getValue('isDebug') && console.debug(`replace variable error: ${stringify(error)}`)
        return replaceString
    }
}