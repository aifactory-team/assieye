#!/usr/bin/env node
/**
 * collect-all.mjs — 주제별 멀티채널 데이터 수집 통합 스크립트
 *
 * 사용법:
 *   node scripts/collect-all.mjs                      # 모든 주제 수집
 *   node scripts/collect-all.mjs --topic daejeon-fire  # 특정 주제만
 *   node scripts/collect-all.mjs --topic bts-concert
 */

import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOPICS } from './topics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(process.env.HOME, '.claude/skills/cheliped-browser/scripts/cheliped-cli.mjs');
const SAVE_SCRIPT = join(__dirname, 'save-news-item.mjs');

// ── Parse args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const topicArg = args.indexOf('--topic') > -1 ? args[args.indexOf('--topic') + 1] : null;
const topicIds = topicArg ? [topicArg] : Object.keys(TOPICS);

// ── Browser helpers ─────────────────────────────────────────────

function run(session, commands) {
  try {
    const a = session ? ['--session', session, JSON.stringify(commands)] : [JSON.stringify(commands)];
    const out = execFileSync('node', [CLI, ...a], { timeout: 25000, stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(out.toString());
  } catch { return null; }
}

function gotoAndExtract(session, url, js) {
  const result = run(session, [{ cmd: 'goto', args: [url] }, { cmd: 'run-js', args: [js] }]);
  if (!result?.[1]?.result?.result) return [];
  try { return JSON.parse(result[1].result.result); } catch { return []; }
}

// ── Link cleanup ────────────────────────────────────────────────

function cleanYoutubeLink(link) {
  if (!link) return link;
  const shorts = link.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shorts) return `https://www.youtube.com/shorts/${shorts[1]}`;
  const watch = link.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watch) return `https://www.youtube.com/watch?v=${watch[1]}`;
  return link;
}

function cleanYoutubeTitle(title) {
  if (!title) return title;
  return title.replace(/^\s*[\d:]+\s*[\d:]*\s*(지금 재생 중)?\s*/g, '').trim();
}

// ── Generic collectors (topic-aware) ────────────────────────────

function buildKeywordFilter(keywords) {
  return keywords.map(k => `t.indexOf("${k}")>-1`).join('||');
}

function collectGoogleNews(topic) {
  const cfg = TOPICS[topic];
  const rssUrl = `https://news.google.com/rss/search?q=${cfg.googleNewsQuery}&hl=ko&gl=KR&ceid=KR:ko`;
  try {
    const rssResult = run(`${topic}-grss`, [
      { cmd: 'goto', args: [rssUrl] },
      { cmd: 'run-js', args: [`
        var items=[]; var text=document.body?.innerText||"";
        var re=/<item>([\\s\\S]*?)<\\/item>/g; var m;
        while((m=re.exec(text))!==null){
          var tM=m[1].match(/<title>([^<]+)<\\/title>/);
          var lM=m[1].match(/<link>([^<]+)<\\/link>/);
          var dM=m[1].match(/<pubDate>([^<]+)<\\/pubDate>/);
          var sM=m[1].match(/<source[^>]*>([^<]+)<\\/source>/);
          if(tM&&lM) items.push({title:tM[1].trim(),link:lM[1].trim(),pubDate:dM?dM[1].trim():"",source:sM?sM[1].trim():""});
        } JSON.stringify(items);
      `] },
    ]);
    const rssItems = rssResult?.[1]?.result?.result ? JSON.parse(rssResult[1].result.result) : [];
    if (rssItems.length > 0) {
      return rssItems.map(i => ({ ...i, source: i.source || '구글뉴스', sourceType: 'news', tags: [cfg.name, '뉴스'] }));
    }
  } catch {}

  // Fallback: Google Search
  const kf = buildKeywordFilter(cfg.keywords);
  const js = `var r=[];var seen={};var all=document.querySelectorAll("a[href]");for(var i=0;i<all.length;i++){var a=all[i];var t=a.textContent.trim();var h=a.href;if(t.length>15&&h.indexOf("google")===-1&&h.indexOf("javascript")===-1&&!seen[h]&&(${kf})){seen[h]=1;r.push({title:t.substring(0,120),link:h});}}JSON.stringify(r)`;
  const items = gotoAndExtract(`${topic}-gnews`,
    `https://www.google.com/search?q=${cfg.googleNewsQuery}&tbm=nws&tbs=qdr:d`, js);
  return items.map(i => ({ ...i, source: '구글뉴스', sourceType: 'news', tags: [cfg.name, '뉴스'] }));
}

