import "./env";
import { isElement, isNullOrUndefined, isStringTupleArray } from "./env";
import { originalAddEventListener, originalFetch, originalNodeAppendChild, originalPushState, originalRemove, originalRemoveChild, originalReplaceState } from "./hijack";
import { i18n } from "./i18n";
import { DownloadType, isPageType, MessageType, PageType, ToastType, VersionState } from "./type";
import { config, Config } from "./config";
import { Dictionary, SyncDictionary, Version, VideoInfo } from "./class";
import { db } from "./db";
import "./date";
import { delay, findElement, renderNode, unlimitedFetch } from "./extension";
import { analyzeLocalPath, aria2API, aria2Download, aria2TaskCheckAndRestart, aria2TaskExtractVideoID, browserDownload, check, checkIsHaveDownloadLink, getAuth, getPlayload, iwaraDownloaderDownload, newToast, othersDownload, toastNode } from "./function";

class configEdit {
    source!: configEdit;
    target: Config
    interfacePage: HTMLParagraphElement;
    interface: HTMLDivElement;
    constructor(config: Config) {
        this.target = config
        this.target.configChange = (item: string) => { this.configChange.call(this, item) }
        this.interfacePage = renderNode({
            nodeType: 'p'
        })
        let save = renderNode({
            nodeType: 'button',
            childs: '%#save#%',
            attributes: {
                title: i18n[config.language].save
            },
            events: {
                click: async () => {
                    save.disabled = !save.disabled
                    if (await check()) {
                        unsafeWindow.location.reload()
                    }
                    save.disabled = !save.disabled
                }
            }
        })
        let reset = renderNode({
            nodeType: 'button',
            childs: '%#reset#%',
            attributes: {
                title: i18n[config.language].reset
            },
            events: {
                click: () => {
                    GM_setValue('isFirstRun', true)
                    unsafeWindow.location.reload()
                }
            }
        })
        this.interface = renderNode({
            nodeType: 'div',
            attributes: {
                id: 'pluginConfig'
            },
            childs: [
                {
                    nodeType: 'div',
                    className: 'main',
                    childs: [
                        {
                            nodeType: 'h2',
                            childs: '%#appName#%'
                        },
                        {
                            nodeType: 'label',
                            childs: [
                                '%#language#% ',
                                {
                                    nodeType: 'input',
                                    className: 'inputRadioLine',
                                    attributes: {
                                        name: 'language',
                                        type: 'text',
                                        value: this.target.language
                                    },
                                    events: {
                                        change: (event: Event) => {
                                            this.target.language = (event.target as HTMLInputElement).value
                                        }
                                    }
                                }
                            ]
                        },
                        this.downloadTypeSelect(),
                        this.interfacePage,
                        this.switchButton('checkPriority'),
                        this.switchButton('checkDownloadLink'),
                        this.switchButton('autoFollow'),
                        this.switchButton('autoLike'),
                        this.switchButton('autoInjectCheckbox'),
                        this.switchButton('autoCopySaveFileName'),
                        this.switchButton('addUnlistedAndPrivate'),
                        this.switchButton('isDebug', GM_getValue, (name: string, e) => {
                            GM_setValue(name, (e.target as HTMLInputElement).checked)
                            unsafeWindow.location.reload()
                        }, false),
                    ]
                },
                {
                    nodeType: 'p',
                    className: 'buttonList',
                    childs: [
                        reset,
                        save
                    ]
                }
            ]
        })

    }
    private switchButton(name: string, get?: (name: string, defaultValue?: any) => any, set?: (name: string, e: Event) => void, defaultValue?: boolean) {
        return renderNode({
            nodeType: 'p',
            className: 'inputRadioLine',
            childs: [
                {
                    nodeType: 'label',
                    childs: `%#${name}#%`,
                    attributes: {
                        for: name
                    }
                }, {
                    nodeType: 'input',
                    className: 'switch',
                    attributes: {
                        type: 'checkbox',
                        name: name,
                        checked: get !== undefined ? get(name, defaultValue) : this.target[name] ?? defaultValue ?? false
                    },
                    events: {
                        change: (e: Event) => {
                            if (set !== undefined) {
                                set(name, e)
                                return
                            } else {
                                this.target[name] = (e.target as HTMLInputElement).checked
                            }
                        }
                    }
                }
            ]
        })
    }
    private inputComponent(name: string, type?: string, get?: (name: string) => void, set?: (name: string, e: Event) => void) {
        return renderNode({
            nodeType: 'label',
            childs: [
                `%#${name}#% `,
                {
                    nodeType: 'input',
                    attributes: {
                        name: name,
                        type: type ?? 'text',
                        value: get !== undefined ? get(name) : this.target[name]
                    },
                    events: {
                        change: (e: Event) => {
                            if (set !== undefined) {
                                set(name, e)
                                return
                            } else {
                                this.target[name] = (e.target as HTMLInputElement).value
                            }
                        }
                    }
                }
            ]
        })
    }
    private downloadTypeSelect() {
        let select = renderNode({
            nodeType: 'p',
            className: 'inputRadioLine',
            childs: [
                `%#downloadType#%`,
                {
                    nodeType: 'select',
                    childs: Object.keys(DownloadType).filter((i: any) => isNaN(Number(i))).map((i: string) => renderNode({
                        nodeType: 'option',
                        childs: i
                    })),
                    attributes: {
                        name: 'downloadType',
                        selectedIndex: Number(this.target.downloadType)
                    },
                    events: {
                        change: (e) => {
                            this.target.downloadType = (e.target as HTMLSelectElement).selectedIndex
                        }
                    }
                }
            ]
        })
        return select
    }
    private configChange(item: string) {
        switch (item) {
            case 'downloadType':
                (this.interface.querySelector(`[name=${item}]`) as HTMLSelectElement).selectedIndex = Number(this.target.downloadType)
                this.pageChange()
                break
            case 'checkPriority':
                this.pageChange()
                break
            default:
                let element = this.interface.querySelector(`[name=${item}]`) as HTMLInputElement
                if (element) {
                    switch (element.type) {
                        case 'radio':
                            element.value = this.target[item]
                            break
                        case 'checkbox':
                            element.checked = this.target[item]
                            break
                        case 'text':
                        case 'password':
                            element.value = this.target[item]
                            break
                        default:
                            break
                    }
                }
                break
        }
    }
    private pageChange() {
        while (this.interfacePage.hasChildNodes()) {
            this.interfacePage.removeChild(this.interfacePage.firstChild!)
        }
        let variableInfo = renderNode({
            nodeType: 'a',
            childs: '%#variable#%',
            attributes: {
                href: 'https://github.com/dawn-lc/IwaraDownloadTool#路径可用变量'
            }
        })
        let downloadConfigInput = [
            variableInfo,
            this.inputComponent('downloadPath')
        ]
        let proxyConfigInput = [
            this.inputComponent('downloadProxy'),
            this.inputComponent('downloadProxyUsername'),
            this.inputComponent('downloadProxyPassword', 'password')
        ]
        let aria2ConfigInput = [
            this.inputComponent('aria2Path'),
            this.inputComponent('aria2Token', 'password'),
            ...proxyConfigInput
        ]
        let iwaraDownloaderConfigInput = [
            this.inputComponent('iwaraDownloaderPath'),
            this.inputComponent('iwaraDownloaderToken', 'password'),
            ...proxyConfigInput
        ]
        let BrowserConfigInput = [
            variableInfo,
            this.inputComponent('downloadPath')
        ]
        switch (this.target.downloadType) {
            case DownloadType.Aria2:
                downloadConfigInput.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                aria2ConfigInput.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break
            case DownloadType.IwaraDownloader:
                downloadConfigInput.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                iwaraDownloaderConfigInput.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break
            default:
                BrowserConfigInput.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break
        }
        if (this.target.checkPriority) {
            originalNodeAppendChild.call(this.interfacePage, this.inputComponent('downloadPriority'))
        }
    }
    public inject() {
        if (!unsafeWindow.document.querySelector('#pluginConfig')) {
            originalNodeAppendChild.call(unsafeWindow.document.body, this.interface)
            this.configChange('downloadType')
        }
    }
}

