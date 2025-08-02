import "./env";
import { isNullOrUndefined } from "./env"
import { Dexie } from "./import";


export class Database extends Dexie {
    private static instance: Database;
    public follows: Dexie.Table<Iwara.User, string>;
    public friends: Dexie.Table<Iwara.User, string>;
    public videos: Dexie.Table<VideoInfo, string>;
    public caches: Dexie.Table<{ ID: string, href: string }, string>;
    constructor() {
        super("IwaraDownloadTool");
        this.version(2).stores({
            follows: 'id, username, name, friend, following, followedBy',
            friends: 'id, username, name, friend, following, followedBy',
            videos: 'ID, Type, UploadTime, UpdateTime, Private, Unlisted',
            caches: 'ID'
        })
        this.follows = this.table("follows")
        this.friends = this.table("friends")
        this.videos = this.table("videos")
        this.caches = this.table("caches")
    }
    async getFilteredVideos(startTime: number, endTime: number) {
        if (isNullOrUndefined(startTime) || isNullOrUndefined(endTime)) return [];
        return this.videos
            .where('UploadTime')
            .between(startTime, endTime, true, true)
            .and(video => (video.Type === 'partial' || video.Type === 'full') && (video.Private || video.Unlisted))
            .and(video => !isNullOrUndefined(video.RAW))
            .toArray()
    }
    public static getInstance(): Database {
        if (isNullOrUndefined(Database.instance)) Database.instance = new Database()
        return Database.instance;
    }
    public static destroyInstance() {
        Database.instance = undefined as any;
    }
}

/*

export class Database extends Dexie {
    private static instance: Database;
    follows: Dexie.Table<Iwara.User, string>;
    friends: Dexie.Table<Iwara.User, string>;
    videos: Dexie.Table<VideoInfo, string>;
    caches: Dexie.Table<{ ID: string, href: string }, string>;
    aria2Tasks!: Dexie.Table<VideoInfo, Aria2.Result>;
    constructor() {
        super("VideoDatabase");
        this.version(2).stores({
            videos: 'ID',
            caches: 'ID'
        })
        this.version(3).stores({
            videos: 'ID, UploadTime',
            caches: 'ID'
        }).upgrade((trans) => {
            return trans.table('videos').toCollection().modify(video => {
                if (isNullOrUndefined(video.UploadTime)) {
                    video.UploadTime = new Date(0);
                } else if (typeof video.UploadTime === 'string') {
                    video.UploadTime = new Date(video.UploadTime);
                }
                if (isNullOrUndefined(video.RAW)) {
                    video.RAW = undefined;
                }
            })
        })
        this.version(5).stores({
            videos: 'ID, UploadTime',
            caches: 'ID'
        }).upgrade((trans) => {
            return trans.table('videos').toCollection().modify(video => {
                if (isString(video.UploadTime)) {
                    video.UploadTime = new Date(video.UploadTime).getTime();
                } else if (video.UploadTime instanceof Date) {
                    video.UploadTime = video.UploadTime.getTime();
                } else {
                    video.UploadTime = new Date(0).getTime();
                }
                if (isNullOrUndefined(video.RAW)) {
                    video.RAW = undefined;
                }
                console.debug(video.ID, "ok")
            })
        })
        this.version(6).stores({
            videos: 'ID, UploadTime, [Private+UploadTime]',
            caches: 'ID'
        })
        this.version(7).stores({
            follows: 'id, username, name, friend, following',
            friends: 'id, username, name, friend, following',
            videos: 'ID, UploadTime, [Private+UploadTime]',
            caches: 'ID'
        }).upgrade((trans) => {
            return trans.table('videos').toCollection().modify(video => {
                if (isString(video.UploadTime)) {
                    video.UploadTime = new Date(video.UploadTime).getTime();
                } else if (video.UploadTime instanceof Date) {
                    video.UploadTime = video.UploadTime.getTime();
                } else {
                    video.UploadTime = new Date(0).getTime();
                }
                if (isNullOrUndefined(video.RAW)) {
                    video.RAW = undefined;
                }
                console.debug(video.ID, "ok")
            })
        })
        this.videos = this.table("videos")
        this.caches = this.table("caches")
    }
    public static getInstance(): Database {
        if (isNullOrUndefined(Database.instance)) Database.instance = new Database()
        return Database.instance;
    }
    public static destroyInstance() {
        Database.instance = undefined as any;
    }
    async getFilteredVideos(startTime: number, endTime: number) {
        if (isNullOrUndefined(startTime) || isNullOrUndefined(endTime)) return [];
        return this.videos
            .where('UploadTime')
            .between(startTime, endTime, true, true)
            .and(video => !isNullOrUndefined(video.RAW))
            .and(video => video.Private !== false || video.Unlisted !== false)
            .toArray()
    }
}
*/
export const db = Database.getInstance();