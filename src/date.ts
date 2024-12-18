import { Moment } from "./import";
import { config } from "./config";
Date.prototype.format = function (format?: string) {
    return Moment(this).locale(config.language).format(format)
}