class menu {
    [key: string | symbol]: any
    observer!: MutationObserver;
    pageType!: PageType;
    interface!: HTMLDivElement;
    interfacePage!: HTMLUListElement;
    constructor() {
        let body = new Proxy(this, {
            set: (target, prop, value) => {
                if (prop === 'pageType') {
                    if (isNullOrUndefined(value) || this.pageType === value) return true
                    target[prop] = value
                    this.pageChange()
                    GM_getValue('isDebug') && console.debug(`Page change to ${this.pageType}`)
                    return true 
                }
                return target[prop] = value;
            }
        })
        body.interfacePage = renderNode({
            nodeType: 'ul'
        })
        body.interface = renderNode({
            nodeType: 'div',
            attributes: {
                id: 'pluginMenu'
            },
            childs: body.interfacePage
        })
        body.observer = new MutationObserver((mutationsList) => body.pageType = getPageType(mutationsList) ?? body.pageType)
        body.pageType = PageType.Page
        return body
    }
    private button(name: string, click?: (name: string, e: Event) => void) {
        return renderNode({
            nodeType: 'li',
            childs: `%#${name}#%`,
            events: {
                click: (event: Event) => {
                    !isNullOrUndefined(click) && click(name, event)
                    event.stopPropagation()
                    return false
                }
            }
        })
    }

