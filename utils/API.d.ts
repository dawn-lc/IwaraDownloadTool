type RenderCode = string | Node |{
    nodeType: string;
    attributes?: Record<string, any>;
    events?: Record<string, (event: Event) => void>;
    className?: string | string[];
    childs?: RenderCode | RenderCode[];
}

interface DownloadTask {
    id: string;
    url: string;
    name: string;
    onload: () => void;
    onerror: (error: any) => void;
    onprogress: (progress: { lengthComputable: any, position: number, totalSize: number }) => void;
    ontimeout: () => void;
}

interface QueueItem<T> {
    id: string;
    data: T;
}

interface LogCode {
    content?: RenderCode;
    title?: RenderCode;
    wait?:boolean;
    id?:string;
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
    embedUrl: string;
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
    };
    tags: string[];
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    fileUrl: string;
}