function collectNaverNews(topic) {
  const cfg = TOPICS[topic];
  const kf = buildKeywordFilter(cfg.keywords);
  const js = `var r=[];var seen={};var all=document.querySelectorAll("a");for(var i=0;i<all.length;i++){var a=all[i];var t=a.textContent.trim();var h=a.getAttribute("href")||"";if(t.length>15&&h.length>10&&h.indexOf("search.naver")===-1&&h.indexOf("javascript")===-1&&h.indexOf("help.naver")===-1&&h.indexOf("nid.naver")===-1&&!seen[h]&&(${kf})){seen[h]=1;var img=a.closest(".news_area,.bx")?.querySelector("img");r.push({title:t.substring(0,120),link:h,imageUrl:img?img.src:""});}}JSON.stringify(r)`;
  const items = gotoAndExtract(`${topic}-nnews`,
    `https://search.naver.com/search.naver?where=news&query=${cfg.naverNewsQuery}&sort=1`, js);
  return items.map(i => ({ ...i, source: '네이버뉴스', sourceType: 'news', tags: [cfg.name, '뉴스'] }));
}

function collectNaverView(topic) {
  const cfg = TOPICS[topic];
  const kf = buildKeywordFilter(cfg.keywords);
  const js = `var r=[];var seen={};var all=document.querySelectorAll("a");for(var i=0;i<all.length;i++){var a=all[i];var t=a.textContent.trim();var h=a.getAttribute("href")||"";if(t.length>15&&h.length>10&&h.indexOf("search.naver")===-1&&h.indexOf("javascript")===-1&&!seen[h]&&(h.indexOf("blog")>-1||h.indexOf("cafe")>-1||h.indexOf("tistory")>-1)&&(${kf})){seen[h]=1;var img=a.closest(".total_wrap,.api_txt_lines")?.querySelector("img");r.push({title:t.substring(0,120),link:h,imageUrl:img?img.src:""});}}JSON.stringify(r)`;
  const items = gotoAndExtract(`${topic}-view`,
    `https://search.naver.com/search.naver?where=view&query=${cfg.naverNewsQuery}&sort=1`, js);
  return items.map(i => ({ ...i, source: '네이버VIEW', sourceType: 'sns', tags: [cfg.name, '블로그'] }));
}

function collectYouTube(topic) {
  const cfg = TOPICS[topic];
  const js = `var r=[];var seen={};var all=document.querySelectorAll("a");for(var i=0;i<all.length;i++){var a=all[i];var t=a.textContent.trim();var h=a.href;if(t.length>10&&(h.indexOf("/watch?")>-1||h.indexOf("/shorts/")>-1)&&!seen[h]){seen[h]=1;var id=h.match(/(?:watch\\?v=|shorts\\/)([a-zA-Z0-9_-]{11})/);var thumb=id?"https://i.ytimg.com/vi/"+id[1]+"/mqdefault.jpg":"";r.push({title:t,link:h,thumbnailUrl:thumb});}}JSON.stringify(r)`;
  const items = gotoAndExtract(`${topic}-yt`,
    `https://www.youtube.com/results?search_query=${cfg.youtubeQuery}&sp=CAI%253D`, js);
  return items
    .map(i => ({ ...i, title: cleanYoutubeTitle(i.title), link: cleanYoutubeLink(i.link) }))
    .filter(i => i.title.length > 5)
    .map(i => ({ ...i, source: 'YouTube', sourceType: 'youtube', tags: [cfg.name, '유튜브'] }));
}

