import zh from '../i18n/zh.json';
import en from '../i18n/en.json';
class I18N {
    [key: string]: { [key: string]: RenderCode | RenderCode[] }
}
export const i18n: I18N = {
    zh: zh, 
    zh_CN: zh,
    en: en
}