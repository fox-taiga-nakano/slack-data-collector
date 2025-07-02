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
    const includeReplies = PropertiesService.getScriptProperties().getProperty(
      'INCLUDE_THREAD_REPLIES'
    );
    if (includeReplies === null || includeReplies === undefined) {
      throw new Error(
        'Thread replies setting not found. Please set INCLUDE_THREAD_REPLIES in Project Settings > Script Properties.'
      );
    }
    return includeReplies.toLowerCase() === 'true';
  }
}
