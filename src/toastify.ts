
type Gravity = "top" | "bottom";
type Position = "left" | "center" | "right";
type AriaLive = "off" | "polite" | "assertive";
type CSSProperties = Partial<Record<keyof CSSStyleDeclaration, string>>;

/**
 * Toastify 配置选项接口
 * @property {HTMLElement} [root] - 根节点
 * @property {string} [text] - 显示的文本内容
 * @property {Node} [node] - 自定义 DOM 节点替代文本
 * @property {number} [duration=3000] - 自动关闭延时（毫秒）
 * @property {boolean} [close] - 是否显示关闭按钮
 * @property {Gravity} [gravity="top"] - 显示位置（顶部/底部）
 * @property {Position} [position="left"] - 水平对齐方式
 * @property {AriaLive} [ariaLive="polite"] - 屏幕阅读器播报模式
 * @property {string} [className] - 自定义 CSS 类名
 * @property {boolean} [stopOnFocus=true] - 鼠标悬停时暂停自动关闭
 * @property {() => void} [onClose] - 关闭后的回调函数
 * @property {(e: MouseEvent) => void} [onClick] - 点击事件回调
 * @property {CSSProperties} [style] - 行内样式配置
 * @property {boolean} [oldestFirst=true] - 新通知的排列顺序
 */
export interface ToastifyOptions {
    root?: Element;
    text?: string;
    node?: Node;
    duration?: number;
    close?: boolean;
    gravity?: Gravity;
    position?: Position;
    ariaLive?: AriaLive;
    className?: string;
    stopOnFocus?: boolean;
    onClose?: () => void;
    onClick?: (e: Event) => void;
    style?: CSSProperties;
    oldestFirst?: boolean;
}

class ToastManager {
    private static timeoutMap = new Map<HTMLElement, number>();
    private static containers = new Map<string, HTMLElement>();

    static getContainer(gravity: Gravity, position: Position): HTMLElement {
        const containerId = `toast-container-${gravity}-${position}`;
        if (this.containers.has(containerId)) {
            return this.containers.get(containerId)!;
        }
        return this.createContainer(containerId, gravity, position);
    }

    private static createContainer(id: string, gravity: Gravity, position: Position): HTMLElement {
        const container = document.createElement("div");
        container.classList.add('toast-container', id, `toastify-${gravity}`, `toastify-${position}`);
        container.setAttribute('role', 'region');
        container.setAttribute('aria-label', `Toast notifications - ${gravity} ${position}`);
        document.body.appendChild(container);
        this.containers.set(id, container);
        return container;
    }

    static setAutoDismiss(element: HTMLElement, duration: number, callback: () => void) {
        this.clearTimeout(element);
        const timeoutId = window.setTimeout(() => {
            callback();
            this.clearTimeout(element);
        }, duration);
        this.timeoutMap.set(element, timeoutId);
    }

    static clearTimeout(element: HTMLElement) {
        if (this.timeoutMap.has(element)) {
            clearTimeout(this.timeoutMap.get(element)!);
            this.timeoutMap.delete(element);
        }
    }
}

class ToastBuilder {
    static build(toast: Toastify) {
        this.applyBaseStyles(toast);
        this.addContent(toast);
        this.addInteractiveElements(toast);
    }

    private static applyBaseStyles(toast: Toastify) {
        toast.element.setAttribute('aria-live', toast.ariaLive);
        toast.element.classList.add(
            'toastify',
            `toastify-${toast.gravity}`,
            `toastify-${toast.position}`
        );
        if (toast.onClick) toast.element.classList.add('onclick');
        if (toast.options.className) toast.element.classList.add(toast.options.className);
        if (toast.options.style) this.applyCustomStyles(toast.element, toast.options.style);
    }    
    private static applyCustomStyles(element: HTMLElement, styles: CSSProperties) {
        Object.entries(styles).forEach(([prop, value]) => {
            (element.style as any)[prop] = value;
        });
    }

    private static addContent(toast: Toastify) {
        if (toast.options.text) toast.element.textContent = toast.options.text;
        if (toast.options.node) toast.element.appendChild(toast.options.node);
    }

    private static addInteractiveElements(toast: Toastify) {
        if (toast.close) this.addCloseButton(toast);
        if (toast.onClick) toast.element.addEventListener("click", e => toast.onClick?.(e));
    }

    private static addCloseButton(toast: Toastify) {
        const closeBtn = document.createElement("span");
        closeBtn.ariaLabel = "Close";
        closeBtn.className = "toast-close";
        closeBtn.textContent = "x";
        closeBtn.addEventListener("click", e => toast.hideToast());
        toast.element.appendChild(closeBtn);
    }
}

/**
 * Toastify 通知组件核心类
 * 
 * 提供 Toast 通知的显示、隐藏和布局管理功能，支持丰富的配置选项。
 * 
 * @example
 * new Toastify({ text: "Hello World" }).showToast();
 */
export class Toastify {
    private readonly defaults: ToastifyOptions = {
        duration: 3000,
        gravity: "top",
        position: 'right',
        ariaLive: "polite",
        close: false,
        stopOnFocus: true,
        oldestFirst: true,
    };
    public options: ToastifyOptions;

    public element: HTMLElement;
    public root: Element;
    public gravity: Gravity;
    public position: Position;
    public ariaLive: AriaLive;
    public close: boolean;
    public oldestFirst: boolean;
    public stopOnFocus: boolean;
    public onClick?: (e: Event) => void;
    public onClose?: () => void;

    /**
     * 创建 Toastify 实例
     * @param options 用户配置选项，将与默认配置深度合并
     */
    constructor(options: ToastifyOptions) {
        this.options = { 
            ...this.defaults,
            ...options
        };
        this.element = document.createElement("div"); 
        this.gravity = this.options.gravity!;
        this.position = this.options.position!;
        this.root = this.options.root ?? ToastManager.getContainer(this.gravity, this.position);
        this.close = this.options.close!;
        this.oldestFirst = this.options.oldestFirst!;
        this.stopOnFocus = this.options.stopOnFocus!;
        this.ariaLive = this.options.ariaLive!;
        if (this.options.onClick) this.onClick = this.options.onClick;
        if (this.options.onClose) this.onClose = this.options.onClose;
        ToastBuilder.build(this);
    }
    
    /**
     * 显示 Toast 通知
     * @returns this 实例用于链式调用
     */
    public showToast(): this {
        const elementToInsert = this.oldestFirst ? this.root.firstChild : this.root.lastChild;
        this.root.insertBefore(this.element!, elementToInsert);
        if (!this.element.classList.replace('hide','show')) {
            this.element.classList.add('show')
        }
        if (this.options.duration && this.options.duration > 0) {
            ToastManager.setAutoDismiss(this.element, this.options.duration!, () => this.hideToast());
        }
        return this;
    }
    /**
     * 立即隐藏当前 Toast
     * 会触发 CSS 离场动画并在动画完成后移除元素
     */
    public hideToast(): void {
        ToastManager.clearTimeout(this.element);
        const handleAnimationEnd = () => {
            this.element.removeEventListener('animationend', handleAnimationEnd);
            this.element.remove();
            this.onClose?.();
        };
        this.element.addEventListener('animationend', handleAnimationEnd);
        if (!this.element.classList.replace('show','hide')) {
            this.element.classList.add('hide')
        }
    }
}