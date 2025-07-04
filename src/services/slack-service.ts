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

import { SlackMessage, SlackResponse } from '@/types/slack';
import { Settings } from '@/config/settings';

export class SlackService {
  private static readonly API_BASE_URL = 'https://slack.com/api';
  private static readonly RATE_LIMIT_DELAY = 3000;

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
    maxRetries = 5
  ): SlackResponse | null {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = UrlFetchApp.fetch(url, options);
        const code = response.getResponseCode();

        if (code === 429) {
          const headers = response.getHeaders() as Record<string, string>;
          const retryAfter = parseInt(headers['Retry-After'] || '5', 10);
          Logger.log(`429 Rate Limited: ${retryAfter}秒待機`);
          Utilities.sleep(retryAfter * 1000);
          continue;
        }

        return JSON.parse(response.getContentText()) as SlackResponse;
      } catch (e) {
        const error = e as Error;
        Logger.log(`Fetch失敗（${i + 1}回目）: ${error.message}`);
        Utilities.sleep(this.RATE_LIMIT_DELAY);
      }
    }

    Logger.log('fetchWithRetry: 最大リトライ超過');
    return null;
  }
}
