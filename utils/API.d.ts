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

type VideoFileAPIRawDataList = VideoFileAPIRawData[];
interface VideoFileAPIRawData{
    id: string;
    name: string;
    src: {
        view: string;
        download: string;
    };
    createdAt: string;
    updatedAt: string;
    type: string;
}

interface VideoInfoAPIRawData {
    id: string;
    title: string;
    body: string;
    status: string;
    rating: string;
    private: boolean;
    unlisted: boolean;
    numComments: number;
    file: {
        id: string;
        type: string;
        path: string;
        name: string;
        mime: string;
        size: number;
        createdAt: string;
        updatedAt: string;
    };
    user: {
        id: string;
        name: string;
        username: string;
        status: string;
        role: string;
    };
    tags: string[];
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    fileUrl: string;
}