

interface Date{
    format(format?: string): String;
}
interface String {
    replaceVariable(replacements: Record<string, any>, count?: number): String;
    isEmpty(): boolean;
    notEmpty(): boolean;
    toURL(): URL;
    among(start: string, end: string): String;
    splitLimit(separator: string, limit?: number): string[];
    truncate(maxLength: number): string
    trimHead(prefix: string): string;
    trimTail(suffix: string): string;
}

interface IDictionary<T> {
    [key: string]: any
    set(key: string, value: T): void;
    get(key: string): T | undefined;
    has(key: string): boolean;
    del(key: string): void;
    get size(): number;
    keys(): string[];
    values(): T[];
    toArray(): Array<{ key: string, value: T }>;
}

interface IChannelMessage<T> {
    id: string;
    type: number;
    data: T;
}

interface Array<T> {
    any(): boolean;
    prune(): Array<T>;
    unique(): Array<T>;
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

interface Node {
    originalAppendChild<T extends Node>(node: T): T
    originalInsertBefore<T extends Node>(node: T, child: Node): T
}

interface Position {
    X: number;
    Y: number;
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
        followedBy: boolean,
        following: boolean,
        friend: boolean,
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

type ErrorType = 'not_enabled' | 'not_whitelisted' | 'not_permitted' | 'not_supported' | 'not_succeeded' | 'unknown';