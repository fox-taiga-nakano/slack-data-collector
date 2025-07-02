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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
回答はすべて日本語でお願いします

## プロジェクト概要

Google Apps Script (GAS) を使用したSlackデータ収集システム。TypeScriptで開発され、Slack APIからメッセージを取得してGoogle Sheetsに保存する。

## アーキテクチャ

- **言語**: TypeScript (ES2020)
- **ランタイム**: Google Apps Script
- **ビルドツール**: Rollup
- **テストフレームワーク**: Jest
- **パッケージマネージャー**: pnpm

## コマンド

### 開発・ビルド

```bash
pnpm run clean          # ビルド成果物をクリーンアップ
pnpm run build          # TypeScriptをコンパイルしてdistディレクトリに出力
pnpm run bundle         # Rollupでバンドル
```

### テスト・品質チェック

```bash
pnpm test               # Jestでテスト実行
pnpm run lint           # ESLint + ライセンスチェック実行
pnpm run license        # ライセンスヘッダーを追加
```

### デプロイ

```bash
pnpm run deploy         # 開発環境(.clasp-dev.json)にデプロイ
pnpm run deploy:prod    # 本番環境(.clasp-prod.json)にデプロイ
```

## コード構造

プロジェクトは以下の構造を想定している（docs.mdに記載）：

```
src/
├── index.ts              # エントリーポイント
├── config/
│   └── settings.ts       # 設定管理（Script Properties）
├── services/
│   ├── slack-service.ts  # Slack API サービス
│   └── spreadsheet-service.ts # Google Sheets操作
├── utils/
│   └── date-utils.ts     # 日付ユーティリティ
└── types/
    └── slack.ts          # 型定義
```

## 重要な技術仕様

### ビルド設定

- Rollupでバンドルし、distディレクトリに出力
- ライセンスヘッダーの自動追加
- TypeScript、Prettier、cleanup pluginを使用

### Google Apps Script固有の考慮事項

- Script Propertiesを使用したシークレット管理（SLACK_TOKEN等）
- Rate limiting対応（3秒間隔でのAPI呼び出し）
- エラーリトライ機能付きURLFetch

### コーディング規約

- ファイル名: ケバブケース（例: slack-service.ts）
- クラス名: パスカルケース（例: SlackService）
- 関数名: キャメルケース（例: getMessagesForDateRange）
- 定数: SCREAMING_SNAKE_CASE（例: API_BASE_URL）

## 開発時の注意点

1. **Node.js 22以上**が必要
2. Google Apps Scriptプロジェクトとの連携にはclasp設定が必要
3. Slack APIトークンはScript Propertiesで管理（コードに直接記述しない）
4. スレッド返信の取得時は追加のAPI呼び出しが必要
5. Google Sheetsの容量制限に注意
