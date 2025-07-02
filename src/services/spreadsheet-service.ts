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

    const messageMap = new Map<
      string,
      { parent: SlackMessage; replies: SlackMessage[] }
    >();

    messages.forEach(msg => {
      if (!msg.is_thread_reply) {
        messageMap.set(msg.ts, { parent: msg, replies: [] });
      }
    });

    messages.forEach(msg => {
      if (msg.is_thread_reply && msg.parent_ts) {
        const threadData = messageMap.get(msg.parent_ts);
        if (threadData) {
          threadData.replies.push(msg);
        }
      }
    });

    const headerRow = ['親メッセージ'];
    let maxReplies = 0;

    messageMap.forEach(thread => {
      maxReplies = Math.max(maxReplies, thread.replies.length);
    });

    for (let i = 1; i <= maxReplies; i++) {
      headerRow.push(`返信 ${i}`);
    }

    sheet.appendRow(headerRow);

    const rowData: string[][] = [];
    messageMap.forEach(thread => {
      const row = [thread.parent.text || ''];
      thread.replies.forEach(reply => row.push(reply.text || ''));

      while (row.length < headerRow.length) {
        row.push('');
      }

      rowData.push(row);
    });

    if (rowData.length > 0) {
      sheet.getRange(2, 1, rowData.length, headerRow.length).setValues(rowData);
    }

    sheet.autoResizeColumns(1, headerRow.length);

    Logger.log(
      `シート「${sheetName}」に ${rowData.length} 件の親メッセージと返信を出力しました`
    );
  }
}
