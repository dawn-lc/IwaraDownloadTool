import "./env";
import { isNullOrUndefined, isString } from "./env"
import { Dexie } from "./import";
import { VideoInfo } from "./main";

export class Database extends Dexie {
    private static instance: Database;
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
        this.version(4).stores({
            videos: 'ID, UploadTime',
            caches: 'ID'
        }).upgrade((trans) => {
            return trans.table('videos').toCollection().modify(video => {
                if (isNullOrUndefined(video.UploadTime)) {
                    video.UploadTime = new Date(0).getTime();
                } else if (typeof video.UploadTime === 'string') {
                    video.UploadTime = new Date(video.UploadTime).getTime();
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
                if (isNullOrUndefined(video.UploadTime)) {
                    video.UploadTime = new Date(0).getTime();
                } else if (typeof video.UploadTime === 'string') {
                    video.UploadTime = new Date(video.UploadTime).getTime();
                } else if (video.UploadTime instanceof Date) {
                    video.UploadTime = video.UploadTime.getTime();
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
    async getFilteredVideos(startTime: Date | string | undefined, endTime: Date | string | undefined) {
        if (isNullOrUndefined(startTime) || isNullOrUndefined(endTime)) return [];
        startTime = isString(startTime) ? new Date(startTime) : startTime
        endTime = isString(endTime) ? new Date(endTime) : endTime
        return this.videos
            .where('UploadTime')
            .between(startTime.getTime(), endTime.getTime(), true, true)
            .and(video => !isNullOrUndefined(video.RAW))
            .and(video => video.Private !== false || video.Unlisted !== false)
            .toArray()
    }
}
export const db = Database.getInstance();