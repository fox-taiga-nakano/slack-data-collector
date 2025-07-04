<!--
Copyright 2023 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# Slack Data Collector

Google Apps Script (GAS) を使用したSlackデータ収集システム。Slack APIからメッセージを取得してGoogle Sheetsに保存します。

## 概要

- **言語**: TypeScript (ES2020)
- **ランタイム**: Google Apps Script
- **ビルドツール**: Rollup
- **テストフレームワーク**: Jest
- **パッケージマネージャー**: npm

## 必要な環境

- Node.js 22以上
- Google アカウント
- Slack Bot Token

## インストール

```bash
# 依存関係のインストール
npm install

# Google Apps Script CLI (clasp) のログイン
clasp login
```

## 設定

### 1. Google Apps Script プロジェクトの作成

1. [Google Apps Script](https://script.google.com/)で新しいプロジェクトを作成
2. プロジェクト名を設定（例: "Slack Data Collector"）
3. Script IDをコピー

### 2. Clasp設定ファイル

開発環境用（`.clasp-dev.json`）と本番環境用（`.clasp-prod.json`）のファイルを作成：

```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "./dist"
}
```

### 3. 初期設定

#### Script Properties設定

Google Apps Script の Script Properties で以下を設定：

- `SLACK_TOKEN`: Slack Bot Token (xoxb-...)
- `CHANNEL_ID`: SlackチャンネルID (C0123456789)
- `SPREADSHEET_ID`: Google SheetsのID

#### 設定手順

1. Google Apps Script のプロジェクトを開く
2. 左側メニューから「プロジェクトの設定」を選択
3. 「スクリプトプロパティ」セクションで「スクリプトプロパティを追加」をクリック
4. 上記の設定値を追加

#### settingsシートの自動作成

初回実行時に、指定されたGoogle Sheetsに「settings」シートが自動作成されます。このシートで以下の設定を管理できます：

- `INCLUDE_THREAD_REPLIES`: スレッド返信を含めるか (true/false)
- `lastProcessedYear`: 最後に処理した年
- `lastProcessedMonth`: 最後に処理した月

## 使用方法

### 開発・ビルド

```bash
# ビルド成果物をクリーンアップ
npm run clean

# TypeScriptをコンパイルしてバンドル
npm run build

# 開発環境にデプロイ
npm run deploy

# 本番環境にデプロイ
npm run deploy:prod
```

### テスト・品質チェック

```bash
# テスト実行
npm test

# ESLint + ライセンスチェック
npm run lint

# ライセンスヘッダーを追加
npm run license
```

## プロジェクト構造

```
src/
├── index.ts                    # エントリーポイント
├── config/
│   └── settings.ts             # 設定管理（Script Properties）
├── services/
│   ├── slack-service.ts        # Slack API サービス
│   └── spreadsheet-service.ts  # Google Sheets操作
├── utils/
│   └── date-utils.ts           # 日付ユーティリティ
└── types/
    └── slack.ts                # 型定義
```

## 主な機能

- **メッセージ取得**: 指定期間のSlackメッセージを取得
- **スレッド対応**: スレッド返信も含めて取得
- **Google Sheets出力**: 月別シートに整理して保存
- **レート制限対応**: Slack API制限に配慮した呼び出し
- **エラーハンドリング**: リトライ機能付きの堅牢な処理

## セキュリティ

- Slack Tokenは Script Properties で管理
- コードにシークレット情報を含めない
- 適切なアクセス制御設定

## ライセンス

Apache License 2.0

## 詳細ドキュメント

詳細な実装手順については [docs.md](docs.md) を参照してください。
