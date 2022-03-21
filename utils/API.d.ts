interface RenderCode { 
    nodeType: string;
    childs?: any;
    className?: string | Array<string>;
    attribute?: object;
    parent?: any;
    before?: any;
    innerHTML?: string;
}
interface RenderData { 
    type: string;
    children?: Array<any>;
    props?: any;
}
