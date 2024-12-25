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
export const isNotEmpty = (obj: unknown): boolean => {
    if (isNullOrUndefined(obj)) {
        return false
    }
    if (Array.isArray(obj)) {
        return obj.some(isNotEmpty);
    }
    if (isString(obj)) {
        return !obj.isEmpty();
    }
    if (isNumber(obj)) {
        return !Number.isNaN(obj)
    }
    if (isElement(obj) || isNode(obj)) {
        return true
    }
    if (isObject(obj)) {
        return Object.values(obj).some(isNotEmpty)
    }
    return true
}


/*
Object.defineProperty(Object.prototype, 'prune', {
    set: function () {
        return new Proxy(this, {
            get: function (target, property) {
                return () => {
                    if (Array.isArray(target)) {
                        return target.filter(isNotEmpty).map(i => i.prune());
                    }
                    if (isElement(target) || isNode(target)) {
                        return target
                    }
                    if (isObject(target)) {
                        return Object.fromEntries(
                            Object.entries(target)
                                .filter(([k, v]) => isNotEmpty(v))
                                .map(([k, v]: [string, any]) => [k, v.prune()])
                        )
                    }
                    return isNotEmpty(target) ? target : undefined
                }
            },
            set: function (target, property, value) {
                console.log('set', target, property, value)
                return true
            }
        });
    },
    writable: true,
    configurable: false,
    enumerable: false,
});
*/

Object.defineProperty(Object.prototype, 'prune',{
    value: function() {
        if (Array.isArray(this)) {
            return this.filter(isNotEmpty).map(i => i.prune());
        }
        if (isElement(this) || isNode(this)) {
            return this
        }
        if (isObject(this)) {
            return Object.fromEntries(
                Object.entries(this)
                    .filter(([k, v]) => isNotEmpty(v))
                    .map(([k, v]: [string, any]) => [k, v.prune()])
            )
        }
        return isNotEmpty(this) ? this : undefined
    },
    writable: false,
    configurable: false,
    enumerable: false,
})

Object.defineProperty(Object.prototype, 'stringify',{
    value: function() {
        let obj = this instanceof Error ? String(this) : this
        obj = obj instanceof Date ? obj.toISOString() : obj
        return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj)
    },
    writable: true,
    configurable: false,
    enumerable: false,
})
Array.prototype.any = function () {
    return this.filter(i => !isNullOrUndefined(i)).length > 0
}
/*
Array.prototype.prune = function () {
    return this.filter(i => i !== null && typeof i !== 'undefined')
}
*/
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
String.prototype.isEmpty = function () {
    return !isNullOrUndefined(this) && this.length === 0
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
String.prototype.splitLimit = function (separator: string, limit?: number) {
    if (this.isEmpty() || isNullOrUndefined(separator)) {
        throw new Error('Empty')
    }
    let body = this.split(separator)
    return limit ? body.slice(0, limit).concat(body.slice(limit).join(separator)) : body
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