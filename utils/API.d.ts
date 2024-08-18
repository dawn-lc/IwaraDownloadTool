
interface Date {
    format(format?: string): String;
}
interface String {
    removeEmojis(): string
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

interface IVersion {
    major: number;
    minor: number;
    patch: number;
    preRelease: string[];
    buildMetadata: string;
    compare(other: IVersion): VersionState;
}


interface IChannelMessage<T> {
    type: MessageType;
    data: T;
}
declare var unsafeWindow: Window & typeof globalThis;
interface Window {
    IwaraDownloadTool: IVersion;
}

interface Array<T> {
    any(): boolean;
    prune(): Array<T>;
    unique(): Array<T>;
    append(arr: Array<T>): void;
    /**
     * @name unique
     * @description 根据元素值或特定属性移除数组中的重复元素。
     * @param {keyof T} [prop] - 可选的属性键，用于唯一性比较。
     * @returns {T[]} 一个新的数组，去除了重复项。
     */
    unique(prop?: keyof T): T[];
    /**
     * @name union
     * @description 计算两个数组的并集，去除重复元素。
     * @param {T[]} that - 与当前数组合并的第二个数组。
     * @param {keyof T} [prop] - 可选的属性键，用于唯一性比较。
     * @returns {T[]} 一个新的数组，代表两个数组的并集。
     */
    union(that: T[], prop?: keyof T): T[];
    /**
     * @name intersect
     * @description 计算两个数组的交集。
     * @param {T[]} that - 与当前数组求交集的第二个数组。
     * @param {keyof T} [prop] - 可选的属性键，用于等价比较。
     * @returns {T[]} 一个新的数组，包含两个数组共有的元素。
     */
    intersect(that: T[], prop?: keyof T): T[];
    /**
     * @name difference
     * @description 计算两个数组的差集（第一个数组中不在第二个数组中的元素）。
     * @param {T[]} that - 其元素将从当前数组中减去的第二个数组。
     * @param {keyof T} [prop] - 可选的属性键，用于等价比较。
     * @returns {T[]} 一个新的数组，包含当前数组中但不在第二个数组中的元素。
     */
    difference(that: T[], prop?: keyof T): T[];
    /**
     * @name complement
     * @description 计算两个数组的补集（不在交集中的元素）。
     * @param {T[]} that - 用于计算补集的第二个数组。
     * @param {keyof T} [prop] - 可选的属性键，用于等价比较。
     * @returns {T[]} 一个新的数组，包含仅在一个数组中出现的元素。
     */
    complement(that: T[], prop?: keyof T): T[];
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


type RenderCode = string | Node | Element | {
    nodeType: string;
    attributes?: Record<string, any>;
    events?: Record<string, (event: Event) => void>;
    className?: string | string[];
    childs?: RenderCode | RenderCode[];
}
interface PieceInfo {
    Title?: string;
    Alias?: string;
    Author?: string;
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

namespace Aria2 {
    interface Uri {
        uri: string;
        status: 'used' | 'waiting';
    }

    interface File {
        index: string;
        path: string;
        length: string;
        completedLength: string;
        selected: 'true' | 'false';
        uris: Uri[];
    }
    interface Status {
        gid: string;
        status: 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed';
        totalLength: string;
        completedLength: string;
        uploadLength: string;
        bitfield: string;
        downloadSpeed: string;
        uploadSpeed: string;
        infoHash: string;
        numSeeders: string;
        seeder: 'true' | 'false';
        pieceLength: string;
        numPieces: string;
        connections: string;
        errorCode: string;
        errorMessage: string;
        followedBy: string[];
        following: string;
        belongTo: string;
        dir: string;
        files: File[];
        bittorrent: any;
        verifiedLength: string;
        verifyIntegrityPending: string;
    }
}


namespace Iwara {
    interface Avatar {
        id: string
        type: string
        path: string
        name: string
        mime: string
        size: number
        width?: number
        height?: number
        duration: null
        numThumbnails: null
        animatedPreview: boolean
        createdAt: string
        updatedAt: string
    }
    interface User {
        id: string
        name: string
        username: string
        status: string
        role: string
        followedBy: boolean
        following: boolean
        friend: boolean
        premium: boolean
        locale: null
        seenAt: string
        avatar?: Avatar
        createdAt: string
        updatedAt: string
    }
    interface File {
        id: string
        type: string
        path: string
        name: string
        mime: string
        size: number
        width: number | null
        height: number | null
        duration: number
        numThumbnails: number
        animatedPreview: boolean
        createdAt: string
        updatedAt: string
    }
    interface Tag {
        id: string
        type: string
    }
    interface Page {
        count: number
        limit: number
        page: number
        results: IResult[]
    }

    interface IResult {
        id: string
        createdAt: string
        updatedAt: string
        user: User
    }

    interface Comment extends IResult {
        body: string
        numReplies: number
        parent: null
        videoId: string
    }
    interface Video extends IResult {
        slug: string
        title: string
        body: string | null
        status: string
        rating: string
        private: boolean
        unlisted: boolean
        thumbnail: number
        embedUrl: string | null
        liked: boolean
        numLikes: number
        numViews: number
        numComments: number
        file: File
        customThumbnail: any
        tags: Tag[]
        fileUrl: string
    }

    interface Source {
        id: string
        name: string
        src: {
            view: string
            download: string
        }
        createdAt: string
        updatedAt: string
        type: string
    }
}



type ErrorType = 'not_enabled' | 'not_whitelisted' | 'not_permitted' | 'not_supported' | 'not_succeeded' | 'unknown';