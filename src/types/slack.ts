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