    public async pageChange() {
        while (this.interfacePage.hasChildNodes()) {
            this.interfacePage.removeChild(this.interfacePage.firstChild!)
        }
        let manualDownloadButton = this.button('manualDownload', (name, event) => {
            addDownloadTask()
        })
        let settingsButton = this.button('settings', (name, event) => {
            editConfig.inject()
        })
        let baseButtons = [manualDownloadButton, settingsButton]

        let injectCheckboxButton = this.button('injectCheckbox', (name, event) => {
            if (unsafeWindow.document.querySelector('.selectButton')) {
                unsafeWindow.document.querySelectorAll('.selectButton').forEach((element) => {
                    element.remove()
                })
            } else {
                unsafeWindow.document.querySelectorAll(`.videoTeaser`).forEach((element: Element) => {
                    injectCheckbox(element)
                })
            }
        })

        let deselectAllButton = this.button('deselectAll', (name, event) => {
            for (const id of selectList.keys()) {
                let button = getSelectButton(id)
                if (button && button.checked) button.checked = false
                selectList.delete(id)
            }
        })
        let reverseSelectButton = this.button('reverseSelect', (name, event) => {
            unsafeWindow.document.querySelectorAll('.selectButton').forEach((element) => {
                (element as HTMLInputElement).click()
            })
        })
        let selectThisButton = this.button('selectThis', (name, event) => {
            unsafeWindow.document.querySelectorAll('.selectButton').forEach((element) => {
                let button = element as HTMLInputElement
                !button.checked && button.click()
            })
        })
        let deselectThisButton = this.button('deselectThis', (name, event) => {
            unsafeWindow.document.querySelectorAll('.selectButton').forEach((element) => {
                let button = element as HTMLInputElement
                button.checked && button.click()
            })
        })
        let downloadSelectedButton = this.button('downloadSelected', (name, event) => {
            analyzeDownloadTask()
            newToast(ToastType.Info, {
                text: `%#${name}#%`,
                close: true
            }).showToast()
        })
        let selectButtons = [injectCheckboxButton, deselectAllButton, reverseSelectButton, selectThisButton, deselectThisButton, downloadSelectedButton]

        let downloadThisButton = this.button('downloadThis', async (name, event) => {
            let ID = unsafeWindow.location.href.toURL().pathname.split('/')[2]
            let Title = unsafeWindow.document.querySelector('.page-video__details')?.childNodes[0]?.textContent
            let videoInfo = await (new VideoInfo({ Title: Title, })).init(ID)
            videoInfo.State && await pushDownloadTask(videoInfo, true)
        })

        let aria2TaskCheckButton = this.button('aria2TaskCheck', (name, event) => {
            aria2TaskCheckAndRestart()
        })
        GM_getValue('isDebug') && originalNodeAppendChild.call(this.interfacePage, aria2TaskCheckButton)

        switch (this.pageType) {
            case PageType.Video:
                originalNodeAppendChild.call(this.interfacePage, downloadThisButton)
                selectButtons.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                baseButtons.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break
            case PageType.Search:
            case PageType.Profile:
            case PageType.Home:
            case PageType.VideoList:
            case PageType.Subscriptions:
            case PageType.Playlist:
            case PageType.Favorites:
            case PageType.Account:
                selectButtons.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                baseButtons.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break;
            case PageType.Page:
            case PageType.Forum:
            case PageType.Image:
            case PageType.ImageList:
            case PageType.ForumSection:
            case PageType.ForumThread:
            default:
                baseButtons.map(i => originalNodeAppendChild.call(this.interfacePage, i))
                break;
        }

        const getRating = () => unsafeWindow.document.querySelector('input.radioField--checked[name=rating]')?.getAttribute('value') ?? 'all'
        if (config.addUnlistedAndPrivate && this.pageType === PageType.VideoList) {
            for (let page = 0; page < 10; page++) {
                const response = await unlimitedFetch(`https://api.iwara.tv/videos?subscribed=true&limit=50&rating=${getRating}&page=${page}`, {
                    method: 'GET',
                    headers: await getAuth()
                });
                const data = (await response.json() as Iwara.Page).results as Iwara.Video[];
                data.forEach(info => new VideoInfo().init(info.id, info));
                await delay(3000)
            }
        }
    }
    public inject() {
        this.observer.observe(unsafeWindow.document.getElementById('app')!, { childList: true, subtree: true });
        if (!unsafeWindow.document.querySelector('#pluginMenu')) {
            originalNodeAppendChild.call(unsafeWindow.document.body, this.interface)
            this.pageType = getPageType() ?? this.pageType
        }
    }
}

