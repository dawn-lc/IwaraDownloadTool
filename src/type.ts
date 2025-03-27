export type InputType =
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


export enum DownloadType {
    Aria2,
    IwaraDownloader,
    Browser,
    Others
}

export enum PageType {
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
export const isPageType = (type: string): type is PageType => new Set(Object.values(PageType)).has(type as PageType)

export enum ToastType {
    Log,
    Info,
    Warn,
    Error
}

export enum MessageType {
    Close,
    Request,
    Receive,
    Set,
    Del
}

export enum VersionState {
    Low,
    Equal,
    High
}
