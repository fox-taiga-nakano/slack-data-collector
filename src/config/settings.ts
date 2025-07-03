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

export class Settings {
  private static getSettingsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    const spreadsheetId =
      PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error(
        'Spreadsheet ID not found. Please set SPREADSHEET_ID in Project Settings > Script Properties.'
      );
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    let settingsSheet = spreadsheet.getSheetByName('settings');

    if (!settingsSheet) {
      settingsSheet = spreadsheet.insertSheet('settings');
      this.initializeSettingsSheet(settingsSheet);
    }

    return settingsSheet;
  }

  private static initializeSettingsSheet(
    sheet: GoogleAppsScript.Spreadsheet.Sheet
  ): void {
    const headers = [['設定項目', '値', '説明']];
    const initialData = [
      ['INCLUDE_THREAD_REPLIES', 'true', 'スレッド返信を含めるか (true/false)'],
      ['lastProcessedYear', '2024', '最後に処理した年'],
      ['lastProcessedMonth', '4', '最後に処理した月'],
    ];

    sheet.getRange(1, 1, 1, 3).setValues(headers);
    sheet.getRange(2, 1, initialData.length, 3).setValues(initialData);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    sheet.autoResizeColumns(1, 3);
  }

  private static getSettingValue(key: string): string | null {
    const sheet = this.getSettingsSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return data[i][1] ? data[i][1].toString() : null;
      }
    }
    return null;
  }

  static getSlackToken(): string {
    const token =
      PropertiesService.getScriptProperties().getProperty('SLACK_TOKEN');
    if (!token) {
      throw new Error(
        'Slack token not found. Please set SLACK_TOKEN in Project Settings > Script Properties.'
      );
    }
    return token;
  }

  static getChannelId(): string {
    const channelId =
      PropertiesService.getScriptProperties().getProperty('CHANNEL_ID');
    if (!channelId) {
      throw new Error(
        'Channel ID not found. Please set CHANNEL_ID in Project Settings > Script Properties.'
      );
    }
    return channelId;
  }

  static getSpreadsheetId(): string {
    const spreadsheetId =
      PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error(
        'Spreadsheet ID not found. Please set SPREADSHEET_ID in Project Settings > Script Properties.'
      );
    }
    return spreadsheetId;
  }

  static shouldIncludeThreadReplies(): boolean {
    const includeReplies = this.getSettingValue('INCLUDE_THREAD_REPLIES');
    if (includeReplies === null || includeReplies === undefined) {
      throw new Error(
        'Thread replies setting not found. Please set INCLUDE_THREAD_REPLIES in settings sheet.'
      );
    }
    return includeReplies.toLowerCase() === 'true';
  }

  static getLastProcessedYear(): number {
    const year = this.getSettingValue('lastProcessedYear');
    if (!year) {
      throw new Error(
        'Last processed year not found. Please set lastProcessedYear in settings sheet.'
      );
    }
    return Number(year);
  }

  static getLastProcessedMonth(): number {
    const month = this.getSettingValue('lastProcessedMonth');
    if (!month) {
      throw new Error(
        'Last processed month not found. Please set lastProcessedMonth in settings sheet.'
      );
    }
    return Number(month);
  }

  static setLastProcessedDate(year: number, month: number): void {
    const sheet = this.getSettingsSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'lastProcessedYear') {
        sheet.getRange(i + 1, 2).setValue(year);
      } else if (data[i][0] === 'lastProcessedMonth') {
        sheet.getRange(i + 1, 2).setValue(month);
      }
    }
  }
}
