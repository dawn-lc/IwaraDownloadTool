

declare var unsafeWindow: Window & typeof globalThis;

declare module '../locale/*.json' {
    const content: I18N;
    export default content;
}

export interface RenderCode<T extends keyof HTMLElementTagNameMap> {
    nodeType: T;
    attributes?: Record<string, any>;
    events?: Record<string, EventListenerOrEventListenerObject>;
    className?: string | string[];
    childs?: RenderCode<any> | string | undefined | (RenderCode<any> | string | undefined)[];
}
export interface I18N {
    [key: string]: { [key: string]: RenderCode<any> | string | (RenderCode<any> | string)[] }
}
export namespace Aria2 {
    interface Result {
        id: string,
        jsonrpc: string,
        result: Array<Status>
    }

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


export namespace Iwara {
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
        followedBy: boolean | undefined
        following: boolean | undefined
        friend: boolean | undefined
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
    interface IPage {
        count: number
        limit: number
        page: number
        results: IResult[]
    }

    interface IResult {
        id: string
        createdAt: string
        updatedAt: string
        user: User,
        message?: string | null
    }

    interface Comment extends IResult {
        body: string
        numReplies: number
        videoId: string
    }

    interface TagBlacklist {
        id: string;
        type: string;
        sensitive: boolean;
    }

    interface Notification {
        mention: boolean;
        reply: boolean;
        comment: boolean;
    }
    interface LocalUser {
        balance: number;
        user: User;
        tagBlacklist: TagBlacklist[];
        profile: Profile;
        notifications: Notification;
    }
    interface Profile extends IResult {
        user: User
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