function collectYouTubeShorts(topic) {
  const cfg = TOPICS[topic];
  const js = `var r=[];var seen={};var all=document.querySelectorAll("a");for(var i=0;i<all.length;i++){var a=all[i];var t=a.textContent.trim();var h=a.href;if(t.length>10&&h.indexOf("/shorts/")>-1&&!seen[h]){seen[h]=1;var id=h.match(/shorts\\/([a-zA-Z0-9_-]{11})/);var thumb=id?"https://i.ytimg.com/vi/"+id[1]+"/mqdefault.jpg":"";r.push({title:t,link:h,thumbnailUrl:thumb});}}JSON.stringify(r)`;
  const items = gotoAndExtract(`${topic}-ytshorts`,
    `https://www.youtube.com/results?search_query=${cfg.youtubeQuery}&sp=EgIYAQ%253D%253D`, js);
  return items
    .map(i => ({ ...i, title: cleanYoutubeTitle(i.title), link: cleanYoutubeLink(i.link) }))
    .filter(i => i.title.length > 5)
    .map(i => ({ ...i, source: 'YouTube Shorts', sourceType: 'youtube', tags: [cfg.name, '쇼츠'] }));
}

function collectSNSviaGoogle(topic, platform, siteDomain, sourceType, tag) {
  const cfg = TOPICS[topic];
  const extractJS = `var r=[];var seen={};var all=document.querySelectorAll("a[href]");for(var i=0;i<all.length;i++){var a=all[i];var h=a.href;var t=a.textContent.trim();if(t.length>10&&h.indexOf("${siteDomain}")>-1&&h.indexOf("google")===-1&&!seen[h]){seen[h]=1;r.push({title:t.substring(0,120),link:h});}}JSON.stringify(r)`;

  let allItems = [];
  const seen = new Set();
  const queries = cfg.snsQueries.slice(0, 3);

  for (const q of queries) {
    const query = encodeURIComponent(`${q} site:${siteDomain}`);
    const items = gotoAndExtract(`${topic}-${sourceType}`,
      `https://www.google.com/search?q=${query}&tbs=qdr:w&num=20`, extractJS);
    for (const item of items) {
      if (!seen.has(item.link)) { seen.add(item.link); allItems.push(item); }
    }
  }

  return allItems.map(i => ({ ...i, source: platform, sourceType, tags: [cfg.name, tag] }));
}

// ── Main ────────────────────────────────────────────────────────

const allResults = {};

for (const topic of topicIds) {
  if (!TOPICS[topic]) { console.error(`Unknown topic: ${topic}`); continue; }

  const cfg = TOPICS[topic];
  const collectors = [
    { name: 'Google News', fn: () => collectGoogleNews(topic) },
    { name: 'Naver News', fn: () => collectNaverNews(topic) },
    { name: 'Naver VIEW', fn: () => collectNaverView(topic) },
    { name: 'YouTube', fn: () => collectYouTube(topic) },
    { name: 'YouTube Shorts', fn: () => collectYouTubeShorts(topic) },
    { name: 'X', fn: () => collectSNSviaGoogle(topic, 'X', 'x.com', 'x', 'X') },
    { name: 'TikTok', fn: () => collectSNSviaGoogle(topic, 'TikTok', 'tiktok.com', 'tiktok', '틱톡') },
    { name: 'Instagram', fn: () => collectSNSviaGoogle(topic, 'Instagram', 'instagram.com', 'instagram', '인스타') },
    { name: 'Facebook', fn: () => collectSNSviaGoogle(topic, 'Facebook', 'facebook.com', 'facebook', '페이스북') },
    { name: 'Threads', fn: () => collectSNSviaGoogle(topic, 'Threads', 'threads.net', 'threads', '스레드') },
  ];

  let topicItems = [];
  const stats = {};

  for (const { name, fn } of collectors) {
    try {
      const items = fn();
      stats[name] = items.length;
      topicItems = topicItems.concat(items);
    } catch { stats[name] = 0; }
  }

  // Save via save-news-item.mjs with --topic
  const tmpFile = `/tmp/collect-${topic}.json`;
  writeFileSync(tmpFile, JSON.stringify(topicItems));

  try {
    const result = execFileSync('node', [SAVE_SCRIPT, '--topic', topic, '--json-file', tmpFile], {
      timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'],
    });
    const saved = JSON.parse(result.toString());
    allResults[topic] = { ...saved, sources: stats };
  } catch (e) {
    allResults[topic] = { ok: false, error: e.message, sources: stats };
  }
}

console.log(JSON.stringify(allResults));
