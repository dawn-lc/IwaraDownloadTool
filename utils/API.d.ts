// @ts-ignore
declare function GM_cookie(any: any,any: any,any: any);

interface Object {
    getObjectString(): string;
}


interface Date{
    format(format?: string): String;
}

interface String {
    replaceVariable(replacements: Record<string, any>, count?: number): String;
    isEmpty(): boolean;
    notEmpty(): boolean;
    toURL(): URL;
    among(start: string, end: string): String;
    truncate(maxLength: number): string
    trimHead(prefix: string): string;
    trimTail(suffix: string): string;
}

interface Array<T> {
    any(): boolean;
    prune(): Array<T>;
    append(arr: Array<T>): void;
}

type RenderCode = string | Node | Element | {
    nodeType: string;
    attributes?: Record<string, any>;
    events?: Record<string, (event: Event) => void>;
    className?: string | string[];
    childs?: RenderCode | RenderCode[];
}

interface LocalPath {
    [key: string]: any;
    fullPath: string;
    drive: string;
    filename: string;
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
    wait?: boolean;
    id?: string;
}


type VideoFileAPIRawDataList = VideoFileAPIRawData[];
interface VideoFileAPIRawData {
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

interface VideoCommentAPIRawData {
    count: number;
    limit: number;
    page: number;
    results: Array<{
        id: string;
        body: string;
        numReplies: number;
        user: {
            id: string;
            name: string;
            username: string;
        };
    }>;
}

interface VideoAPIRawData {
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
    tags: Array<{
        id: string;
        type: string;
    }>;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    fileUrl: string;
}