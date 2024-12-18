const emojiSeq = String.raw`(?:\p{Emoji}\uFE0F\u20E3?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation})`
const emojiSTags = String.raw`\u{E0061}-\u{E007A}`
export const emojiRegex = new RegExp(String.raw`[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[${emojiSTags}]{2}[\u{E0030}-\u{E0039}${emojiSTags}]{1,3}\u{E007F}|${emojiSeq}(?:\u200D${emojiSeq})*`, 'gu')
export const isNull = (obj: unknown): obj is null => obj === null;
export const isUndefined = (obj: unknown): obj is undefined => typeof obj === 'undefined';
export const isNullOrUndefined = (obj: unknown): obj is null | undefined => isUndefined(obj) || isNull(obj);
export const isObject = (obj: unknown): obj is Object => !isNullOrUndefined(obj) && typeof obj === 'object' && !Array.isArray(obj)
export const isString = (obj: unknown): obj is string => !isNullOrUndefined(obj) && typeof obj === 'string';
export const isNumber = (obj: unknown): obj is number => !isNullOrUndefined(obj) && typeof obj === 'number';
export const isArray = (obj: unknown): obj is any[] => Array.isArray(obj)
export const isElement = (obj: unknown): obj is Element => !isNullOrUndefined(obj) && obj instanceof Element
export const isNode = (obj: unknown): obj is Node => !isNullOrUndefined(obj) && obj instanceof Node
export const isStringTupleArray = (obj: unknown): obj is [string, string][] => Array.isArray(obj) && obj.every(item => Array.isArray(item) && item.length === 2 && typeof item[0] === 'string' && typeof item[1] === 'string')
Array.prototype.any = function () {
    return this.prune().length > 0
}
Array.prototype.prune = function () {
    return this.filter(i => i !== null && typeof i !== 'undefined')
}
Array.prototype.unique = function <T>(this: T[], prop?: keyof T): T[] {
    return this.filter((item, index, self) =>
        index === self.findIndex((t) => (
            prop ? t[prop] === item[prop] : t === item
        ))
    )
}
Array.prototype.union = function <T>(this: T[], that: T[], prop?: keyof T): T[] {
    return [...this, ...that].unique(prop)
}
Array.prototype.intersect = function <T>(this: T[], that: T[], prop?: keyof T): T[] {
    return this.filter((item) =>
        that.some((t) => prop ? t[prop] === item[prop] : t === item)
    ).unique(prop)
}
Array.prototype.difference = function <T>(this: T[], that: T[], prop?: keyof T): T[] {
    return this.filter((item) =>
        !that.some((t) => prop ? t[prop] === item[prop] : t === item)
    ).unique(prop)
}
Array.prototype.complement = function <T>(this: T[], that: T[], prop?: keyof T): T[] {
    return this.union(that, prop).difference(this.intersect(that, prop), prop)
}
String.prototype.among = function (start: string, end: string, greedy: boolean = false) {
    if (this.isEmpty() || start.isEmpty() || end.isEmpty()) return ''
    const startIndex = this.indexOf(start)
    if (startIndex === -1) return ''
    const adjustedStartIndex = startIndex + start.length
    const endIndex = greedy ? this.lastIndexOf(end) : this.indexOf(end, adjustedStartIndex)
    if (endIndex === -1 || endIndex < adjustedStartIndex) return ''
    return this.slice(adjustedStartIndex, endIndex)
}

String.prototype.truncate = function (maxLength) {
    return this.length > maxLength ? this.substring(0, maxLength) : this.toString()
}
String.prototype.trimHead = function (prefix: string) {
    return this.startsWith(prefix) ? this.slice(prefix.length) : this.toString()
}
String.prototype.trimTail = function (suffix: string) {
    return this.endsWith(suffix) ? this.slice(0, -suffix.length) : this.toString()
}
String.prototype.replaceEmojis = function (replace?: string | null) {
    return this.replaceAll(emojiRegex, replace ?? '')
}
String.prototype.toURL = function () {
    let URLString = this
    if (URLString.split('//')[0].isEmpty()) {
        URLString = `${unsafeWindow.location.protocol}${URLString}`
    }
    return new URL(URLString.toString())
}