var pluginMenu = new menu()
var editConfig = new configEdit(config)

export var pageSelectButtons = new Dictionary<HTMLInputElement>()
export function getSelectButton(id: string): HTMLInputElement | undefined {
    return pageSelectButtons.has(id) ? pageSelectButtons.get(id) : unsafeWindow.document.querySelector(`input.selectButton[videoid="${id}"]`) as HTMLInputElement
}

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

export async function pushDownloadTask(videoInfo: VideoInfo, bypass: boolean = false) {
    if (!videoInfo.State) {
        return
    }
    if (!bypass) {
        if (config.autoFollow && !videoInfo.Following) {
            if ((await unlimitedFetch(`https://api.iwara.tv/user/${videoInfo.AuthorID}/followers`, {
                method: 'POST',
                headers: await getAuth()
            })).status !== 201) newToast(ToastType.Warn, { text: `${videoInfo.Alias} %#autoFollowFailed#%`, close: true }).showToast()
        }
        if (config.autoLike && !videoInfo.Liked) {
            if ((await unlimitedFetch(`https://api.iwara.tv/video/${videoInfo.ID}/like`, {
                method: 'POST',
                headers: await getAuth()
            })).status !== 201) newToast(ToastType.Warn, { text: `${videoInfo.Title} %#autoLikeFailed#%`, close: true }).showToast()
        }
        if (config.checkDownloadLink && checkIsHaveDownloadLink(`${videoInfo.Description} ${videoInfo.Comments}`)) {
            let toastBody = toastNode([
                `${videoInfo.Title}[${videoInfo.ID}] %#findedDownloadLink#%`,
                { nodeType: 'br' },
                `%#openVideoLink#%`
            ], '%#createTask#%')
            let toast = newToast(
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
                            }))
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
            let toast = newToast(
                ToastType.Warn,
                {
                    node: toastNode([
                        `${videoInfo.Title}[${videoInfo.ID}] %#downloadQualityError#%`,
                        { nodeType: 'br' },
                        `%#tryReparseDownload#%`
                    ], '%#createTask#%'),
                    async onClick() {
                        toast.hideToast()
                        await pushDownloadTask(await new VideoInfo(videoInfo as PieceInfo).init(videoInfo.ID))
                    }
                }
            )
            toast.showToast()
            return
        }
    }
    switch (config.downloadType) {
        case DownloadType.Aria2:
            aria2Download(videoInfo)
            break
        case DownloadType.IwaraDownloader:
            iwaraDownloaderDownload(videoInfo)
            break
        case DownloadType.Browser:
            browserDownload(videoInfo)
            break
        default:
            othersDownload(videoInfo)
            break
    }
}

