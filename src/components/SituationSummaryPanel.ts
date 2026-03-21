import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import { escapeHtml } from '@/utils/format';
import type { AgentNewsSummary } from '@/types';

interface TimelineSummary {
  time: string;
  situation: string;
  casualties: string;
  response: string;
  outlook: string;
}

export class SituationSummaryPanel extends Panel {
  private latestSummary: AgentNewsSummary | null = null;
  private timeline: TimelineSummary[] = [];
  private activeIndex = -1; // -1 = latest
  private topicId = 'daejeon-fire';

  constructor() {
    super({
      id: 'situation-summary',
      title: '\uD83D\uDCCB \uC0C1\uD669 \uC694\uC57D',
      className: 'situation-summary-panel',
    });
    this.loadTimeline();
  }

  setTopicId(id: string): void {
    this.topicId = id;
    this.timeline = [];
    this.activeIndex = -1;
    void this.loadTimeline();
  }

  private async loadTimeline(): Promise<void> {
    try {
      const res = await fetch(`/data/${this.topicId}/summary-timeline.json?t=${Date.now()}`);
      if (res.ok) this.timeline = await res.json();
    } catch { /* ignore */ }
  }

  update(summary: AgentNewsSummary): void {
    this.latestSummary = summary;
    this.render();
  }

  private render(): void {
    const tabs = this.buildTabs();
    const content = this.buildContent();
    replaceChildren(this.contentEl, tabs, content);
  }

  private buildTabs(): HTMLElement {
    const items: { label: string; idx: number }[] = [];

    for (let i = 0; i < this.timeline.length; i++) {
      items.push({ label: this.timeline[i]!.time, idx: i });
    }
    items.push({ label: '\uCD5C\uC2E0', idx: -1 }); // 최신

    return h('div', { className: 'summary-tabs' },
      ...items.map(({ label, idx }) => {
        const btn = h('button', {
          className: `summary-tab${idx === this.activeIndex ? ' active' : ''}`,
        }, label);
        btn.addEventListener('click', () => {
          this.activeIndex = idx;
          this.render();
        });
        return btn;
      }),
    );
  }

  private buildContent(): HTMLElement {
    let data: { situation: string; casualties: string; response: string; outlook: string };

    if (this.activeIndex >= 0 && this.activeIndex < this.timeline.length) {
      data = this.timeline[this.activeIndex]!;
    } else if (this.latestSummary) {
      data = this.latestSummary;
    } else {
      return h('div', { className: 'agent-news-empty' }, '\uB370\uC774\uD130 \uB300\uAE30 \uC911...');
    }

    const rows = [
      { label: '\uC0C1\uD669', value: data.situation, cls: '' },
      { label: '\uD83D\uDEA8 \uC778\uBA85', value: data.casualties, cls: 'stat-casualties' },
      { label: '\uB300\uC751', value: data.response, cls: '' },
      { label: '\uC804\uB9DD', value: data.outlook, cls: '' },
    ];

    return h('div', { className: 'summary-content' },
      ...rows.map(r =>
        h('div', { className: 'agent-news-summary-row' },
          h('span', { className: `agent-news-summary-label ${r.cls}` }, r.label),
          h('span', { className: r.cls || undefined }, escapeHtml(r.value)),
        ),
      ),
    );
  }
}
