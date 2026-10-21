<p align="center">
    <a href="https://github.com/traggo/logo">
        <img height="300px" src="https://raw.githubusercontent.com/traggo/logo/master/logo.png" />
    </a>
</p>

<h1 align="center">DayLogs</h1>
<p align="center"><i>社内向けの日報入力・集計ツール</i></p>

Based on https://github.com/traggo/server, with custom modifications.

日々の作業を、カテゴリ・分類・グループを付けた日報として記録し、期間やメンバーごとに集計します。
カテゴリなどの選択肢は部署ごとに管理者が設定します（元の日報ツールの設定ファイル `daily_report_settings_00N.js` も取り込めます）。

データはすべて自前でホストするサーバー上に保存され、第三者に渡ることはありません。

## 機能

* 日報の入力（勤務時間と、作業ごとの課題キー・タイトル・カテゴリ・分類・グループ・時間）と、保存済みの日報の修正
* 集計・分析（期間・名前・カテゴリ・分類・グループで絞り込み、グラフと表で集計）
* 部署ごとの日報設定とメンバー管理、シンプルなユーザー管理

## traggo からの主な変更点

* 日報の入力・集計・設定を追加し、タイムシート（リスト・カレンダー）・ダッシュボード・タグの画面を削除（サーバーの API は残しています）
* UI をすべて日本語化
* 日付表示に日本語ロケールを追加し、デフォルトに設定
* Glow テーマ（デフォルト）と First Gaming テーマを追加

## 起動方法

```bash
docker compose up --build -d
```

http://localhost:3030 を開き、初期ユーザー `admin` / `admin` でログインします。
初回ログイン後、パスワードは必ず変更してください。データ（SQLite）は `.traggodata/` に保存されます。

設定は環境変数 `TRAGGO_*` で変更できます。項目は [.env.sample](.env.sample) と
traggo の [Configuration](https://traggo.net/config/) を参照してください。

## 開発

Go、Node.js、yarn が必要です。手順の詳細は traggo の [Setup Dev Environment](https://traggo.net/dev/setup/) を参照してください。

```bash
make download-tools install generate   # ツール・依存関係の導入とコード生成
make build-bin-local                   # UI をビルドしてバイナリに埋め込む
make lint test
```
