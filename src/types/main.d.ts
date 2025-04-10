declare var unsafeWindow: Window & typeof globalThis;

declare interface I18N {
    [key: string]: RenderCode<any> | string | (RenderCode<any> | string)[]
}
declare interface RenderCode<T extends keyof HTMLElementTagNameMap> {
    nodeType: T;
    attributes?: Record<string, any>;
    events?: Record<string, EventListenerOrEventListenerObject>;
    className?: string | string[];
    childs?: RenderCode<any> | string | undefined | (RenderCode<any> | string | undefined)[];
}
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


declare enum DownloadType {
    Aria2,
    IwaraDownloader,
    Browser,
    Others
}

declare enum PageType {
    Video = 'video',
    Image = 'image',
    VideoList = 'videoList',
    ImageList = 'imageList',
    Forum = 'forum',
    ForumSection = 'forumSection',
    ForumThread = 'forumThread',
    Page = 'page',
    Home = 'home',
    Profile = 'profile',
    Subscriptions = 'subscriptions',
    Playlist = 'playlist',
    Favorites = 'favorites',
    Search = 'search',
    Account = 'account'
}


declare enum ToastType {
    Log,
    Info,
    Warn,
    Error
}

declare enum MessageType {
    Close,
    Request,
    Receive,
    Set,
    Del
}

declare enum VersionState {
    Low,
    Equal,
    High
}