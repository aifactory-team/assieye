#!/usr/bin/env node
/**
 * build-channel-index.mjs — 각 채널 디렉토리의 index.json 생성
 * 파일 목록을 최신순으로 정렬하여 저장
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const topicIdx = process.argv.indexOf('--topic');
const TOPIC = topicIdx > -1 && process.argv[topicIdx + 1] ? process.argv[topicIdx + 1] : null;
const DATA_ROOT = join(__dirname, '..', 'data');
const CHANNELS = ['news', 'youtube', 'x', 'instagram', 'facebook', 'tiktok', 'threads'];

// Build for one topic or all topics
const topics = TOPIC ? [TOPIC] : readdirSync(DATA_ROOT).filter(d => {
  try { return existsSync(join(DATA_ROOT, d, 'news')); } catch { return false; }
});

for (const topic of topics) {
  const BASE_DIR = join(DATA_ROOT, topic);
  for (const ch of CHANNELS) {
    const dir = join(BASE_DIR, ch);
    if (!existsSync(dir)) continue;

    const files = readdirSync(dir)
      .filter(f => f.endsWith('.json') && f !== 'index.json')
      .sort()
      .reverse();

    writeFileSync(join(dir, 'index.json'), JSON.stringify(files), 'utf-8');
    if (files.length > 0) {
      console.log(`${topic}/${ch}: ${files.length} files`);
    }
  }
}
