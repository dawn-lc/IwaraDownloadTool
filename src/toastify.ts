export namespace Toastify {
    type Gravity = "top" | "bottom";
    type Position = "left" | "center" | "right";
    type AriaLive = "off" | "polite" | "assertive";
    type CSSProperties = Record<keyof CSSStyleDeclaration, string>;

    /**
     * Toastify configuration options interface
     * @property {HTMLElement} [root] - Root element
     * @property {string} [text] - Text content to display
     * @property {Node} [node] - Custom DOM node as a text replacement
     * @property {number} [duration=3000] - Auto-close delay (milliseconds)
     * @property {boolean} [close] - Whether to show a close button
     * @property {Gravity} [gravity="top"] - Display position (top/bottom)
     * @property {Position} [position="left"] - Horizontal alignment
     * @property {AriaLive} [ariaLive="polite"] - Screen reader announcement mode
     * @property {string} [className] - Custom CSS class name
     * @property {boolean} [stopOnFocus=true] - Pause auto-close on hover
     * @property {() => void} [onClose] - Callback function after closing
     * @property {(e: MouseEvent) => void} [onClick] - Click event callback
     * @property {CSSProperties} [style] - Inline style configuration
     * @property {boolean} [oldestFirst=true] - Notification order for new messages
     */
    export interface Options {
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

    class Manager {
        private static timeoutMap = new Map<Toast, number>();
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
            container.classList.add('toast-container', id, `toast-${gravity}`, `toast-${position}`);
            container.setAttribute('role', 'region');
            container.setAttribute('aria-label', `Toast notifications - ${gravity} ${position}`);
            document.body.appendChild(container);
            this.containers.set(id, container);
            return container;
        }

        static addTimeout(toast: Toast, duration: number, callback: () => void) {
            this.delTimeout(toast);
            const timeoutId = window.setTimeout(() => {
                callback();
                this.delTimeout(toast);
            }, duration);
            this.timeoutMap.set(toast, timeoutId);
        }

        static delTimeout(toast: Toast) {
            if (this.timeoutMap.has(toast)) {
                clearTimeout(this.timeoutMap.get(toast)!);
                this.timeoutMap.delete(toast);
            }
        }
    }

    class Builder {
        static build(toast: Toast) {
            this.applyBaseStyles(toast);
            this.addContent(toast);
            this.addInteractiveElements(toast);
        }

        private static applyBaseStyles(toast: Toast) {
            toast.element.setAttribute('aria-live', toast.ariaLive);
            toast.element.classList.add(
                'toast',
                `toast-${toast.gravity}`,
                `toast-${toast.position}`
            );
            if (toast.options.className) toast.element.classList.add(toast.options.className);
            if (toast.options.style) this.applyCustomStyles(toast.element, toast.options.style);
        }
        private static applyCustomStyles(element: HTMLElement, styles: CSSProperties) {
            for (const key in styles) {
                element.style[key] = styles[key];
            }
        }

        private static addContent(toast: Toast) {
            if (toast.options.text) toast.element.textContent = toast.options.text;
            if (toast.options.node) toast.element.appendChild(toast.options.node);
        }

        private static addInteractiveElements(toast: Toast) {
            if (toast.close) this.addCloseButton(toast);
            if (toast.onClick) toast.element.addEventListener("click", e => toast.onClick?.(e));
        }

        private static addCloseButton(toast: Toast) {
            const closeBtn = document.createElement("span");
            closeBtn.ariaLabel = "Close";
            closeBtn.className = "toast-close";
            closeBtn.textContent = "🗙";
            closeBtn.addEventListener("click", e => toast.hide());
            toast.element.appendChild(closeBtn);
        }
    }

    /**
     * Toast
     * @example
     * new Toast({ text: "Hello World" }).show();
     */
    export class Toast {
        private readonly defaults: Options = {
            duration: 3000,
            gravity: "top",
            position: 'right',
            ariaLive: "polite",
            close: false,
            stopOnFocus: true,
            oldestFirst: true,
        };

        public options: Options;

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
         * Create a Toastify instance
         * @param options User configuration options
         */
        constructor(options: Options) {
            this.options = {
                ...this.defaults,
                ...options
            };
            this.element = document.createElement("div");
            this.gravity = this.options.gravity!;
            this.position = this.options.position!;
            this.root = this.options.root ?? Manager.getContainer(this.gravity, this.position);
            this.close = this.options.close!;
            this.oldestFirst = this.options.oldestFirst!;
            this.stopOnFocus = this.options.stopOnFocus!;
            this.ariaLive = this.options.ariaLive!;
            if (this.options.onClick) this.onClick = this.options.onClick;
            if (this.options.onClose) this.onClose = this.options.onClose;
            Builder.build(this);
        }

        /**
         * Display the Toast notification
         * @returns this Instance for method chaining
         */
        public show(): this {
            const elementToInsert = this.oldestFirst ? this.root.firstChild : this.root.lastChild;
            this.root.insertBefore(this.element!, elementToInsert);
            if (!this.element.classList.replace('hide', 'show')) {
                this.element.classList.add('show')
            }
            if (this.options.duration && this.options.duration > 0) {
                if (this.options.stopOnFocus) {
                    this.element.addEventListener("mouseover", () => {
                        Manager.delTimeout(this);
                    })
                    this.element.addEventListener("mouseleave",() => {
                        Manager.addTimeout(this, this.options.duration!, () => this.hide());
                    })
                }
                Manager.addTimeout(this, this.options.duration!, () => this.hide());
            }
            return this;
        }
        /**
         * @deprecated This function is deprecated. Use the show() instead.
         */
        public showToast() {
            return this.show();
        }

        /**
         * Immediately hide the current Toast
         * Triggers a CSS exit animation and removes the element after the animation completes
         */
        public hide(): void {
            if (!this.element) return;
            Manager.delTimeout(this);
            const handleAnimationEnd = () => {
                this.element?.removeEventListener('animationend', handleAnimationEnd);
                this.element?.remove();
                this.onClose?.();
            };
            this.element.addEventListener('animationend', handleAnimationEnd);
            if (!this.element.classList.replace('show', 'hide')) {
                this.element.classList.add('hide')
            }
        }
        /**
         * @deprecated This function is deprecated. Use the hide() instead.
         */
        public hideToast(): void {
            this.hide();
        }
    }
}
declare global {
    function Toast(options: Toastify.Options): Toastify.Toast
}
export default function Toast(options: Toastify.Options): Toastify.Toast {
    return new Toastify.Toast(options)
}
globalThis.Toast = Toast;