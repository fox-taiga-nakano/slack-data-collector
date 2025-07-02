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

# ASIDEでSlack データ取得GASを実装する手順書

## 前提条件

- Node.js (v16以上推奨)
- Google アカウント
- Slack Bot Token（GAS Script Propertiesで設定）

## 1. 環境構築

### 1.1 ASIDEプロジェクトの初期化

```bash
# プロジェクトディレクトリを作成
mkdir slack-data-collector
cd slack-data-collector

# ASIDEプロジェクトを初期化
pnpx @google/aside init
```

初期化時の設定：

- **Project Title**: `Slack Data Collector`
- **Create Angular UI?**: `No`（データ取得のみのため）
- **Dev Script ID**: 後で設定
- **Prod Script ID**: 後で設定

### 1.2 追加依存関係のインストール

```bash
# 日付処理ライブラリを追加
pnpm install moment
pnpm install -D @types/moment
```

## 2. Google Apps Script プロジェクトの作成

### 2.1 新しいGASプロジェクトを作成

1. [Google Apps Script](https://script.google.com/)にアクセス
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を「Slack Data Collector - Dev」に変更
4. Script IDをコピー（設定 > IDs）

### 2.2 clasp設定の更新

```bash
# 開発環境の設定
clasp login
```

`clasp-dev.json`を編集：

```json
{
  "scriptId": "YOUR_DEV_SCRIPT_ID",
  "rootDir": "./dist"
}
```

## 3. シークレット管理の設定

### 3.1 Google Apps Script Script Properties（推奨）

1. GASプロジェクトエディタを開く
2. 左側のメニューから「Project Settings（歯車アイコン）」をクリック
3. 「Script Properties」セクションで「Add Script Property」をクリック
4. 以下を設定：
   - **Property**: `SLACK_TOKEN`
   - **Value**: `xoxb-your-slack-bot-token`
5. 「Save Script Properties」をクリック

## 4. TypeScript コードの実装

### 4.1 プロジェクト構造

```
src/
├── index.ts          // エントリーポイント
├── config/
│   └── settings.ts   // 設定管理
├── services/
│   └── SlackService.ts    // Slack API サービス
│   └── SpreadsheetService.ts  // スプレッドシート操作
├── utils/
│   └── DateUtils.ts       // 日付ユーティリティ
└── types/
    └── slack.ts           // 型定義
```

### 4.2 型定義ファイル (`src/types/slack.ts`)

```typescript
export interface SlackMessage {
  ts: string;
  text: string;
  user?: string;
  thread_ts?: string;
  reply_count?: number;
  is_thread_reply?: boolean;
  parent_ts?: string;
}

export interface SlackResponse {
  ok: boolean;
  messages?: SlackMessage[];
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

export interface ProcessingState {
  lastProcessedYear: number;
  lastProcessedMonth: number;
}
```

### 4.3 設定管理 (`src/config/settings.ts`)

```typescript
export class Settings {
  static getSlackToken(): string {
    // Script Properties から取得（推奨）
    const token =
      PropertiesService.getScriptProperties().getProperty('SLACK_TOKEN');
    if (!token) {
      throw new Error(
        'Slack token not found. Please set SLACK_TOKEN in Project Settings > Script Properties.'
      );
    }
    return token;
  }

  // 以下も同様にScript Propertiesから取得する
  static getChannelId(): string {
    return 'C06TB2KU51S';
  }

  static getSpreadsheetId(): string {
    return '150H9OshKCDB8k5tup8m9z60FpoTXs5rsPApk2IgEeiM';
  }

  static shouldIncludeThreadReplies(): boolean {
    return true;
  }
}
```

### 4.4 Slack サービス (`src/services/SlackService.ts`)

```typescript
import { SlackMessage, SlackResponse } from '../types/slack';
import { Settings } from '../config/settings';

export class SlackService {
  private static readonly API_BASE_URL = 'https://slack.com/api';
  private static readonly RATE_LIMIT_DELAY = 3000; // 3秒

  static async getMessagesForDateRange(
    channelId: string,
    oldest: number,
    latest: number
  ): Promise<SlackMessage[]> {
    let allMessages: SlackMessage[] = [];
    let nextCursor: string | undefined;

    do {
      const result = await this.getChannelMessagesForDateRange(
        channelId,
        oldest,
        latest,
        nextCursor
      );

      if (!result) {
        Logger.log(`メッセージ取得失敗: oldest=${oldest}, latest=${latest}`);
        break;
      }

      allMessages = allMessages.concat(result.messages);
      nextCursor = result.nextCursor;

      if (nextCursor) {
        Utilities.sleep(this.RATE_LIMIT_DELAY);
      }
    } while (nextCursor);

    return allMessages;
  }

  static async getThreadReplies(
    channelId: string,
    threadTs: string
  ): Promise<SlackMessage[]> {
    const url = `${this.API_BASE_URL}/conversations.replies`;
    const payload = {
      channel: channelId,
      ts: threadTs,
      limit: '100',
    };

    const response = this.fetchWithRetry(url, {
      method: 'get',
      contentType: 'application/x-www-form-urlencoded',
      headers: {
        Authorization: `Bearer ${Settings.getSlackToken()}`,
      },
      payload: payload,
    });

    if (!response || !response.ok) {
      Logger.log(
        `⚠ スレッド取得失敗（TS: ${threadTs}）: ${response ? response.error : 'レスポンスなし'}`
      );
      return [];
    }

    return response.messages || [];
  }

  private static getChannelMessagesForDateRange(
    channelId: string,
    oldest: number,
    latest: number,
    cursor?: string
  ): { messages: SlackMessage[]; nextCursor?: string } | null {
    const url = `${this.API_BASE_URL}/conversations.history`;
    const payload: Record<string, string> = {
      channel: channelId,
      limit: '100',
      oldest: oldest.toString(),
      latest: latest.toString(),
    };

    if (cursor) {
      payload.cursor = cursor;
    }

    const response = this.fetchWithRetry(url, {
      method: 'get',
      contentType: 'application/x-www-form-urlencoded',
      headers: {
        Authorization: `Bearer ${Settings.getSlackToken()}`,
      },
      payload: payload,
    });

    if (!response || !response.ok) {
      Logger.log(
        `会話履歴の取得に失敗: ${response ? response.error : 'レスポンスなし'}`
      );
      return null;
    }

    return {
      messages: response.messages || [],
      nextCursor: response.response_metadata?.next_cursor,
    };
  }

  private static fetchWithRetry(
    url: string,
    options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions,
    maxRetries: number = 5
  ): SlackResponse | null {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = UrlFetchApp.fetch(url, options);
        const code = response.getResponseCode();

        if (code === 429) {
          const retryAfter =
            parseInt(response.getHeaders()['Retry-After'] as string, 10) || 5;
          Logger.log(`429 Rate Limited: ${retryAfter}秒待機`);
          Utilities.sleep(retryAfter * 1000);
          continue;
        }

        return JSON.parse(response.getContentText()) as SlackResponse;
      } catch (e) {
        Logger.log(`Fetch失敗（${i + 1}回目）: ${e.message}`);
        Utilities.sleep(this.RATE_LIMIT_DELAY);
      }
    }

    Logger.log('fetchWithRetry: 最大リトライ超過');
    return null;
  }
}
```

### 4.5 スプレッドシートサービス (`src/services/SpreadsheetService.ts`)

```typescript
import { SlackMessage } from '../types/slack';
import { Settings } from '../config/settings';

export class SpreadsheetService {
  static saveToSpreadsheet(messages: SlackMessage[], sheetName: string): void {
    const ss = SpreadsheetApp.openById(Settings.getSpreadsheetId());
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.clear();
    }

    // メッセージをスレッド単位でグループ化
    const messageMap = new Map<
      string,
      { parent: SlackMessage; replies: SlackMessage[] }
    >();

    // 親メッセージを先に処理
    messages.forEach(msg => {
      if (!msg.is_thread_reply) {
        messageMap.set(msg.ts, { parent: msg, replies: [] });
      }
    });

    // 返信メッセージを処理
    messages.forEach(msg => {
      if (msg.is_thread_reply && msg.parent_ts) {
        const threadData = messageMap.get(msg.parent_ts);
        if (threadData) {
          threadData.replies.push(msg);
        }
      }
    });

    // ヘッダー行を作成
    const headerRow = ['親メッセージ'];
    let maxReplies = 0;

    messageMap.forEach(thread => {
      maxReplies = Math.max(maxReplies, thread.replies.length);
    });

    for (let i = 1; i <= maxReplies; i++) {
      headerRow.push(`返信 ${i}`);
    }

    sheet.appendRow(headerRow);

    // データ行を作成
    const rowData: string[][] = [];
    messageMap.forEach(thread => {
      const row = [thread.parent.text || ''];
      thread.replies.forEach(reply => row.push(reply.text || ''));

      // 不足分を空文字で埋める
      while (row.length < headerRow.length) {
        row.push('');
      }

      rowData.push(row);
    });

    // データを一括で書き込み
    if (rowData.length > 0) {
      sheet.getRange(2, 1, rowData.length, headerRow.length).setValues(rowData);
    }

    // 列幅を自動調整
    sheet.autoResizeColumns(1, headerRow.length);

    Logger.log(
      `シート「${sheetName}」に ${rowData.length} 件の親メッセージと返信を出力しました`
    );
  }
}
```

### 4.6 日付ユーティリティ (`src/utils/DateUtils.ts`)

```typescript
export class DateUtils {
  static getMonthRange(
    year: number,
    month: number
  ): { startTime: number; endTime: number } {
    const startTime =
      new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).getTime() / 1000;
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // 月末日
    const endTime = endDate.getTime() / 1000;

    return { startTime, endTime };
  }

  static getCurrentYearMonth(): { year: number; month: number } {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
    };
  }

  static getNextMonth(
    year: number,
    month: number
  ): { year: number; month: number } {
    if (month === 12) {
      return { year: year + 1, month: 1 };
    }
    return { year, month: month + 1 };
  }
}
```

### 4.7 メインロジック (`src/index.ts`)

```typescript
import { SlackService } from './services/SlackService';
import { SpreadsheetService } from './services/SpreadsheetService';
import { Settings } from './config/settings';
import { DateUtils } from './utils/DateUtils';
import { SlackMessage, ProcessingState } from './types/slack';

/**
 * メイン関数：前回処理した月の次の月を1つだけ処理する
 */
function processNextMonth(): void {
  const props = PropertiesService.getScriptProperties();
  let year = Number(props.getProperty('lastProcessedYear')) || 2024;
  let month = Number(props.getProperty('lastProcessedMonth')) || 4;

  const { year: thisYear, month: thisMonth } = DateUtils.getCurrentYearMonth();

  // 現在の月より先なら処理を終了
  if (year > thisYear || (year === thisYear && month > thisMonth)) {
    Logger.log('すべての月の処理が完了しました。');
    return;
  }

  try {
    Logger.log(`処理開始: ${year}年${month}月`);

    const { startTime, endTime } = DateUtils.getMonthRange(year, month);
    const messages = await SlackService.getMessagesForDateRange(
      Settings.getChannelId(),
      startTime,
      endTime
    );

    let allMessages = [...messages];

    // スレッド返信を取得
    if (Settings.shouldIncludeThreadReplies()) {
      const threadMessages = messages.filter(
        msg => msg.thread_ts || (msg.reply_count && msg.reply_count > 0)
      );

      for (const msg of threadMessages) {
        const threadTs = msg.thread_ts || msg.ts;
        const replies = await SlackService.getThreadReplies(
          Settings.getChannelId(),
          threadTs
        );
        const repliesWithoutParent = replies.filter(r => r.ts !== threadTs);

        repliesWithoutParent.forEach(r => {
          r.is_thread_reply = true;
          r.parent_ts = threadTs;
        });

        allMessages = allMessages.concat(repliesWithoutParent);
        Utilities.sleep(3000);
      }
    }

    const sheetName = `${year}年${month}月`;
    SpreadsheetService.saveToSpreadsheet(allMessages, sheetName);
    Logger.log(`${sheetName} の処理が完了しました`);

    // 次の月に進める
    const nextMonth = DateUtils.getNextMonth(year, month);
    props.setProperty('lastProcessedYear', nextMonth.year.toString());
    props.setProperty('lastProcessedMonth', nextMonth.month.toString());
  } catch (e) {
    Logger.log(`⚠️ ${year}年${month}月の処理でエラー: ${e.message}`);
  }
}

/**
 * 初期化関数（2024年4月から再スタート）
 */
function resetProcessedMonth(): void {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('lastProcessedYear', '2024');
  props.setProperty('lastProcessedMonth', '4');
  Logger.log('開始月を2024年4月にリセットしました。');
}

/**
 * メニュー追加（GAS UI）
 */
function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Slack')
    .addItem('次の月のデータを取得', 'processNextMonth')
    .addItem('処理月をリセット', 'resetProcessedMonth')
    .addToUi();
}

// 関数をグローバルスコープに公開
declare const global: any;
global.processNextMonth = processNextMonth;
global.resetProcessedMonth = resetProcessedMonth;
global.onOpen = onOpen;
```

## 5. デプロイと実行

### 5.1 ビルドとデプロイ

```bash
# TypeScriptをビルド
npm run build

# GASにデプロイ
npm run deploy
```

### 5.2 権限設定

1. GAS エディタで「実行」をクリック
2. 必要な権限を承認：
   - Google Sheets API
   - UrlFetch (Slack API用)
   - PropertiesService

### 5.3 トリガー設定

```javascript
// GAS エディタで実行して定期実行を設定
function createTrigger() {
  ScriptApp.newTrigger('processNextMonth')
    .timeBased()
    .everyDays(1) // 毎日実行
    .atHour(9) // 午前9時
    .create();
}
```

## 6. テストとデバッグ

### 6.1 ローカルテスト（Jest使用）

```bash
# テストを実行
pnpm test
```

### 6.2 ログ確認

```bash
# GASのログを確認
clasp logs
```

## 7. 本番環境の設定

### 7.1 本番用GASプロジェクト作成

1. 新しいGASプロジェクトを作成（名前：Slack Data Collector - Prod）
2. Script IDを`clasp-prod.json`に設定

### 7.2 本番デプロイ

```bash
# 本番環境にデプロイ
pnpm run deploy:prod
```

## 8. セキュリティベストプラクティス

### 8.1 Slack Token管理

- **推奨**: GAS Script Properties（プロジェクト設定画面から設定）
- **避ける**: コードに直接記述

**Script Properties の特徴:**

- スクリプトエディターアクセス権を持つ人全員が閲覧可能
- 最大50個まではUI から設定可能
- 簡単で追加設定不要

### 8.2 アクセス制御

- GASプロジェクトの共有設定を適切に設定
- Script Propertiesにアクセスできるユーザーを制限
- 開発環境と本番環境でプロパティを分離

### 8.3 ログ管理

- 機密情報をログに出力しない
- エラーハンドリングでトークンを露出させない

## 9. 運用とメンテナンス

### 9.1 定期チェック項目

- Slack API制限の監視
- スプレッドシートの容量確認
- エラーログの確認

### 9.2 更新手順

1. ローカルでコード修正
2. テスト実行
3. 開発環境でテスト
4. 本番環境にデプロイ

これで、ASIDEフレームワークを使用したSlackデータ取得システムが完成です。TypeScriptの型安全性、自動フォーマット、テスト機能を活用して、保守性の高いコードを維持できます。

## 10. コーディング規約

- パッケージマネージャーは`pnpm`を使用
- ファイル名は小文字のケバブケース（例: `slack-service.ts`）
- クラス名はパスカルケース（例: `SlackService`）
- 関数名はキャメルケース（例: `getMessagesForDateRange`）
- 変数名はキャメルケース（例: `slackToken`）
- 定数は大文字のスネークケース（例: `API_BASE_URL`）
- コメントはJSDoc形式を使用
- マジックナンバーは避ける
