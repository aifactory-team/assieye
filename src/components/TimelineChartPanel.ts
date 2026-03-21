import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';

interface TimelinePoint {
  time: string;
  dead: number;
  injured: number;
  missing: number;
  progress: number;
}

export class TimelineChartPanel extends Panel {
  private topicId = 'daejeon-fire';

  constructor() {
    super({
      id: 'timeline-chart',
      title: '\uD83D\uDCC8 \uC2DC\uAC04\uB300\uBCC4 \uCD94\uC774',
      className: 'timeline-chart-panel',
    });
  }

  setTopicId(id: string): void {
    this.topicId = id;
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const res = await fetch(`/data/${this.topicId}/summary-timeline.json?t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json() as Array<Record<string, unknown>>;
      const hasEventMetrics = data.some(d => d.eventMetrics);
      if (hasEventMetrics) {
        this.renderEventChart(data);
      } else {
        const parsed = this.parseData(data as Array<{ time: string; casualties: string; situation: string }>);
        const hasCasualties = parsed.some(p => p.dead > 0 || p.injured > 0 || p.missing > 0 || p.progress > 0);
        if (hasCasualties) {
          this.render(parsed);
        } else {
          this.renderEventTimeline(data as Array<{ time: string; situation: string; response: string }>);
        }
      }
    } catch { /* ignore */ }
  }

  private parseData(raw: Array<{ time: string; casualties: string; situation: string }>): TimelinePoint[] {
    return raw.map(d => {
      const dead = parseInt(d.casualties?.match(/\uC0AC\uB9DD\s*(\d+)/)?.[1] || '0');
      const injured = parseInt(d.casualties?.match(/\uBD80\uC0C1\s*(\d+)/)?.[1] || '0');
      const missing = parseInt(d.casualties?.match(/\uC2E4\uC885\s*(\d+)/)?.[1] || '0');
      const isComplete = d.situation?.includes('\uC644\uC804 \uC9C4\uC555') || d.situation?.includes('\uC9C4\uD654 \uC644\uB8CC');
      const progress = isComplete ? 100 : parseInt(d.situation?.match(/(\d+)%/)?.[1] || '0');
      return { time: d.time, dead, injured, missing, progress };
    });
  }

  private renderEventTimeline(raw: Array<{ time: string; situation: string; response: string }>): void {
    const items = raw.map(d =>
      h('div', { className: 'tc-event-row' },
        h('span', { className: 'tc-event-time' }, d.time),
        h('div', { className: 'tc-event-detail' },
          h('div', null, d.situation || ''),
          d.response ? h('div', { style: 'color:rgba(255,255,255,0.5);font-size:9px' }, d.response) : null,
        ),
      ),
    );
    replaceChildren(this.contentEl, ...items.filter(Boolean));
  }

  private renderEventChart(raw: Array<Record<string, unknown>>): void {
    const barH = 60;
    type EM = { attendees: number; snsMentions: number; police: number; mediaArticles: number };
    const points = raw.map(d => ({
      time: String(d.time || ''),
      metrics: (d.eventMetrics || { attendees: 0, snsMentions: 0, police: 0, mediaArticles: 0 }) as EM,
    }));

    const maxAttendees = Math.max(...points.map(p => p.metrics.attendees), 1);
    const maxSns = Math.max(...points.map(p => p.metrics.snsMentions), 1);

    // Attendees + SNS chart
    const bars = points.map(p => {
      const aH = (p.metrics.attendees / maxAttendees) * barH;
      const sH = (p.metrics.snsMentions / maxSns) * barH;
      return h('div', { className: 'tc-bar-group' },
        h('div', { className: 'tc-stacked' },
          h('div', { className: 'tc-bar tc-attendees', style: `height:${aH}px`, title: `\uCC38\uAC00\uC790 ${p.metrics.attendees.toLocaleString()}` }),
          h('div', { className: 'tc-bar tc-sns', style: `height:${sH}px`, title: `SNS ${p.metrics.snsMentions.toLocaleString()}` }),
        ),
        h('div', { className: 'tc-time-label' }, p.time),
      );
    });

    const legend = h('div', { className: 'tc-legend' },
      h('span', { className: 'tc-legend-item' }, h('span', { className: 'tc-dot tc-attendees' }), '\uCC38\uAC00\uC790'),
      h('span', { className: 'tc-legend-item' }, h('span', { className: 'tc-dot tc-sns' }), 'SNS \uBA58\uC158'),
    );

    const chart = h('div', { className: 'tc-chart' },
      h('div', { className: 'tc-chart-label' }, '\uCC38\uAC00\uC790 / SNS \uCD94\uC774'),
      h('div', { className: 'tc-bars' }, ...bars),
    );

    replaceChildren(this.contentEl, legend, chart);
  }

  private render(points: TimelinePoint[]): void {
    if (points.length === 0) return;

    // Non-disaster: no casualties data → show event timeline
    const hasCasualties = points.some(p => p.dead > 0 || p.injured > 0 || p.missing > 0 || p.progress > 0);
    if (!hasCasualties) return; // eventTimeline already rendered in load()

    const maxVal = Math.max(...points.map(p => Math.max(p.injured, p.missing, p.dead)), 1);
    const barH = 60; // max bar height in px

    // Progress area chart
    const progressBars = points.map(p => {
      const pct = p.progress;
      return h('div', { className: 'tc-bar-group' },
        h('div', { className: 'tc-progress-bar', style: `height:${(pct / 100) * barH}px` }),
        h('div', { className: 'tc-time-label' }, p.time),
      );
    });

    const progressChart = h('div', { className: 'tc-chart' },
      h('div', { className: 'tc-chart-label' }, '\uC9C4\uD654\uC728'),
      h('div', { className: 'tc-bars' }, ...progressBars),
    );

    // Casualty bars
    const casualtyBars = points.map(p => {
      const dH = (p.dead / maxVal) * barH;
      const iH = (p.injured / maxVal) * barH;
      const mH = (p.missing / maxVal) * barH;
      return h('div', { className: 'tc-bar-group' },
        h('div', { className: 'tc-stacked' },
          h('div', { className: 'tc-bar tc-dead', style: `height:${dH}px`, title: `\uC0AC\uB9DD ${p.dead}` }),
          h('div', { className: 'tc-bar tc-injured', style: `height:${iH}px`, title: `\uBD80\uC0C1 ${p.injured}` }),
          h('div', { className: 'tc-bar tc-missing', style: `height:${mH}px`, title: `\uC2E4\uC885 ${p.missing}` }),
        ),
        h('div', { className: 'tc-time-label' }, p.time),
      );
    });

    const casualtyChart = h('div', { className: 'tc-chart' },
      h('div', { className: 'tc-chart-label' }, '\uC778\uBA85\uD53C\uD574'),
      h('div', { className: 'tc-bars' }, ...casualtyBars),
    );

    // Legend
    const legend = h('div', { className: 'tc-legend' },
      h('span', { className: 'tc-legend-item' }, h('span', { className: 'tc-dot tc-dead' }), '\uC0AC\uB9DD'),
      h('span', { className: 'tc-legend-item' }, h('span', { className: 'tc-dot tc-injured' }), '\uBD80\uC0C1'),
      h('span', { className: 'tc-legend-item' }, h('span', { className: 'tc-dot tc-missing' }), '\uC2E4\uC885'),
      h('span', { className: 'tc-legend-item' }, h('span', { className: 'tc-dot tc-progress-bar' }), '\uC9C4\uD654\uC728'),
    );

    replaceChildren(this.contentEl, legend, casualtyChart, progressChart);
  }
}
