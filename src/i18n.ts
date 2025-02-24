import zh_cn from '../locale/zh_cn.json';
import en from '../locale/en.json';
class I18N {
    [key: string]: { [key: string]: RenderCode<any> | string | (RenderCode<any> | string)[] }
}
export const i18n: I18N = {
    zh: zh_cn,
    en: en
}