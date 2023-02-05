interface RenderCode {
    nodeType: String;
    childs?: RenderCode | RenderCode[] | HTMLElement | HTMLElement[] | String | String[] | object;
    className?: String | String[];
    attributes?: Object;
    parent?: HTMLElement;
    before?: HTMLElement;
    innerHTML?: String;
}

interface LogCode {
    content?: RenderCode;
    title?: RenderCode;
    wait?:boolean;
    id?:String;
}
interface RenderData {
    type: String;
    children?: Array<any>;
    props?: any;
}
