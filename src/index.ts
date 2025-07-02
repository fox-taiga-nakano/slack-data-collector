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

import { SlackService } from './services/slack-service';
import { SpreadsheetService } from './services/spreadsheet-service';
import { Settings } from './config/settings';
import { DateUtils } from './utils/date-utils';

async function processNextMonth(): Promise<void> {
  const props = PropertiesService.getScriptProperties();
  const yearProp = props.getProperty('lastProcessedYear');
  const monthProp = props.getProperty('lastProcessedMonth');

  if (!yearProp || !monthProp) {
    throw new Error(
      'Last processed year/month not found. Please set lastProcessedYear and lastProcessedMonth in Project Settings > Script Properties.'
    );
  }

  const year = Number(yearProp);
  const month = Number(monthProp);

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
    props.setProperty('lastProcessedYear', nextMonth.year.toString());
    props.setProperty('lastProcessedMonth', nextMonth.month.toString());
  } catch (e) {
    const error = e as Error;
    Logger.log(`⚠️ ${year}年${month}月の処理でエラー: ${error.message}`);
  }
}

function resetProcessedMonth(): void {
  const props = PropertiesService.getScriptProperties();
  const yearProp = props.getProperty('lastProcessedYear');
  const monthProp = props.getProperty('lastProcessedMonth');

  if (!yearProp || !monthProp) {
    throw new Error(
      'Cannot reset - last processed year/month properties not found. Please set lastProcessedYear and lastProcessedMonth in Project Settings > Script Properties first.'
    );
  }

  props.setProperty('lastProcessedYear', '2024');
  props.setProperty('lastProcessedMonth', '4');
  Logger.log('開始月を2024年4月にリセットしました。');
}

function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Slack')
    .addItem('次の月のデータを取得', 'processNextMonth')
    .addItem('処理月をリセット', 'resetProcessedMonth')
    .addToUi();
}

declare const global: Record<string, unknown>;
global.processNextMonth = processNextMonth;
global.resetProcessedMonth = resetProcessedMonth;
global.onOpen = onOpen;
