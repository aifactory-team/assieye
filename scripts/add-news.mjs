#!/usr/bin/env node
/**
 * add-news.mjs — 에이전트가 뉴스를 data/daejeon-fire/news.json에 추가하는 스크립트
 *
 * 사용법:
 *   node scripts/add-news.mjs --json '<JSON 문자열>'
 *   node scripts/add-news.mjs --json-file /tmp/news-item.json
 *   node scripts/add-news.mjs --title "제목" --link "URL" --source "출처" --description "설명" \
 *     [--severity critical|high|medium|low] [--tags "태그1,태그2"] [--agent-note "분석"]
 *   node scripts/add-news.mjs --update-summary --situation "..." --casualties "..." --response "..." --outlook "..."
 *
 * 여러 건 동시 추가:
 *   node scripts/add-news.mjs --json '[{...}, {...}]'
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', 'data', 'daejeon-fire', 'news.json');
const MAX_ITEMS = 200;

function loadData() {
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    mkdirSync(dirname(DATA_FILE), { recursive: true });
    return {
      meta: {
        topic: 'daejeon-fire-2026-03-20',
        lastUpdated: new Date().toISOString(),
        agentId: 'claude-code',
        updateCount: 0,
        searchQueries: ['대전 화재', '대전 불', '대전 산불', 'Daejeon fire'],
      },
      items: [],
      summary: {
        situation: '모니터링 시작',
        casualties: '확인 중',
        response: '확인 중',
        outlook: '확인 중',
        lastAnalysis: new Date().toISOString(),
      },
    };
  }
}

function saveData(data) {
  data.meta.lastUpdated = new Date().toISOString();
  data.meta.updateCount = (data.meta.updateCount || 0) + 1;

  // 최신순 정렬
  data.items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  // 최대 아이템 수 제한
  if (data.items.length > MAX_ITEMS) {
    data.items = data.items.slice(0, MAX_ITEMS);
  }

  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function makeId(title, link) {
  const hash = (link || title || '').slice(-30).replace(/\W/g, '');
  return `agent-${Date.now()}-${hash}`;
}

function isDuplicate(items, newItem) {
  return items.some((existing) => {
    if (newItem.link && existing.link && newItem.link === existing.link) return true;
    if (newItem.title && existing.title && newItem.title === existing.title) return true;
    return false;
  });
}

function normalizeItem(raw) {
  return {
    id: raw.id || makeId(raw.title, raw.link),
    title: raw.title || '(제목 없음)',
    link: raw.link || '',
    pubDate: raw.pubDate || new Date().toISOString(),
    source: raw.source || '에이전트',
    description: raw.description || '',
    category: raw.category || 'news',
    lang: raw.lang || 'ko',
    severity: raw.severity || 'medium',
    tags: raw.tags || [],
    agentNote: raw.agentNote || '',
  };
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

// --- main ---
const args = parseArgs(process.argv.slice(2));
const data = loadData();

if (args['update-summary']) {
  // 요약 업데이트 모드
  if (args.situation) data.summary.situation = args.situation;
  if (args.casualties) data.summary.casualties = args.casualties;
  if (args.response) data.summary.response = args.response;
  if (args.outlook) data.summary.outlook = args.outlook;
  data.summary.lastAnalysis = new Date().toISOString();
  saveData(data);
  console.log(JSON.stringify({ ok: true, action: 'summary-updated', summary: data.summary }));
  process.exit(0);
}

let newItems = [];

if (args.json) {
  // JSON 문자열로 입력
  const parsed = JSON.parse(args.json);
  newItems = Array.isArray(parsed) ? parsed : [parsed];
} else if (args['json-file']) {
  // JSON 파일로 입력
  const parsed = JSON.parse(readFileSync(args['json-file'], 'utf-8'));
  newItems = Array.isArray(parsed) ? parsed : [parsed];
} else if (args.title) {
  // 개별 인자로 입력
  newItems = [
    {
      title: args.title,
      link: args.link || '',
      source: args.source || '에이전트',
      description: args.description || '',
      severity: args.severity || 'medium',
      tags: args.tags ? args.tags.split(',').map((t) => t.trim()) : [],
      agentNote: args['agent-note'] || '',
      pubDate: args.pubDate || new Date().toISOString(),
      lang: args.lang || 'ko',
      category: args.category || 'news',
    },
  ];
} else {
  console.error(JSON.stringify({ ok: false, error: 'No input. Use --json, --json-file, or --title' }));
  process.exit(1);
}

let added = 0;
let skipped = 0;

for (const raw of newItems) {
  const item = normalizeItem(raw);
  if (isDuplicate(data.items, item)) {
    skipped++;
    continue;
  }
  data.items.push(item);
  added++;
}

saveData(data);

console.log(
  JSON.stringify({
    ok: true,
    added,
    skipped,
    totalItems: data.items.length,
    updateCount: data.meta.updateCount,
  })
);
