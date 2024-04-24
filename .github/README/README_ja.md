# Iwara ビデオダウンローダーツール
  * 一括ダウンロード
  * Aria2 に基づいて実装されたダウンローダーをサポート
  * ビデオの紹介およびコメント領域に作成者が提供するサードパーティのネットワーク ディスクのダウンロード リンクがあるかどうかを自動的に確認します
  * 保存場所とファイル名をカスタマイズします <sup>* Aria2 と IwaraDownloader のみをサポートし、他のダウンロード モードはカスタム ファイル名のみをサポートします</sup>
  * 選択したビデオ作成者を自動的にフォローします <sup>*デフォルトではオフになっています。この機能は手動でオンにする必要があります</sup>
  * 選択したビデオを自動的に「いいね！」します <sup>*デフォルトではオフになっています。この機能は手動でオンにする必要があります</sup>
  * プライベートビデオのダウンロードをサポート <sup>* ダウンロードするには、作者と友達になったアカウントを使用する必要があります</sup>
  * 隠しビデオのダウンロードをサポート <sup>* ビデオ ID を知る必要があります</sup>

## 使用説明書

### インストールスクリプト

* からインストールされます
   **[GreasyFork](https://sleazyfork.org/scripts/422239)**
* GitHub Release
   **[インストール](https://github.com/dawn-lc/IwaraDownloadTool/releases/download/latest/IwaraDownloadTool.user.js)**
* GitHub Release \[開発バージョン\]
   **[インストール](https://github.com/dawn-lc/IwaraDownloadTool/releases/download/preview/IwaraDownloadTool.user.js)**

#### 次のブラウザをサポートします

* Chrome または Chromium コアに基づくブラウザ (Edge など) <sup>***version ≥85**</sup>
* Firefox <sup>***version ≥79**</sup>

#### 推奨されるスクリプト マネージャー プラグイン

* [Tampermonkey](https://www.tampermonkey.net/)

#### 詳しい使用説明書

* [Wiki](https://github.com/dawn-lc/IwaraDownloadTool/wiki)

#### パスで使用可能な変数

* ダウンロード時間 %#NowTime#%
* アップロード時間 %#UploadTime#%
* 動画のタイトル %#TITLE#%
* ビデオ ID %#ID#%
* 動画作成者 %#AUTHOR#%
* 動画作成者 (ニックネーム) %#ALIAS#%
* 画質 %#QUALITY#%

  使用例:

  %\#NowTime:YYYY\-MM\-DD\#%\_%\#AUTHOR\#%\_%\#UploadTime:YYYY\-MM\-DD\#%\_%\#TITLE\#%\_%\#QUALITY\#%\[%\#ID\#%\]\.MP4

  2024\-02\-19\_ExampleAuthorID\_2024\-02\-18\_ExampleTitle\_Source\[ExampleID\]\.MP4

## 依存ライブラリ
- [toastify-js](https://github.com/apvarun/toastify-js) - [MIT License](https://opensource.org/licenses/MIT)
- [moment.js](https://github.com/moment/moment/) - [MIT License](https://opensource.org/licenses/MIT)
- [Dexie.js](https://github.com/dexie/Dexie.js) - [Apache-2.0 License](https://opensource.org/license/apache-2-0)
- [aria2rpc](https://github.com/pboymt/aria2rpc)