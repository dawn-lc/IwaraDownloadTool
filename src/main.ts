
import { i18n } from "./i18n";
import { DownloadType, getLanguage, isNullOrUndefined, MessageType, PageType, ToastType, VersionState } from "./env";
import { findElement, getString, renderNode, unlimitedFetch } from "./extension"
import { hijackElementRemove, hijackFetch, hijackHistoryPushState, hijackHistoryReplaceState, hijackNodeAppendChild, hijackNodeRemoveChild, originalAddEventListener, originalNodeAppendChild } from "./hijack";

import { analyzeLocalPath, aria2API, aria2Download, aria2TaskExtractVideoID, browserDownload, checkIsHaveDownloadLink, getAuth, iwaraDownloaderDownload, newToast, othersDownload, toastNode } from "./function";
import { Config, Version, configEdit, Database, menu, SyncDictionary, Dictionary, VideoInfo } from "./class";

export var config = new Config()
export var db = new Database()

export var pluginMenu = new menu()
export var editConfig = new configEdit(config)
export var pageSelectButtons = new Dictionary<HTMLInputElement>()
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

export function firstRun() {
    console.log('First run config reset!')
    GM_listValues().forEach(i => GM_deleteValue(i))
    config = new Config()
    editConfig = new configEdit(config)
    let confirmButton = renderNode({
        nodeType: 'button',
        attributes: {
            disabled: true,
            title: i18n[getLanguage(config)].ok
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
    },config) as HTMLButtonElement
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
                    { nodeType: 'p', childs: i18n[getLanguage(config)].useHelpForManualDownload },
                    { nodeType: 'p', childs: i18n[getLanguage(config)].useHelpForBugreport }
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
    },config))
}
export function uninjectCheckbox(element: Element | Node) {
    if (element instanceof HTMLElement) {
        if (element instanceof HTMLInputElement && element.classList.contains('selectButton')) {
            element.hasAttribute('videoID') && pageSelectButtons.delete(element.getAttribute('videoID')!)
        }
        if (element.querySelector('input.selectButton')) {
            element.querySelectorAll('.selectButton').forEach(i => i.hasAttribute('videoID') && pageSelectButtons.delete(i.getAttribute('videoID')!))
        }
    }
}
export async function injectCheckbox(element: Element, compatible: boolean) {
    let ID = (element.querySelector('a.videoTeaser__thumbnail') as HTMLLinkElement).href.toURL().pathname.split('/')[2]
    let videoInfo = await db.videos.where('ID').equals(ID).first()
    let Name = element.querySelector('.videoTeaser__title')?.getAttribute('title')!.trim() ?? videoInfo?.Title
    let Alias =  element.querySelector('a.username')?.getAttribute('title') ?? videoInfo?.Alias
    let Author = (element.querySelector('a.username') as HTMLLinkElement)?.href.toURL().pathname.split('/').pop() ?? videoInfo?.Author
    let node = compatible ? element : element.querySelector('.videoTeaser__thumbnail')
    if (isNullOrUndefined(ID) || isNullOrUndefined(Name) || isNullOrUndefined(Alias) || isNullOrUndefined(Author)) return
    let button = renderNode({
        nodeType: 'input',
        attributes: Object.assign(
            selectList.has(ID) ? { checked: true } : {}, {
            type: 'checkbox',
            videoID: ID,
            videoName: Name,
            videoAlias: Alias,
            videoAuthor: Author
        }),
        className: compatible ? ['selectButton', 'selectButtonCompatible'] : 'selectButton',
        events: {
            click: (event: Event) => {
                (event.target as HTMLInputElement).checked ? selectList.set(ID, {
                    Title: Name,
                    Alias: Alias,
                    Author: Author
                }) : selectList.delete(ID)
                event.stopPropagation()
                event.stopImmediatePropagation()
                return false
            }
        }
    },config) as HTMLInputElement
    pageSelectButtons.set(ID, button)
    originalNodeAppendChild.call(node, button)
}
export function pageChange() {
    pluginMenu.pageChange(unsafeWindow.document.querySelector('.page')?.classList[1].split('-').pop() as PageType)
    GM_getValue('isDebug') && console.debug(pageSelectButtons)
} 
export function getSelectButton(id: string): HTMLInputElement | undefined {
    return pageSelectButtons.has(id) ? pageSelectButtons.get(id) : unsafeWindow.document.querySelector(`input.selectButton[videoid="${id}"]`) as HTMLInputElement
}
export async function analyzeDownloadTask(list: IDictionary<PieceInfo> = selectList) {
    let size = list.size
    let node = renderNode({
        nodeType: 'p',
        childs: `%#parsingProgress#%[${list.size}/${size}]`
    },config)
    let start = newToast(config,ToastType.Info, {
        node: node,
        duration: -1
    })
    start.showToast()
    if (GM_getValue('isDebug') && config.downloadType === DownloadType.Aria2) {
        let completed: Array<string> = (await aria2API(config, 'aria2.tellStopped', [0, 2048, [
            'gid',
            'status',
            'files',
            'errorCode',
            'bittorrent'
        ]])).result.filter((task: Aria2.Status) => isNullOrUndefined(task.bittorrent) && (task.status === 'complete' || task.errorCode === '13')).map((task: Aria2.Status) => aria2TaskExtractVideoID(task)).filter(Boolean)
        for (let key of list.allKeys().intersect(completed)) {
            let button = getSelectButton(key)
            if (!isNullOrUndefined(button)) button.checked = false
            list.delete(key)
            node.firstChild!.textContent = `${i18n[getLanguage(config)].parsingProgress}[${list.size}/${size}]`
        }
    }
    let infoList = (await Promise.all(list.allKeys().map(async id => {
        let caches = db.videos.where('ID').equals(id)
        let cache = await caches.first()
        if ((await caches.count()) < 1 || isNullOrUndefined(cache)) {
            let parseToast = newToast(config,
                ToastType.Info,
                {
                    text: `${list.get(id)?.Title ?? id} %#parsing#%`,
                    duration: -1,
                    close: true,
                    onClick() {
                        parseToast.hideToast()
                    }
                }
            )
            parseToast.showToast()
            cache = await new VideoInfo(list.get(id)).init(id)
            parseToast.hideToast()
        }
        return cache
    }))).sort((a, b) => a.UploadTime.getTime() - b.UploadTime.getTime());
    for (let videoInfo of infoList) {
        let button = getSelectButton(videoInfo.ID)
        let video = videoInfo.State ? videoInfo : await new VideoInfo(list.get(videoInfo.ID)).init(videoInfo.ID);
        video.State && await pushDownloadTask(config, video)
        if (!isNullOrUndefined(button)) button.checked = false
        list.delete(videoInfo.ID)
        node.firstChild!.textContent = `${i18n[getLanguage(config)].parsingProgress}[${list.size}/${size}]`
    }
    start.hideToast()
    if (size != 1) {
        let completed = newToast(config,
            ToastType.Info,
            {
                text: `%#allCompleted#%`,
                duration: -1,
                close: true,
                onClick() {
                    completed.hideToast()
                }
            }
        )
        completed.showToast()
    }
}
export async function pushDownloadTask(config: Config, videoInfo: VideoInfo, bypass: boolean = false) {
    if (!videoInfo.State) {
        return
    }
    if (!bypass) {
        if (config.autoFollow && !videoInfo.Following) {
            if ((await unlimitedFetch(`https://api.iwara.tv/user/${videoInfo.AuthorID}/followers`, {
                method: 'POST',
                headers: await getAuth(config)
            })).status !== 201) newToast(config,ToastType.Warn, { text: `${videoInfo.Alias} %#autoFollowFailed#%`, close: true }).showToast()
        }
        if (config.autoLike && !videoInfo.Liked) {
            if ((await unlimitedFetch(`https://api.iwara.tv/video/${videoInfo.ID}/like`, {
                method: 'POST',
                headers: await getAuth(config)
            })).status !== 201) newToast(config,ToastType.Warn, { text: `${videoInfo.Title} %#autoLikeFailed#%`, close: true }).showToast()
        }
        if (config.checkDownloadLink && checkIsHaveDownloadLink(config, `${videoInfo.Description} ${videoInfo.Comments}`)) {
            let toastBody = toastNode(config,[
                `${videoInfo.Title}[${videoInfo.ID}] %#findedDownloadLink#%`,
                { nodeType: 'br' },
                `%#openVideoLink#%`
            ], '%#createTask#%')
            let toast = newToast(config,
                ToastType.Warn,
                {
                    node: toastBody,
                    close: config.autoCopySaveFileName,
                    onClick() {
                        GM_openInTab(`https://www.iwara.tv/video/${videoInfo.ID}`, { active: false, insert: true, setParent: true })
                        if (config.autoCopySaveFileName) {
                            GM_setClipboard(analyzeLocalPath(config.downloadPath.replaceVariable(
                                {
                                    NowTime: new Date(),
                                    UploadTime: videoInfo.UploadTime,
                                    AUTHOR: videoInfo.Author,
                                    ID: videoInfo.ID,
                                    TITLE: videoInfo.Title,
                                    ALIAS: videoInfo.Alias,
                                    QUALITY: videoInfo.DownloadQuality
                                }
                            ).trim()).filename, "text")
                            toastBody.appendChild(renderNode({
                                nodeType: 'p',
                                childs: '%#copySucceed#%'
                            },config))
                        } else {
                            toast.hideToast()
                        }
                    }
                }
            )
            toast.showToast()
            return
        }
        if (config.checkPriority && videoInfo.DownloadQuality !== config.downloadPriority) {
            let toast = newToast(config,
                ToastType.Warn,
                {
                    node: toastNode(config,[
                        `${videoInfo.Title}[${videoInfo.ID}] %#downloadQualityError#%`,
                        { nodeType: 'br' },
                        `%#tryReparseDownload#%`
                    ], '%#createTask#%'),
                    async onClick() {
                        toast.hideToast()
                        await pushDownloadTask(config, await new VideoInfo(videoInfo as PieceInfo).init(videoInfo.ID))
                    }
                }
            )
            toast.showToast()
            return
        }
    }
    switch (config.downloadType) {
        case DownloadType.Aria2:
            aria2Download(config, videoInfo)
            break
        case DownloadType.IwaraDownloader:
            iwaraDownloaderDownload(config,videoInfo)
            break
        case DownloadType.Browser:
            browserDownload(config,videoInfo)
            break
        default:
            othersDownload(config, videoInfo)
            break
    }
}