function firstRun() {
    console.log('First run config reset!')
    GM_listValues().forEach(i => GM_deleteValue(i))
    Config.destroyInstance()
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
    })
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
function uninjectCheckbox(element: Element | Node) {
    if (element instanceof HTMLElement) {
        if (element instanceof HTMLInputElement && element.classList.contains('selectButton')) {
            element.hasAttribute('videoID') && pageSelectButtons.delete(element.getAttribute('videoID')!)
        }
        if (element.querySelector('input.selectButton')) {
            element.querySelectorAll('.selectButton').forEach(i => i.hasAttribute('videoID') && pageSelectButtons.delete(i.getAttribute('videoID')!))
        }
    }
}
async function injectCheckbox(element: Element) {
    let ID = (element.querySelector('a.videoTeaser__thumbnail') as HTMLLinkElement).href.toURL().pathname.split('/')[2]
    let videoInfo = await db.videos.where('ID').equals(ID).first()
    let Name = element.querySelector('.videoTeaser__title')?.getAttribute('title')!.trim() ?? videoInfo?.Title
    let Alias = element.querySelector('a.username')?.getAttribute('title') ?? videoInfo?.Alias
    let Author = (element.querySelector('a.username') as HTMLLinkElement)?.href.toURL().pathname.split('/').pop() ?? videoInfo?.Author
    if (isNullOrUndefined(ID)) return
    let button = renderNode({
        nodeType: 'input',
        attributes: {
            type: 'checkbox',
            videoID: ID,
            checked: selectList.has(ID) ? true : undefined,
            videoName: Name,
            videoAlias: Alias,
            videoAuthor: Author
        },
        className: 'selectButton',
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
    })
    pageSelectButtons.set(ID, button)
    originalNodeAppendChild.call(element.querySelector('.videoTeaser__thumbnail'), button)
}

function getPageType(mutationsList?: MutationRecord[]): PageType | undefined {
    if (unsafeWindow.location.pathname.toLowerCase().endsWith('/search')) {
        return PageType.Search;
    }

    const extractPageType = (page: Element | null | undefined): PageType | undefined => {
        if (isNullOrUndefined(page)) return undefined;
        if (page.classList.length < 2) return PageType.Page;
        const pageClass = page.classList[1]?.split('-').pop();
        return !isNullOrUndefined(pageClass) && isPageType(pageClass) ? (pageClass as PageType) : PageType.Page;
    };

    if (isNullOrUndefined(mutationsList)) {
        return extractPageType(unsafeWindow.document.querySelector('.page'));
    }

    for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            return extractPageType(Array.from(mutation.addedNodes).find((node):node is Element => node instanceof Element && node.classList.contains('page')))
        }
    }
}


function pageChange() {
    pluginMenu.pageType = getPageType() ?? pluginMenu.pageType
    GM_getValue('isDebug') && console.debug(pageSelectButtons)
}

async function addDownloadTask() {
    let textArea = renderNode({
        nodeType: "textarea",
        attributes: {
            placeholder: i18n[config.language].manualDownloadTips,
            style: 'margin-bottom: 10px;',
            rows: "16",
            cols: "96"
        }
    })
    let body = renderNode({
        nodeType: "div",
        attributes: {
            id: "pluginOverlay"
        },
        childs: [
            textArea,
            {
                nodeType: "button",
                events: {
                    click: (e: Event) => {
                        if (!isNullOrUndefined(textArea.value) && !textArea.value.isEmpty()) {
                            try {
                                let list = JSON.parse(textArea.value) as Array<[key: string, value: PieceInfo]>
                                analyzeDownloadTask(new Dictionary<PieceInfo>(list))
                            } catch (error) {
                                let IDList = new Dictionary<PieceInfo>()
                                textArea.value.split('|').map(ID => IDList.set(ID, {}))
                                analyzeDownloadTask(IDList)
                            }
                        }
                        body.remove()
                    }
                },
                childs: "确认"
            }
        ]
    })
    unsafeWindow.document.body.appendChild(body)
}

