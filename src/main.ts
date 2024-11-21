
import { i18n } from "./i18n";
import { compatible, isNull, isNullOrUndefined, isStringTupleArray, originalAddEventListener, originalFetch, originalNodeAppendChild, originalPushState, originalRemove, originalRemoveChild, originalReplaceState } from "./env";
import { findElement, getString, renderNode } from "./extension"
import { getPlayload, getSelectButton, injectCheckbox, newToast, pageChange, toastNode, uninjectCheckbox } from "./function";
import { Config, VersionState, Version, VideoInfo, configEdit, ToastType, Database, menu, SyncDictionary, MessageType, Dictionary } from "./class";


export var rating = 'all';
export var config = new Config()
export var db = new Database()
export var pluginMenu = new menu()
export var editConfig = new configEdit(config)
export var selectList = new SyncDictionary<PieceInfo>('selectList', [], (event) => {
    const message = event.data as IChannelMessage<{ timestamp: number, value: Array<[key: string, value: PieceInfo]> }>
    const updateButtonState = (videoID: string) => {
        const selectButton = getSelectButton(videoID)
        if (selectButton) selectButton.checked = selectList.has(videoID)
    }
    switch (message.type) {
        case MessageType.Set:
        case MessageType.Del:
            updateButtonState(message.data.value[0][0])
            break;
        case MessageType.Request:
        case MessageType.Receive:
            (document.querySelectorAll('input.selectButton') as NodeListOf<HTMLInputElement>).forEach(button => {
                const videoid = button.getAttribute('videoid')
                if (videoid) button.checked = selectList.has(videoid)
            })
            break
        default:
            break
    }
});
export var pageSelectButtons = new Dictionary<HTMLInputElement>()






export function firstRun() {
    console.log('First run config reset!')
    GM_listValues().forEach(i => GM_deleteValue(i))
    config.reset()
    editConfig = new configEdit(config)
    let confirmButton = renderNode({
        nodeType: 'button',
        attributes: {
            disabled: true,
            title: i18n[config.language].ok
        },
        childs: '%#ok#%',
        events: {
            click: () => {
                GM_setValue('isFirstRun', false)
                GM_setValue('version', GM_info.script.version)
                unsafeWindow.document.querySelector('#pluginOverlay')?.remove()
                editConfig.inject()
            }
        }
    }) as HTMLButtonElement
    originalNodeAppendChild.call(unsafeWindow.document.body, renderNode({
        nodeType: 'div',
        attributes: {
            id: 'pluginOverlay'
        },
        childs: [
            {
                nodeType: 'div',
                className: 'main',
                childs: [
                    { nodeType: 'p', childs: '%#useHelpForBase#%' },
                    { nodeType: 'p', childs: '%#useHelpForInjectCheckbox#%' },
                    { nodeType: 'p', childs: '%#useHelpForCheckDownloadLink#%' },
                    { nodeType: 'p', childs: i18n[config.language].useHelpForManualDownload },
                    { nodeType: 'p', childs: i18n[config.language].useHelpForBugreport }
                ]
            },
            {
                nodeType: 'div',
                className: 'checkbox-container',
                childs: {
                    nodeType: 'label',
                    className: ['checkbox-label', 'rainbow-text'],
                    childs: [{
                        nodeType: 'input',
                        className: 'checkbox',
                        attributes: {
                            type: 'checkbox',
                            name: 'agree-checkbox'
                        },
                        events: {
                            change: (event: Event) => {
                                confirmButton.disabled = !(event.target as HTMLInputElement).checked
                            }
                        }
                    }, '%#alreadyKnowHowToUse#%'
                    ]
                }
            },
            confirmButton
        ]
    }))
}
(function () {
    var mouseTarget: Element | null = null
    if (unsafeWindow.IwaraDownloadTool) return;
    unsafeWindow.IwaraDownloadTool = true;
    GM_addStyle(GM_getResourceText('toastify-css'));
    GM_addStyle('@!mainCSS!@');
    if (GM_getValue('isDebug')) {
        console.debug(getString(GM_info))
        debugger
    }
    if (new Version(GM_getValue('version', '0.0.0')).compare(new Version('3.2.76')) === VersionState.Low) {
        GM_deleteValue('selectList')
    }
    const modifyFetch = async (input: Request | string | URL, init?: RequestInit) => {
        GM_getValue('isDebug') && console.debug(`Fetch ${input}`)
        let url = (input instanceof Request ? input.url : input instanceof URL ? input.href : input).toURL()
        if (!isNullOrUndefined(init) && !isNull(init.headers) && !isStringTupleArray(init.headers)) {
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
                        rating = url.searchParams.get('rating') ?? 'all'
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
    unsafeWindow.fetch = modifyFetch
    unsafeWindow.EventTarget.prototype.addEventListener = function (type, listener, options) {
        originalAddEventListener.call(this, type, listener, options)
    }
    async function main() {
        if (GM_getValue('isFirstRun', true)) {
            firstRun()
            return
        }
        if (!await config.check()) {
            newToast(ToastType.Info, {
                text: `%#configError#%`,
                duration: 60 * 1000,
            }).showToast()
            editConfig.inject()
            return
        }
        GM_setValue('version', GM_info.script.version)
        if (config.autoInjectCheckbox) {
            Node.prototype.appendChild = function <T extends Node>(node: T): T {
                if (node instanceof HTMLElement && node.classList.contains('videoTeaser')) {
                    injectCheckbox(node, compatible)
                }
                return originalNodeAppendChild.call(this, node) as T
            }
        }
        Node.prototype.removeChild = function <T extends Node>(child: T): T {
            uninjectCheckbox(child)
            return originalRemoveChild.apply(this, [child]) as T
        }
        Element.prototype.remove = function () {
            uninjectCheckbox(this)
            return originalRemove.apply(this)
        }
        new MutationObserver(async (m, o) => {
            if (m.some(m => m.type === 'childList' && unsafeWindow.document.getElementById('app'))) {
                pluginMenu.inject()
                o.disconnect()
            }
        }).observe(unsafeWindow.document.body, { childList: true, subtree: true })
        originalAddEventListener('mouseover', (event: Event) => {
            mouseTarget = (event as MouseEvent).target instanceof Element ? (event as MouseEvent).target as Element : null
        })
        unsafeWindow.history.pushState = function (...args) {
            originalPushState.apply(this, args)
            pageChange()
        }
        unsafeWindow.history.replaceState = function (...args) {
            originalReplaceState.apply(this, args)
            pageChange()
        }
        unsafeWindow.document.addEventListener('keydown', function (e) {
            if (e.code === 'Space' && !isNull(mouseTarget)) {
                let element = findElement(mouseTarget, '.videoTeaser')
                let button = element && (element.matches('.selectButton') ? element : element.querySelector('.selectButton'))
                button && (button as HTMLInputElement).click()
                button && e.preventDefault()
            }
        })
        let notice = newToast(
            ToastType.Info,
            {
                node: toastNode(i18n[config.language].notice),
                duration: 10000,
                gravity: 'bottom',
                position: 'center',
                onClick() {
                    notice.hideToast()
                }
            }
        )
        notice.showToast()
    }
    if (new Version(GM_getValue('version', '0.0.0')).compare(new Version('3.2.5')) === VersionState.Low) {
        GM_setValue('isFirstRun', true)
        alert(i18n[config.language].configurationIncompatible)
    }
    (unsafeWindow.document.body ? Promise.resolve() : new Promise(resolve => originalAddEventListener.call(unsafeWindow.document, "DOMContentLoaded", resolve))).then(main)
})();