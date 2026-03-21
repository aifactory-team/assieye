import { h } from '@/utils/dom-utils';
import { Panel } from './Panel';

export class ComingSoonPanel extends Panel {
  constructor(title: string, panelType: string) {
    super({ id: `coming-soon-${panelType}`, title });

    this.setContent(
      h('div', {
        className: 'coming-soon-panel',
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          gap: '8px',
          opacity: '0.6',
        },
      },
        h('span', { style: { fontSize: '1.5rem' } }, '🚧'),
        h('span', { style: { fontSize: '0.8rem', color: 'var(--text-secondary)' } }, '준비 중'),
        h('span', { style: { fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: '0.6' } }, panelType),
      ),
    );
  }
}
