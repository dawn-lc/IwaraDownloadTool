/**
 * 用户脚本环境
 */
declare var unsafeWindow: Window & typeof globalThis;
/**
 * 国际化字符串接口
 * 键值对结构，值可以是:
 * - 渲染代码对象
 * - 字符串
 * - 上述类型的数组
 */
declare interface I18N {
    [key: string]: RenderCode<any> | string | (RenderCode<any> | string)[]
}
/**
 * 渲染代码接口，用于描述DOM元素结构
 * @template T HTML元素标签名
 */
declare interface RenderCode<T extends keyof HTMLElementTagNameMap> {
    nodeType: T;
    attributes?: Record<string, any>;
    events?: Record<string, EventListenerOrEventListenerObject>;
    className?: string | string[];
    childs?: RenderCode<any> | string | undefined | (RenderCode<any> | string | undefined)[];
}
/**
 * HTML input元素的type属性所有可能值
 */
declare type InputType =
    | "button"
    | "checkbox"
    | "color"
    | "date"
    | "datetime-local"
    | "email"
    | "file"
    | "hidden"
    | "image"
    | "month"
    | "number"
    | "password"
    | "radio"
    | "range"
    | "reset"
    | "search"
    | "submit"
    | "tel"
    | "text"
    | "time"
    | "url"
    | "week";
/**
 * 递归修剪类型，移除所有null/undefined属性
 * @template T 原始类型
 */
declare type Pruned<T> = T extends null | undefined
    ? never
    : T extends Array<infer U>
    ? Array<Pruned<U>>
    : T extends object
    ? { [K in keyof T as Pruned<T[K]> extends never ? never : K]: Pruned<T[K]> }
    : T;
declare type ThrottleOptions = {
    /** 
     * 是否在节流开始时立即执行
     * @default true
     */
    leading?: boolean
    /** 
     * 是否在节流结束后追加执行
     * @default true 
     */
    trailing?: boolean
}
declare type DebounceOptions = {
    /** 
     * 是否立即执行首次调用
     * @default false 
     */
    immediate?: boolean
}
