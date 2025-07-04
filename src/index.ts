/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { SlackService } from '@/services/slack-service';
import { SpreadsheetService } from '@/services/spreadsheet-service';
import { Settings } from '@/config/settings';
import { DateUtils } from '@/utils/date-utils';

async function processNextMonth(): Promise<void> {
  const year = Settings.getLastProcessedYear();
  const month = Settings.getLastProcessedMonth();

  const { year: thisYear, month: thisMonth } = DateUtils.getCurrentYearMonth();

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

    const nextMonth = DateUtils.getNextMonth(year, month);
    Settings.setLastProcessedDate(nextMonth.year, nextMonth.month);
  } catch (e) {
    const error = e as Error;
    Logger.log(`⚠️ ${year}年${month}月の処理でエラー: ${error.message}`);
  }
}

function resetProcessedMonth(): void {
  Settings.setLastProcessedDate(2024, 4);
  Logger.log('開始月を2024年4月にリセットしました。');
}

function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Slack')
    .addItem('次の月のデータを取得', 'processNextMonth')
    .addItem('処理月をリセット', 'resetProcessedMonth')
    .addToUi();
}

// Google Apps Script環境でのglobalオブジェクトのpolyfill
declare const globalThis: Record<string, unknown>;
const global = globalThis;

global.processNextMonth = processNextMonth;
global.resetProcessedMonth = resetProcessedMonth;
global.onOpen = onOpen;
