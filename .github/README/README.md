# Iwara Download Tool
  * Batch download
  * Support downloader implemented based on Aria2
  * Automatically check whether there is a third-party network disk download link provided by the author in the video introduction and comment area
  * Customize the save location and file name <sup>*Only supports Aria2 and IwaraDownloader, other download modes only support custom file names</sup>
  * Automatically follow the selected video author <sup>*Off by default, this function needs to be turned on manually</sup>
  * Automatically like/like the selected video <sup>*Off by default, this function needs to be turned on manually</sup>
  * Supports downloading private videos <sup>*You need to use an account that has become friends with the author to download</sup>
  * Support downloading hidden videos <sup>*Need to know the video ID</sup>

## Instructions for use

### Installation script

* Installed from 
  **[GreasyFork](https://sleazyfork.org/scripts/422239)**
* GitHub Release
  **[Install](https://github.com/dawn-lc/IwaraDownloadTool/releases/download/latest/IwaraDownloadTool.user.js)**
* GitHub Release \[development version\]
  **[Install](https://github.com/dawn-lc/IwaraDownloadTool/releases/download/preview/IwaraDownloadTool.user.js)**

#### Support the following browsers

* Chrome or a browser based on Chromium core (such as Edge) <sup>*version ≥85</sup>
* Firefox <sup>*version ≥79</sup>

#### Recommended script manager plug-in

* [Tampermonkey](https://www.tampermonkey.net/)

#### Detailed instructions for use

* [Wiki](https://github.com/dawn-lc/IwaraDownloadTool/wiki)

#### Path available variables

* Download time %#NowTime#%
* Upload time %#UploadTime#%
* Video title %#TITLE#%
* Video ID %#ID#%
* Video author %#AUTHOR#%
* Video author (nickname) %#ALIAS#%
* Image quality %#QUALITY#%

  %\#NowTime:YYYY\-MM\-DD\#%\_%\#AUTHOR\#%\_%\#UploadTime:YYYY\-MM\-DD\#%\_%\#TITLE\#%\_%\#QUALITY\#%\[%\#ID\#%\]\.MP4

  Output：

  2024\-02\-19\_ExampleAuthorID\_2024\-02\-18\_ExampleTitle\_Source\[ExampleID\]\.MP4

## Dependencies
- [toastify-js](https://github.com/apvarun/toastify-js) - [MIT License](https://opensource.org/licenses/MIT)
- [moment.js](https://github.com/moment/moment/) - [MIT License](https://opensource.org/licenses/MIT)
- [Dexie.js](https://github.com/dexie/Dexie.js) - [Apache-2.0 License](https://opensource.org/license/apache-2-0)
- [aria2rpc](https://github.com/pboymt/aria2rpc)