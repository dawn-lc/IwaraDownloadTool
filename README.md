[English](.github/README/README.md) [日本語](.github/README/README_ja.md)
# Iwara 视频下载工具

 * 批量选中并下载
 * 自定义保存位置以及文件名
 * 支持Aria2
 * 一键下载任意作者的全部视频
 * 自动检查视频简介以及评论区中是否存在由作者提供的第三方网站高画质下载连接

## 使用说明

### 安装脚本

* 从 ScriptCat 安装
 **[前往](https://scriptcat.org/script-show-page/348)** <sup>*推荐国内使用</sup>
* 从 GreasyFork 安装
 **[前往](https://sleazyfork.org/scripts/422239)**
* GitHub Release
 **[安装](https://github.com/dawn-lc/IwaraDownloadTool/releases/download/latest/IwaraDownloadTool.user.js)**
* GitHub Release \[开发版\]
 **[安装](https://github.com/dawn-lc/IwaraDownloadTool/releases/download/preview/IwaraDownloadTool.user.js)**

#### 支持以下浏览器

* Chrome 或 基于 Chromium 内核的浏览器 <sup>*推荐</sup>
* Firefox <sup>*部分功能不可用</sup>

#### 推荐脚本管理器插件

* Tampermonkey (篡改猴) **[前往官网](https://www.tampermonkey.net/)**
* ScriptCat (脚本猫) **[前往官网](https://scriptcat.org/)** <sup>*推荐国内使用</sup>

#### 支持的操作系统

* Windows、MacOS、Linux 等支持 Chrome 或 Firefox 浏览器的所有操作系统 <sup>*移动平台如 iOS、Android 除外</sup>

#### 路径可用变量

* 下载时间 %#NowTime#%
* 发布时间 %#UploadTime#%
* 视频标题 %#TITLE#%
* 视频ID %#ID#%
* 视频作者 %#AUTHOR#%
* 画质 %#QUALITY#%

  %#NowTime:YYYY-MM-DD#%\_%\#AUTHOR\#%\_%\#TITLE\#%\_%\#QUALITY\#%[%#ID#%].MP4

  输出：

  2024-02-19_ExampleAuthorID_ExampleTitle_Source[ExampleID].MP4

## 依赖库
- [toastify-js](https://github.com/apvarun/toastify-js) - [MIT License](https://opensource.org/licenses/MIT)
- [moment.js](https://github.com/moment/moment/) - [MIT License](https://opensource.org/licenses/MIT)