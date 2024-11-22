import { getCompatible, isNullOrUndefined, isStringTupleArray } from "./env";
import { Config, Database, VideoInfo } from "./class";
import { getPlayload } from "./function";
import { injectCheckbox, pageChange, uninjectCheckbox } from "./main";

export const originalFetch = unsafeWindow.fetch
export const originalPushState = unsafeWindow.history.pushState;
export const originalReplaceState = unsafeWindow.history.replaceState;
export const originalNodeAppendChild = unsafeWindow.Node.prototype.appendChild
export const originalRemoveChild = unsafeWindow.Node.prototype.removeChild
export const originalRemove = unsafeWindow.Element.prototype.remove
export const originalAddEventListener = unsafeWindow.EventTarget.prototype.addEventListener

export function hijackFetch(config: Config, db: Database) {
    unsafeWindow.fetch = async (input: Request | string | URL, init?: RequestInit) => {
        GM_getValue('isDebug') && console.debug(`Fetch ${input}`)
        let url = (input instanceof Request ? input.url : input instanceof URL ? input.href : input).toURL()
        if (!isNullOrUndefined(init) && !isNullOrUndefined(init.headers) && !isStringTupleArray(init.headers)) {
            let authorization = null
            if (init.headers instanceof Headers) {
                authorization = init.headers.has('Authorization') ? init.headers.get('Authorization') : null
            } else {
                for (const key in init.headers) {
                    if (key.toLowerCase() === "authorization") {
                        authorization = init.headers[key]
                        break
                    }
                }
            }
            if (!isNullOrUndefined(authorization) && authorization !== config.authorization) {
                let playload = getPlayload(authorization)
                if (playload['type'] === 'refresh_token') {
                    GM_getValue('isDebug') && console.debug(`refresh_token: ${authorization.split(' ').pop()}`)
                    if (isNullOrUndefined(localStorage.getItem('token'))) localStorage.setItem('token', authorization.split(' ').pop() ?? '')
                }
                if (playload['type'] === 'access_token') {
                    config.authorization = `Bearer ${authorization.split(' ').pop()}`
                    GM_getValue('isDebug') && console.debug(JSON.parse(decodeURIComponent(encodeURIComponent(window.atob(config.authorization.split('.')[1])))))
                    GM_getValue('isDebug') && console.debug(`access_token: ${config.authorization.split(' ').pop()}`)
                }
            }
        }
        return new Promise((resolve, reject) => originalFetch(input, init)
            .then(async (response) => {
                if (url.hostname !== 'api.iwara.tv' || url.pathname.isEmpty()) return resolve(response)
                let path = url.pathname.toLowerCase().split('/').slice(1)
                switch (path[0]) {
                    case 'videos':
                        let cloneResponse = response.clone()
                        if (!cloneResponse.ok) break;
                        let cloneBody = await cloneResponse.json() as Iwara.Page
                        let list = cloneBody.results as Iwara.Video[]
                        [...list].forEach(info => new VideoInfo().init(info.id, info))
                        if (!config.addUnlistedAndPrivate) break
                        GM_getValue('isDebug') && console.debug(url.searchParams)
                        if (url.searchParams.has('subscribed') || url.searchParams.has('user') || url.searchParams.has('sort') ? url.searchParams.get('sort') !== 'date' : false) break
                        let sortList = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                        let cache = await db.getFilteredVideos(sortList.at(0)?.createdAt, sortList.at(-1)?.createdAt)
                        if (!cache.any()) break
                        cloneBody.count = cloneBody.count + cache.length
                        cloneBody.limit = cloneBody.limit + cache.length
                        cloneBody.results.push(...cache.map(i => i.RAW).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
                        return resolve(new Response(JSON.stringify(cloneBody), {
                            status: cloneResponse.status,
                            statusText: cloneResponse.statusText,
                            headers: Object.fromEntries(cloneResponse.headers.entries())
                        }))
                    default:
                        break
                }
                return resolve(response)
            })
            .catch((err) => reject(err))) as Promise<Response>
    }
}

export function hijackAddEventListener() {
    unsafeWindow.EventTarget.prototype.addEventListener = function (type, listener, options) {
        originalAddEventListener.call(this, type, listener, options)
    }
}

export function hijackNodeAppendChild() {
    Node.prototype.appendChild = function <T extends Node>(node: T): T {
        if (node instanceof HTMLElement && node.classList.contains('videoTeaser')) {
            injectCheckbox(node, getCompatible())
        }
        return originalNodeAppendChild.call(this, node) as T
    }
}
export function hijackNodeRemoveChild() {
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
        uninjectCheckbox(child)
        return originalRemoveChild.apply(this, [child]) as T
    }

}
export function hijackElementRemove() {
    Element.prototype.remove = function () {
        uninjectCheckbox(this)
        return originalRemove.apply(this)
    }
}
export function hijackHistoryPushState() {
    unsafeWindow.history.pushState = function (...args) {
        originalPushState.apply(this, args)
        pageChange()
    }
}

export function hijackHistoryReplaceState() {
    unsafeWindow.history.replaceState = function (...args) {
        originalReplaceState.apply(this, args)
        pageChange()
    }
}