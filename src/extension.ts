import "./env"
import { i18nList } from "./i18n";
import { config } from "./config";
import { originalAddEventListener, originalFetch } from "./hijack";
import { hasFunction, isArray, isNullOrUndefined, isStringTupleArray, prune, stringify } from "./env";

/**
 * 执行跨域fetch请求，自动处理同源检测
 * @param {RequestInfo} input - 请求URL或Request对象
 * @param {RequestInit} [init] - 可选的请求配置
 * @param {boolean} [force] - 是否强制使用GM_xmlhttpRequest
 * @returns {Promise<Response>} 返回响应Promise
 * @throws {Error} 当init.headers不是字符串元组数组时抛出错误
 */
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

/**
 * 查找匹配指定条件的DOM元素
 * @param {Element} element - 起始查找元素
 * @param {string} condition - CSS选择器条件
 * @returns {Element|undefined} 返回匹配的元素，未找到返回undefined
 */
export const findElement = (element: Element, condition: string): Element | undefined => {
    while (!isNullOrUndefined(element) && !element.matches(condition)) {
        if (isNullOrUndefined(element.parentElement)) return undefined
        element = element.parentElement
    }
    return element.querySelectorAll(condition).length > 1 ? undefined : element
}

/**
 * 渲染DOM节点
 * @template T HTML元素标签名
 * @param {RenderCode<T>|string} renderCode - 渲染代码，可以是字符串或RenderCode对象
 * @returns {HTMLElementTagNameMap[T]} 返回渲染后的HTML元素
 * @throws {Error} 当renderCode为null/undefined或无效参数时抛出错误
 */
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