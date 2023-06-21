[English](.github/README/README.md) [日本語](.github/README/README_ja.md)
# Iwara 视频下载工具

 * 批量选中并下载
 * 自定义保存位置以及文件名
 * 支持Aria2
 * 一键下载任意作者的全部视频
 * 自动检查视频简介以及评论区中是否存在由作者提供的第三方网站高画质下载连接(例如:[Shiroko - Lilac (シロコ)](https://www.iwara.tv/videos/713gbud4yign5xpx))

以下功能需要使用 **[Tampermonkey Beta](https://www.tampermonkey.net/index.php?#download_gcal)** 载入本脚本。
* 支持下载上锁视频 <sup>*需要使用已与作者成为好友的账号进行下载</sup>
* 支持下载隐藏视频 <sup>*需要知道视频ID</sup>

## 使用说明

### 安装脚本

* 直接安装
 **[点我](https://github.com/dawn-lc/IwaraDownloadTool/raw/master/dist/IwaraDownloadTool.user.js)**
* 从 GreasyFork 安装
 **[点我](https://greasyfork.org/scripts/422239)**  
* 从 ScriptCat 安装
 **[点我](https://scriptcat.org/script-show-page/348)**

#### 支持以下浏览器

* Chrome 或 基于 Chromium 内核的浏览器 <sup>*推荐</sup>  
* Firefox <sup>*部分功能不可用</sup>

#### 推荐脚本管理器插件

* Tampermonkey BETA(篡改猴) <sup>*<a href="https://www.tampermonkey.net/#download_fcmf">安装插件</a></sup>  

#### 支持的操作系统

* Windows、MacOS、Linux 等支持 Chrome 或 Firefox 浏览器的所有操作系统 <sup>*移动平台如 iOS、Android 除外</sup>


## 依赖库
- [toastify-js](https://github.com/apvarun/toastify-js) - [MIT License](https://opensource.org/licenses/MIT)
- [moment.js](https://github.com/moment/moment/) - [MIT License](https://opensource.org/licenses/MIT)