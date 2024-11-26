import zh_CN from '../i18n/zh_CN.json';
import en from '../i18n/en.json';
class I18N {
    [key: string]: { [key: string]: RenderCode | RenderCode[] }
}
export const i18n: I18N = { 
    zh_CN: zh_CN,
    en: en
}