var mouseTarget: Element | null = null
if (!unsafeWindow.IwaraDownloadTool) {
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

    hijackFetch(config, db)

    async function main() {
        if (GM_getValue('isFirstRun', true)) {
            firstRun()
            return
        }

        if (!await config.check()) {
            newToast(config,ToastType.Info, {
                text: `%#configError#%`,
                duration: 60 * 1000,
            }).showToast()
            editConfig.inject()
            return
        }

        GM_setValue('version', GM_info.script.version)

        if (config.autoInjectCheckbox) hijackNodeAppendChild()

        hijackNodeRemoveChild()

        hijackElementRemove()

        originalAddEventListener('mouseover', (event: Event) => {
            mouseTarget = (event as MouseEvent).target instanceof Element ? (event as MouseEvent).target as Element : null
        })

        hijackHistoryPushState()

        hijackHistoryReplaceState()

        originalAddEventListener('mouseover', (event: Event) => {
            mouseTarget = (event as MouseEvent).target instanceof Element ? (event as MouseEvent).target as Element : null
        })

        originalAddEventListener('keydown', (event: Event) => {
            const keyboardEvent = event as KeyboardEvent;
            if (keyboardEvent.code === 'Space' && !isNullOrUndefined(mouseTarget)) {
                let element = findElement(mouseTarget, '.videoTeaser')
                let button = element && (element.matches('.selectButton') ? element : element.querySelector('.selectButton'))
                button && (button as HTMLInputElement).click()
                button && keyboardEvent.preventDefault()
            }
        })

        new MutationObserver(async (m, o) => {
            if (m.some(m => m.type === 'childList' && unsafeWindow.document.getElementById('app'))) {
                pluginMenu.inject()
                o.disconnect()
            }
        }).observe(unsafeWindow.document.body, { childList: true, subtree: true })



        let notice = newToast(config,
            ToastType.Info,
            {
                node: toastNode(config,i18n[getLanguage(config)].notice),
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
        alert(i18n[getLanguage(config)].configurationIncompatible)
    }
    (unsafeWindow.document.body ? Promise.resolve() : new Promise(resolve => originalAddEventListener.call(unsafeWindow.document, "DOMContentLoaded", resolve))).then(main)
}