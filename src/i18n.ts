import zh_CN from '../i18n/zh_CN.json';
import en from '../i18n/en.json';
class I18N {
    [key: string]: { [key: string]: RenderCode<any> | string | (RenderCode<any> | string)[] }
}
export const i18n: I18N = { 
    zh: zh_CN,
    en: en
}