class TaskController {
    private lastTaskStartTime: number = 0;
    private counter: number = 0;
    private waiting: Array<() => Promise<void>> = [];
    private isProcessing: boolean = false;

    constructor(private maxConcurrent: number, private minInterval: number) { }

    addTask(task: () => Promise<void>) {
        this.waiting.push(task);
        GM_getValue('isDebug') && console.debug(`TaskController: Task added to queue. Queue length: ${this.waiting.length}`);
        this.processQueue();
    }

    private async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.waiting.length > 0) {
            if (this.counter >= this.maxConcurrent) {
                GM_getValue('isDebug') && console.debug(`TaskController: Max concurrent tasks (${this.maxConcurrent}) reached. Pausing queue processing.`);
                this.isProcessing = false;
                return;
            }

            const now = Date.now();
            const timeSinceLastTask = now - this.lastTaskStartTime;
            if (timeSinceLastTask < this.minInterval) {
                GM_getValue('isDebug') && console.debug(`TaskController: Waiting ${this.minInterval - timeSinceLastTask}ms to maintain minimum interval`);
                await delay(this.minInterval - timeSinceLastTask);
            }

            const task = this.waiting.shift();
            if (task) {
                this.counter++;
                this.lastTaskStartTime = Date.now();
                GM_getValue('isDebug') && console.debug(`TaskController: Starting task. Active tasks: ${this.counter}, Remaining in queue: ${this.waiting.length}`);

                task().finally(() => {
                    this.counter--;
                    GM_getValue('isDebug') && console.debug(`TaskController: Task completed. Active tasks: ${this.counter}, Remaining in queue: ${this.waiting.length}`);
                    this.processQueue();
                });
            }
        }
        this.isProcessing = false;
    }
}

