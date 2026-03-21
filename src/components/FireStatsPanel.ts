import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import type { AgentNewsSummary } from '@/types';

export class FireStatsPanel extends Panel {
  constructor() {
    super({
      id: 'fire-stats',
      title: '\uD1B5\uACC4',
      className: 'fire-stats-panel',
    });
  }

  update(summary: AgentNewsSummary): void {
    // Non-disaster topic (e.g. BTS concert) — show event stats
    if (summary.casualties?.includes('\uD574\uB2F9 \uC5C6\uC74C') || !summary.casualties?.match(/\d/)) {
      this.renderEventStats(summary);
      return;
    }

    const isComplete = summary.situation?.includes('\uC644\uC804 \uC9C4\uC555') || summary.situation?.includes('\uC9C4\uD654 \uC644\uB8CC');
    const progress = isComplete ? '100' : (summary.situation?.match(/(\d+)%/)?.[1] || '80');
    const dead = summary.casualties?.match(/\uC0AC\uB9DD\s*(\d+)/)?.[1] || '0';
    const injured = summary.casualties?.match(/\uBD80\uC0C1\s*(\d+)/)?.[1] || '55';
    const serious = summary.casualties?.match(/\uC911\uC0C1\s*(\d+)/)?.[1] || '24';
    const minor = summary.casualties?.match(/\uACBD\uC0C1\s*(\d+)/)?.[1] || '31';
    const missing = summary.casualties?.match(/\uC2E4\uC885\s*(\d+)/)?.[1] || '14';

    const progressBar = h('div', { className: 'stats-progress-wrap' },
      h('div', { className: 'stats-progress-label' }, `\uC9C4\uD654\uC728 ${progress}%`),
      h('div', { className: 'stats-progress-bar' },
        h('div', { className: 'stats-progress-fill', style: `width:${progress}%` }),
      ),
    );

    const cardItems = [];
    if (parseInt(dead) > 0) cardItems.push(this.card('\u2620\uFE0F', '\uC0AC\uB9DD', dead, 'danger'));
    cardItems.push(this.card('\uD83D\uDEA8', '\uBD80\uC0C1', injured, 'danger'));
    cardItems.push(this.card('\uD83C\uDFE5', '\uC911\uC0C1', serious, 'danger'));
    cardItems.push(this.card('\uD83E\uDE79', '\uACBD\uC0C1', minor, 'warn'));
    cardItems.push(this.card('\uD83D\uDD0D', '\uC2E4\uC885', missing, 'danger'));
    const cards = h('div', { className: 'stats-cards' }, ...cardItems);

    const response = h('div', { className: 'stats-response' },
      h('div', { className: 'stats-response-item' }, '\uD83D\uDE92 \uC7A5\uBE44 46\uB300 \xB7 \uC778\uB825 115\uBA85 \xB7 \uBB34\uC778\uB85C\uBD07 2\uB300'),
      h('div', { className: 'stats-response-item' }, '\uD83D\uDCE2 \uAD6D\uAC00\uC18C\uBC29\uB3D9\uC6D0\uB839 13:53 \xB7 \uC911\uC559\uAE34\uAE09\uAD6C\uC870\uD1B5\uC81C\uB2E8 15:30'),
    );

    replaceChildren(this.contentEl, progressBar, cards, response);
  }

  private card(icon: string, label: string, value: string, type: string): HTMLElement {
    return h('div', { className: `stats-card stats-card-${type}` },
      h('div', { className: 'stats-card-icon' }, icon),
      h('div', { className: 'stats-card-value' }, value),
      h('div', { className: 'stats-card-label' }, label),
    );
  }

  private renderEventStats(summary: AgentNewsSummary): void {
    const es = summary.eventStats;

    const cardItems = [];
    if (es?.currentAttendees) cardItems.push(this.card('\uD83D\uDC65', '\uCC38\uAC00\uC790', es.currentAttendees, 'info'));
    if (es?.expectedAttendees) cardItems.push(this.card('\uD83C\uDFAF', '\uC608\uC0C1', es.expectedAttendees, 'info'));
    if (es?.snsMentions) cardItems.push(this.card('\uD83D\uDCF1', 'SNS \uBA58\uC158', es.snsMentions, 'info'));
    if (es?.policeDeployed) cardItems.push(this.card('\uD83D\uDC6E', '\uACBD\uCC30', es.policeDeployed + '\uBA85', 'info'));

    if (cardItems.length === 0) {
      cardItems.push(this.card('\uD83D\uDCCA', '\uC0C1\uD669', '\uB370\uC774\uD130 \uC218\uC9D1 \uC911', 'info'));
    }

    const cards = h('div', { className: 'stats-cards' }, ...cardItems);

    const infoItems: HTMLElement[] = [];
    if (es?.trending) infoItems.push(h('div', { className: 'stats-response-item' }, `\uD83D\uDD25 ${es.trending}`));
    infoItems.push(h('div', { className: 'stats-response-item' }, `\uD83D\uDCCB ${(summary.situation || '').substring(0, 60)}`));
    if (summary.response) infoItems.push(h('div', { className: 'stats-response-item' }, `\uD83D\uDE92 ${summary.response.substring(0, 60)}`));

    const info = h('div', { className: 'stats-response' }, ...infoItems);

    replaceChildren(this.contentEl, cards, info);
  }
}
