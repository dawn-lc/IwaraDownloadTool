import { Moment } from "./import";
Date.prototype.format = function (format?: string) {
    return Moment(this).format(format)
}