async function analyzeDownloadTask(list: IDictionary<PieceInfo> = selectList) {
    let size = list.size
    let node = renderNode({
        nodeType: 'p',
        childs: `%#parsingProgress#%[${list.size}/${size}]`
    })
    let start = newToast(ToastType.Info, {
        node: node,
        duration: -1
    })
    start.showToast()
    if (GM_getValue('isDebug') && config.downloadType === DownloadType.Aria2) {
        let stoped: Array<{ id: string, data: Aria2.Status }> = (
            await aria2API(
                'aria2.tellStopped',
                [
                    0,
                    2048,
                    [
                        'gid',
                        'status',
                        'files',
                        'errorCode',
                        'bittorrent'
                    ]
                ]
            ))
            .result
            .filter(
                (task: Aria2.Status) =>
                    isNullOrUndefined(task.bittorrent)
            )
            .map(
                (task: Aria2.Status) => {
                    let ID = aria2TaskExtractVideoID(task)
                    if (!isNullOrUndefined(ID) && !ID.isEmpty()) {
                        return {
                            id: ID,
                            data: task
                        }
                    }
                }
            )
            .prune();

        let active: Array<{ id: string, data: Aria2.Status }> = (
            await aria2API(
                'aria2.tellActive',
                [
                    [
                        'gid',
                        'status',
                        'files',
                        'downloadSpeed',
                        'bittorrent'
                    ]
                ]
            ))
            .result
            .filter(
                (task: Aria2.Status) =>
                    isNullOrUndefined(task.bittorrent)
            )
            .map(
                (task: Aria2.Status) => {
                    let ID = aria2TaskExtractVideoID(task)
                    if (!isNullOrUndefined(ID) && !ID.isEmpty()) {
                        return {
                            id: ID,
                            data: task
                        }
                    }
                }
            )
            .prune();

        let downloadCompleted: Array<{ id: string, data: Aria2.Status }> = stoped
            .filter(
                (task: { id: string, data: Aria2.Status }) => task.data.status === 'complete' || task.data.errorCode === '13'
            )
            .unique('id');
        
        let startedAndCompleted = [...active, ...downloadCompleted];

        for (let key of list.allKeys().intersect(startedAndCompleted.map(i => i.id))) {
            let button = getSelectButton(key)
            if (!isNullOrUndefined(button)) button.checked = false
            list.delete(key)
            node.firstChild!.textContent = `${i18n[config.language].parsingProgress}[${list.size}/${size}]`
        }
    }
    let infoList = (await Promise.all(list.allKeys().map(async id => {
        let caches = db.videos.where('ID').equals(id)
        let cache = await caches.first()
        if ((await caches.count()) < 1 || isNullOrUndefined(cache)) {
            let parseToast = newToast(
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

    const taskController = new TaskController(5, 5000);
    for (let videoInfo of infoList) {
        let button = getSelectButton(videoInfo.ID)
        taskController.addTask(async () => {
            let video = await new VideoInfo(list.get(videoInfo.ID)).init(videoInfo.ID);
            video.State && await pushDownloadTask(video)
            if (!isNullOrUndefined(button)) button.checked = false
            list.delete(videoInfo.ID)
            node.firstChild!.textContent = `${i18n[config.language].parsingProgress}[${list.size}/${size}]`
        })
    }
    while (list.size > 0) {
        await delay(1000);
    }

    start.hideToast()
    if (size != 1) {
        let completed = newToast(
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

function hijackAddEventListener() {
    unsafeWindow.EventTarget.prototype.addEventListener = function (type, listener, options) {
        originalAddEventListener.call(this, type, listener, options)
    }
}

function hijackNodeAppendChild() {
    Node.prototype.appendChild = function <T extends Node>(node: T): T {
        if (node instanceof HTMLElement && node.classList.contains('videoTeaser')) {
            injectCheckbox(node)
        }
        return originalNodeAppendChild.call(this, node) as T
    }
}
function hijackNodeRemoveChild() {
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
        uninjectCheckbox(child)
        return originalRemoveChild.apply(this, [child]) as T
    }

}
function hijackElementRemove() {
    Element.prototype.remove = function () {
        uninjectCheckbox(this)
        return originalRemove.apply(this)
    }
}
function hijackHistoryPushState() {
    unsafeWindow.history.pushState = function (...args) {
        originalPushState.apply(this, args)
        pageChange()
    }
}

function hijackHistoryReplaceState() {
    unsafeWindow.history.replaceState = function (...args) {
        originalReplaceState.apply(this, args)
        pageChange()
    }
}

var mouseTarget: Element | null = null
if (!unsafeWindow.IwaraDownloadTool) {
    unsafeWindow.IwaraDownloadTool = true;

    GM_addStyle(GM_getResourceText('toastify-css'));
    GM_addStyle('@!mainCSS!@');

    if (GM_getValue('isDebug')) {
        console.debug(GM_info.stringify())
        // @ts-ignore
        unsafeWindow.unlimitedFetch = unlimitedFetch
        debugger
    }

    if (new Version(GM_getValue('version', '0.0.0')).compare(new Version('3.2.76')) === VersionState.Low) {
        GM_deleteValue('selectList')
    }

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
                        if (url.searchParams.has('user')) break
                        if (url.searchParams.has('subscribed')) break
                        if (url.searchParams.has('sort') ? url.searchParams.get('sort') !== 'date' : false) break
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

    async function main() {
        if (GM_getValue('isFirstRun', true)) {
            firstRun()
            return
        }

        if (!await check()) {
            newToast(ToastType.Info, {
                text: `%#configError#%`,
                duration: 60 * 1000,
            }).showToast()
            editConfig.inject()
            return
        }

        GM_setValue('version', GM_info.script.version)

        hijackAddEventListener()

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

        originalNodeAppendChild.call(unsafeWindow.document.body, renderNode({
            nodeType:'p',
            className: 'fixed-bottom-right',
            childs: [
                `%#appName#% ${GM_getValue('version')} `,
                GM_getValue('isDebug') ? `%#isDebug#%` : ''
            ].prune()
        }))

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
}