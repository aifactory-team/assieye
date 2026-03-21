#!/usr/bin/env node
/**
 * save-news-item.mjs — 뉴스 1건을 채널별 디렉토리에 개별 파일로 저장 (중복 시 스킵)
 *
 * 채널 디렉토리: data/daejeon-fire/{news,youtube,x,instagram,facebook,tiktok,threads}/
 *
 * 사용법:
 *   node scripts/save-news-item.mjs --json '[{...}, {...}]'
 *   node scripts/save-news-item.mjs --json-file /tmp/items.json
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --topic 파라미터로 주제별 디렉토리 지정 (기본: daejeon-fire)
const topicIdx = process.argv.indexOf('--topic');
const TOPIC = topicIdx > -1 && process.argv[topicIdx + 1] ? process.argv[topicIdx + 1] : 'daejeon-fire';
const BASE_DIR = join(__dirname, '..', 'data', TOPIC);

const CHANNELS = ['news', 'youtube', 'x', 'instagram', 'facebook', 'tiktok', 'threads'];

// sourceType → channel directory mapping
const SOURCE_TO_CHANNEL = {
  news: 'news',
  youtube: 'youtube',
  twitter: 'x',
  x: 'x',
  instagram: 'instagram',
  facebook: 'facebook',
  tiktok: 'tiktok',
  threads: 'threads',
  sns: 'news', // 블로그/카페 → news
};

// Ensure all channel dirs exist
for (const ch of CHANNELS) {
  mkdirSync(join(BASE_DIR, ch), { recursive: true });
}

function hash(str) {
  return createHash('md5').update(str).digest('hex').slice(0, 12);
}

function loadExistingAll() {
  const titles = new Set();
  const links = new Set();
  for (const ch of CHANNELS) {
    const dir = join(BASE_DIR, ch);
    try {
      for (const f of readdirSync(dir)) {
        if (!f.endsWith('.json')) continue;
        try {
          const item = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
          if (item.title) titles.add(item.title);
          if (item.link) links.add(item.link);
        } catch {}
      }
    } catch {}
  }
  return { titles, links };
}

function isDuplicate(existing, item) {
  if (item.link && existing.links.has(item.link)) return true;
  if (item.title && existing.titles.has(item.title)) return true;
  return false;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
let items = [];

if (args.json) {
  const parsed = JSON.parse(args.json);
  items = Array.isArray(parsed) ? parsed : [parsed];
} else if (args['json-file']) {
  const parsed = JSON.parse(readFileSync(args['json-file'], 'utf-8'));
  items = Array.isArray(parsed) ? parsed : [parsed];
} else {
  console.error(JSON.stringify({ ok: false, error: 'Use --json or --json-file' }));
  process.exit(1);
}

const existing = loadExistingAll();
let added = 0;
let skipped = 0;
const channelCounts = {};

for (const raw of items) {
  const sourceType = raw.sourceType || 'news';
  const channel = SOURCE_TO_CHANNEL[sourceType] || 'news';

  const item = {
    title: raw.title || '(제목 없음)',
    link: raw.link || '',
    pubDate: raw.pubDate || new Date().toISOString(),
    source: raw.source || '',
    sourceType,
    description: raw.description || '',
    severity: raw.severity || 'medium',
    tags: raw.tags || [],
    imageUrl: raw.imageUrl || '',
    thumbnailUrl: raw.thumbnailUrl || '',
    collectedAt: new Date().toISOString(),
  };

  if (isDuplicate(existing, item)) {
    skipped++;
    continue;
  }

  const id = hash(item.link || item.title);
  const datePrefix = new Date().toISOString().slice(0, 10);
  const filename = `${datePrefix}-${id}.json`;

  writeFileSync(join(BASE_DIR, channel, filename), JSON.stringify(item, null, 2), 'utf-8');
  existing.titles.add(item.title);
  if (item.link) existing.links.add(item.link);
  added++;
  channelCounts[channel] = (channelCounts[channel] || 0) + 1;
}

// Auto-rebuild channel indexes after saving
import { execFileSync } from 'node:child_process';
try {
  execFileSync('node', [join(__dirname, 'build-channel-index.mjs')], { stdio: 'ignore' });
} catch {}

console.log(JSON.stringify({ ok: true, added, skipped, total: existing.titles.size, channels: channelCounts }));
