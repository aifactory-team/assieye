import { Panel } from './Panel';
import { h, replaceChildren, safeHtml } from '@/utils/dom-utils';
import { t } from '@/services/i18n';
import { generateDailyBrief } from '@/services/ai-summary';
import type { RssFeedItem } from '@/types';

export class AiBriefPanel extends Panel {
  private items: RssFeedItem[] = [];

  constructor() {
    super({
      id: 'ai-brief',
      title: t('panels.aiBrief'),
      infoTooltip: t('panels.aiBrief.tooltip'),
    });

    this.renderInitial();
  }

  private renderInitial(): void {
    const btn = h('button', { className: 'ai-brief-btn' }, t('panels.aiBrief.generate') || '브리핑 생성');
    btn.addEventListener('click', () => void this.handleGenerate());

    replaceChildren(
      this.contentEl,
      h('div', { className: 'ai-brief-actions' }, btn),
      h('div', { className: 'ai-brief-placeholder' }, t('panels.aiBrief.placeholder') || '뉴스 피드가 로드된 후 브리핑을 생성하세요.'),
    );
  }

  setItems(items: RssFeedItem[], autoGenerate = false): void {
    this.items = items;
    if (autoGenerate && items.length > 0) {
      void this.handleGenerate();
    }
  }

  private async handleGenerate(): Promise<void> {
    if (this.items.length === 0) {
      this.showError(t('panels.aiBrief.noItems') || '브리핑을 생성할 뉴스 항목이 없습니다.');
      return;
    }

    this.showLoading();

    try {
      const summary = await generateDailyBrief(this.items);
      this.renderBrief(summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.showError(message);
    }
  }

  private renderBrief(summary: string): void {
    const btn = h('button', { className: 'ai-brief-btn' }, t('panels.aiBrief.regenerate') || '다시 생성');
    btn.addEventListener('click', () => void this.handleGenerate());

    const contentFrag = safeHtml(summary.replace(/\n/g, '<br>'));

    const briefEl = h('div', { className: 'ai-brief-content' });
    briefEl.appendChild(contentFrag);

    replaceChildren(
      this.contentEl,
      h('div', { className: 'ai-brief-actions' }, btn),
      briefEl,
    );
  }
}
