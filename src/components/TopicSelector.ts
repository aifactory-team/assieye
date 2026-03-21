import { h } from '@/utils/dom-utils';
import type { TopicConfig } from '@/config/topics/types';

export class TopicSelector {
  private el: HTMLElement;
  private dropdownEl: HTMLElement | null = null;
  private isOpen = false;
  private activeTopic: TopicConfig;
  private topics: TopicConfig[];
  private onSelect: (topicId: string) => void;
  private onAddNew: () => void;
  private onManage: () => void;
  private buttonEl: HTMLElement;
  private outsideClickHandler: (e: MouseEvent) => void;

  constructor(options: {
    topics: TopicConfig[];
    activeTopic: TopicConfig;
    onSelect: (topicId: string) => void;
    onAddNew: () => void;
    onManage: () => void;
  }) {
    this.topics = options.topics;
    this.activeTopic = options.activeTopic;
    this.onSelect = options.onSelect;
    this.onAddNew = options.onAddNew;
    this.onManage = options.onManage;

    this.buttonEl = this.renderButton();
    this.el = h('div', { className: 'topic-selector' }, this.buttonEl);

    this.outsideClickHandler = (e: MouseEvent) => {
      if (!this.el.contains(e.target as Node)) this.close();
    };
    document.addEventListener('click', this.outsideClickHandler);
  }

  private renderButton(): HTMLElement {
    const btn = h(
      'button',
      {
        className: 'topic-selector__btn',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: 'rgba(var(--accent-rgb), 0.12)',
          border: '1px solid rgba(var(--accent-rgb), 0.3)',
          borderRadius: '4px',
          color: 'var(--accent)',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: '600',
          padding: '2px 7px',
          whiteSpace: 'nowrap',
        },
      },
      h('span', { className: 'topic-selector__icon' }, this.activeTopic.icon),
      h('span', { className: 'topic-selector__name' }, this.activeTopic.name),
      h('span', { style: { fontSize: '0.6rem', opacity: '0.7' } }, '▾'),
    );
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    return btn;
  }

  private renderDropdown(): HTMLElement {
    const items = this.topics.map((topic) => {
      const isActive = topic.id === this.activeTopic.id;
      const item = h(
        'div',
        {
          className: 'topic-selector__item',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '6px 10px',
            cursor: 'pointer',
            borderRadius: '3px',
            fontSize: '0.8rem',
            color: isActive ? 'var(--accent)' : 'var(--text-primary)',
            background: isActive ? 'rgba(var(--accent-rgb), 0.12)' : 'transparent',
          },
        },
        h('span', { style: { fontSize: '1rem', lineHeight: '1' } }, topic.icon),
        h('span', { style: { flex: '1' } }, topic.name),
        isActive ? h('span', { style: { color: 'var(--accent)', fontWeight: '700' } }, '✓') : h('span'),
      );
      item.addEventListener('mouseenter', () => {
        if (!isActive) item.style.background = 'rgba(var(--accent-rgb), 0.08)';
      });
      item.addEventListener('mouseleave', () => {
        if (!isActive) item.style.background = 'transparent';
      });
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onSelect(topic.id);
        this.close();
      });
      return item;
    });

    const separator = h('div', {
      style: {
        height: '1px',
        background: 'var(--panel-border)',
        margin: '4px 0',
      },
    });

    const addBtn = h(
      'div',
      {
        className: 'topic-selector__action',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '6px 10px',
          cursor: 'pointer',
          borderRadius: '3px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        },
      },
      '➕ 새 주제 추가...',
    );
    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.background = 'rgba(var(--accent-rgb), 0.08)';
      addBtn.style.color = 'var(--accent)';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.background = 'transparent';
      addBtn.style.color = 'var(--text-secondary)';
    });
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAddNew();
      this.close();
    });

    const manageBtn = h(
      'div',
      {
        className: 'topic-selector__action',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '6px 10px',
          cursor: 'pointer',
          borderRadius: '3px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        },
      },
      '⚙️ 주제 관리...',
    );
    manageBtn.addEventListener('mouseenter', () => {
      manageBtn.style.background = 'rgba(var(--accent-rgb), 0.08)';
      manageBtn.style.color = 'var(--accent)';
    });
    manageBtn.addEventListener('mouseleave', () => {
      manageBtn.style.background = 'transparent';
      manageBtn.style.color = 'var(--text-secondary)';
    });
    manageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onManage();
      this.close();
    });

    const dropdown = h(
      'div',
      {
        className: 'topic-selector__dropdown',
        style: {
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: '0',
          minWidth: '200px',
          background: 'var(--popup-bg)',
          border: '1px solid var(--panel-border)',
          borderRadius: '6px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: '1000',
          padding: '4px',
          maxHeight: '320px',
          overflowY: 'auto',
        },
      },
      ...items,
      separator,
      addBtn,
      manageBtn,
    );

    return dropdown;
  }

  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.dropdownEl = this.renderDropdown();
    this.el.appendChild(this.dropdownEl);
    this.buttonEl.style.background = 'rgba(var(--accent-rgb), 0.2)';
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.dropdownEl) {
      this.dropdownEl.remove();
      this.dropdownEl = null;
    }
    this.buttonEl.style.background = 'rgba(var(--accent-rgb), 0.12)';
  }

  update(topics: TopicConfig[], activeTopic: TopicConfig): void {
    this.topics = topics;
    this.activeTopic = activeTopic;

    // Update button text
    const iconEl = this.buttonEl.querySelector('.topic-selector__icon');
    const nameEl = this.buttonEl.querySelector('.topic-selector__name');
    if (iconEl) iconEl.textContent = activeTopic.icon;
    if (nameEl) nameEl.textContent = activeTopic.name;

    // Re-render dropdown if open
    if (this.isOpen && this.dropdownEl) {
      this.dropdownEl.remove();
      this.dropdownEl = this.renderDropdown();
      this.el.appendChild(this.dropdownEl);
    }
  }

  getElement(): HTMLElement {
    return this.el;
  }

  destroy(): void {
    document.removeEventListener('click', this.outsideClickHandler);
    this.el.remove();
  }
}
