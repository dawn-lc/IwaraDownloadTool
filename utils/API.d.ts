interface RenderCode {
    nodeType: string;
    childs?: RenderCode | RenderCode[] | HTMLElement | HTMLElement[] | string | string[];
    className?: string | Array<string>;
    attribute?: object;
    parent?: HTMLElement;
    before?: HTMLElement;
    innerHTML?: string;
}
interface RenderData { 
    type: string;
    children?: Array<any>;
    props?: any;
}
