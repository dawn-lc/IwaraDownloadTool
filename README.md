[English](.github/README/README.md) <sup>*We need volunteer translators for English localization.</sup>

[日本語](.github/README/README_ja.md) <sup>*日本語ローカライズを提供してくれる翻訳ボランティアを必要としています。</sup>

# Iwara 视频下载工具

 * 批量下载
 * 支持基于Aria2实现的下载器
 * 自动检查视频简介以及评论区中是否存在由作者提供的第三方网盘下载连接
 * 自定义保存位置以及文件名 <sup>*仅支持Aria2、IwaraDownloader，其他下载模式仅支持自定义文件名</sup>
 * 自动关注选中的视频作者 <sup>*默认关闭，需手动开启该功能</sup>
 * 自动点赞/喜欢选中的视频 <sup>*默认关闭，需手动开启该功能</sup>
 * 支持下载私有视频 <sup>*需要使用已与作者成为好友的账号进行下载</sup>
 * 支持下载隐藏视频 <sup>*需要知道视频ID</sup>

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

* Chrome 或 基于 Chromium 内核的浏览器 (如Edge) <sup>***版本≥85**</sup>
* Firefox <sup>***版本≥79**</sup>

#### 推荐脚本管理器插件

* Tampermonkey (篡改猴) **[前往官网](https://www.tampermonkey.net/)**
* ScriptCat (脚本猫) **[前往官网](https://scriptcat.org/)** <sup>*推荐国内使用</sup>

#### 详细使用说明

* [前往Wiki](https://github.com/dawn-lc/IwaraDownloadTool/wiki) <sup>*有没有人愿意帮我写下文档...</sup>

#### 路径可用变量

* 下载时间 %#NowTime#%
* 发布时间 %#UploadTime#%
* 视频标题 %#TITLE#%
* 视频ID %#ID#%
* 视频作者 %#AUTHOR#%
* 视频作者(昵称) %#ALIAS#%
* 画质 %#QUALITY#%

  %\#NowTime:YYYY\-MM\-DD\#%\_%\#AUTHOR\#%\_%\#UploadTime:YYYY\-MM\-DD\#%\_%\#TITLE\#%\_%\#QUALITY\#%\[%\#ID\#%\]\.MP4

  输出：

  2024\-02\-19\_ExampleAuthorID\_2024\-02\-18\_ExampleTitle\_Source\[ExampleID\]\.MP4

## 依赖库
- [toastify-js](https://github.com/apvarun/toastify-js) - [MIT License](https://opensource.org/licenses/MIT)
- [moment.js](https://github.com/moment/moment/) - [MIT License](https://opensource.org/licenses/MIT)
- [Dexie.js](https://github.com/dexie/Dexie.js) - [Apache-2.0 License](https://opensource.org/license/apache-2-0)
- [aria2rpc](https://github.com/pboymt/aria2rpc)