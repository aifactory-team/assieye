import { h } from '@/utils/dom-utils';
import type { TopicConfig, TopicTheme } from '@/config/topics/types';

type ColorPresetKey = 'green' | 'red' | 'blue' | 'gold' | 'purple' | 'teal';

export class TopicEditorModal {
  private el: HTMLElement;
  private onSave: (topic: TopicConfig) => void;
  private onCancel: () => void;
  private editingTopic: TopicConfig | null;
  private selectedPreset: ColorPresetKey = 'green';
  private customHex = '';

  private static COLOR_PRESETS: Record<ColorPresetKey, TopicTheme> = {
    green: {
      accent: '#00cc66',
      accentRgb: '0,204,102',
      headerTint: 'rgba(13,32,13,0.8)',
      panelBorder: 'rgba(42,74,42,0.7)',
      panelBg: 'rgba(26,58,26,0.85)',
      markerPrimary: '#ff3300',
      markerSecondary: '#ff8800',
      badgeBg: 'rgba(0,204,102,0.2)',
    },
    red: {
      accent: '#ff3333',
      accentRgb: '255,51,51',
      headerTint: 'rgba(32,13,13,0.8)',
      panelBorder: 'rgba(74,42,42,0.7)',
      panelBg: 'rgba(58,26,26,0.85)',
      markerPrimary: '#ff3333',
      markerSecondary: '#ff8800',
      badgeBg: 'rgba(255,51,51,0.2)',
    },
    blue: {
      accent: '#3399ff',
      accentRgb: '51,153,255',
      headerTint: 'rgba(13,20,32,0.8)',
      panelBorder: 'rgba(42,58,74,0.7)',
      panelBg: 'rgba(26,38,58,0.85)',
      markerPrimary: '#3399ff',
      markerSecondary: '#ff4444',
      badgeBg: 'rgba(51,153,255,0.2)',
    },
    gold: {
      accent: '#ffaa00',
      accentRgb: '255,170,0',
      headerTint: 'rgba(32,26,13,0.8)',
      panelBorder: 'rgba(74,64,42,0.7)',
      panelBg: 'rgba(58,48,26,0.85)',
      markerPrimary: '#ffaa00',
      markerSecondary: '#ff6644',
      badgeBg: 'rgba(255,170,0,0.2)',
    },
    purple: {
      accent: '#aa66ff',
      accentRgb: '170,102,255',
      headerTint: 'rgba(26,13,32,0.8)',
      panelBorder: 'rgba(64,42,74,0.7)',
      panelBg: 'rgba(48,26,58,0.85)',
      markerPrimary: '#aa66ff',
      markerSecondary: '#ff66aa',
      badgeBg: 'rgba(170,102,255,0.2)',
    },
    teal: {
      accent: '#00ccaa',
      accentRgb: '0,204,170',
      headerTint: 'rgba(13,28,26,0.8)',
      panelBorder: 'rgba(42,74,68,0.7)',
      panelBg: 'rgba(26,52,48,0.85)',
      markerPrimary: '#00ccaa',
      markerSecondary: '#ff6644',
      badgeBg: 'rgba(0,204,170,0.2)',
    },
  };

  // Form field references
  private fields: {
    name?: HTMLInputElement;
    icon?: HTMLInputElement;
    description?: HTMLInputElement;
    lat?: HTMLInputElement;
    lng?: HTMLInputElement;
    zoom?: HTMLInputElement;
    customHex?: HTMLInputElement;
    newsKo?: HTMLInputElement;
    newsEn?: HTMLInputElement;
    youtube?: HTMLInputElement;
    aiPrompt?: HTMLTextAreaElement;
    keywords?: HTMLInputElement;
  } = {};

  constructor(options: {
    existingTopic?: TopicConfig;
    onSave: (topic: TopicConfig) => void;
    onCancel: () => void;
  }) {
    this.editingTopic = options.existingTopic ?? null;
    this.onSave = options.onSave;
    this.onCancel = options.onCancel;

    if (this.editingTopic) {
      // Determine initial preset from accent color
      const accent = this.editingTopic.theme.accent;
      const match = (Object.entries(TopicEditorModal.COLOR_PRESETS) as [ColorPresetKey, TopicTheme][]).find(
        ([, theme]) => theme.accent === accent,
      );
      this.selectedPreset = match ? match[0] : 'green';
      this.customHex = match ? '' : accent;
    }

    this.el = this.render();
  }

  private inputStyle(): Partial<CSSStyleDeclaration> {
    return {
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid var(--panel-border)',
      borderRadius: '4px',
      color: 'var(--text-primary)',
      fontSize: '0.8rem',
      padding: '5px 8px',
      width: '100%',
      outline: 'none',
    };
  }

  private labelStyle(): Partial<CSSStyleDeclaration> {
    return {
      display: 'block',
      fontSize: '0.72rem',
      color: 'var(--text-secondary)',
      marginBottom: '3px',
    };
  }

  private fieldGroup(label: string, input: HTMLElement): HTMLElement {
    return h('div', { style: { marginBottom: '10px' } },
      h('label', { style: this.labelStyle() }, label),
      input,
    );
  }

  private makeInput(
    type: string,
    placeholder: string,
    value: string,
    ref?: keyof TopicEditorModal['fields'],
  ): HTMLInputElement {
    const inp = document.createElement('input');
    inp.type = type;
    inp.placeholder = placeholder;
    inp.value = value;
    Object.assign(inp.style, this.inputStyle());
    if (ref) (this.fields as Record<string, HTMLInputElement>)[ref] = inp;
    return inp;
  }

  private makeTextarea(placeholder: string, value: string): HTMLTextAreaElement {
    const ta = document.createElement('textarea');
    ta.placeholder = placeholder;
    ta.value = value;
    ta.rows = 3;
    Object.assign(ta.style, {
      ...this.inputStyle(),
      resize: 'vertical',
      fontFamily: 'inherit',
    });
    this.fields.aiPrompt = ta;
    return ta;
  }

  private renderColorPresets(): HTMLElement {
    const presetColors: Record<ColorPresetKey, string> = {
      green: '#00cc66',
      red: '#ff3333',
      blue: '#3399ff',
      gold: '#ffaa00',
      purple: '#aa66ff',
      teal: '#00ccaa',
    };
    const presetLabels: Record<ColorPresetKey, string> = {
      green: '초록',
      red: '빨강',
      blue: '파랑',
      gold: '금색',
      purple: '보라',
      teal: '청록',
    };

    const presetContainer = h('div', {
      style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' },
    });

    const btns: Map<ColorPresetKey, HTMLButtonElement> = new Map();

    for (const [key, color] of Object.entries(presetColors) as [ColorPresetKey, string][]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = presetLabels[key];
      const isActive = key === this.selectedPreset && !this.customHex;
      Object.assign(btn.style, {
        background: isActive ? color : 'rgba(0,0,0,0.3)',
        border: `2px solid ${color}`,
        borderRadius: '4px',
        color: isActive ? '#000' : color,
        cursor: 'pointer',
        fontSize: '0.72rem',
        fontWeight: '600',
        padding: '3px 9px',
        transition: 'all 0.15s',
      });
      btn.addEventListener('click', () => {
        this.selectedPreset = key;
        this.customHex = '';
        if (this.fields.customHex) this.fields.customHex.value = '';
        // Update all button styles
        for (const [k, b] of btns) {
          const c = presetColors[k];
          const active = k === key;
          b.style.background = active ? c : 'rgba(0,0,0,0.3)';
          b.style.color = active ? '#000' : c;
        }
      });
      btns.set(key, btn);
      presetContainer.appendChild(btn);
    }

    const customHexInput = this.makeInput('text', '#rrggbb 직접 입력', this.customHex, 'customHex');
    customHexInput.style.width = '140px';
    customHexInput.addEventListener('input', () => {
      this.customHex = customHexInput.value;
      if (this.customHex) {
        // Deselect all preset buttons
        for (const [k, b] of btns) {
          const c = presetColors[k];
          b.style.background = 'rgba(0,0,0,0.3)';
          b.style.color = c;
        }
      }
    });

    return h('div', null,
      h('label', { style: this.labelStyle() }, '테마 색상 프리셋'),
      presetContainer,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
        h('span', { style: { fontSize: '0.72rem', color: 'var(--text-secondary)' } }, '또는 커스텀 HEX:'),
        customHexInput,
      ),
    );
  }

  private render(): HTMLElement {
    const t = this.editingTopic;
    const map = t?.map ?? { center: { lat: 37.5, lng: 127.0 }, zoom: 7, globeAltitude: 1.5 };
    const feeds = t?.feeds ?? [];
    const koFeed = feeds.find(f => f.lang === 'ko');
    const enFeed = feeds.find(f => f.lang === 'en');

    const nameInput = this.makeInput('text', '예: 이란 전쟁', t?.name ?? '', 'name');
    const iconInput = this.makeInput('text', '예: 🌲', t?.icon ?? '', 'icon');
    iconInput.style.width = '80px';
    const descInput = this.makeInput('text', '주제에 대한 간단한 설명', t?.description ?? '', 'description');
    const latInput = this.makeInput('number', '위도', String(map.center.lat), 'lat');
    const lngInput = this.makeInput('number', '경도', String(map.center.lng), 'lng');
    const zoomInput = this.makeInput('number', '줌', String(map.zoom), 'zoom');

    // Extract keyword from Google News RSS URL or use raw
    const extractKeyword = (url: string): string => {
      try {
        const u = new URL(url);
        return u.searchParams.get('q') ?? url;
      } catch {
        return url;
      }
    };
    const koKeyword = koFeed ? extractKeyword(koFeed.url) : '';
    const enKeyword = enFeed ? extractKeyword(enFeed.url) : '';

    const newsKoInput = this.makeInput('text', '예: 이란 AND 전쟁', koKeyword, 'newsKo');
    const newsEnInput = this.makeInput('text', '예: korea wildfire', enKeyword, 'newsEn');
    const youtubeInput = this.makeInput(
      'text',
      '예: iran war live',
      t?.youtube?.liveSearchQuery ?? '',
      'youtube',
    );

    const keywordsInput = this.makeInput(
      'text',
      '예: 미사일, 공습, 원유, 증시',
      t?.aiBriefing?.focusKeywords?.join(', ') ?? '',
      'keywords',
    );
    const aiTextarea = this.makeTextarea(
      'AI가 뉴스를 분석할 관점을 입력하세요.',
      t?.aiBriefing?.systemPrompt ?? '',
    );

    const colorSection = this.renderColorPresets();

    const btnStyle: Partial<CSSStyleDeclaration> = {
      padding: '6px 16px',
      borderRadius: '4px',
      fontSize: '0.8rem',
      fontWeight: '600',
      cursor: 'pointer',
      border: 'none',
    };

    const cancelBtn = h('button', {
      type: 'button',
      style: {
        ...btnStyle,
        background: 'rgba(0,0,0,0.3)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--panel-border)',
      },
    }, '취소');
    cancelBtn.addEventListener('click', () => this.onCancel());

    const saveBtn = h('button', {
      type: 'button',
      style: {
        ...btnStyle,
        background: 'var(--accent)',
        color: '#000',
      },
    }, '저장');
    saveBtn.addEventListener('click', () => {
      const topic = this.buildTopicFromForm();
      if (topic) this.onSave(topic);
    });

    const previewBtn = h('button', {
      type: 'button',
      style: {
        ...btnStyle,
        background: 'rgba(var(--accent-rgb), 0.15)',
        color: 'var(--accent)',
        border: '1px solid rgba(var(--accent-rgb), 0.3)',
      },
    }, '미리보기');
    previewBtn.addEventListener('click', () => {
      const topic = this.buildTopicFromForm();
      if (topic) {
        // Dispatch preview event
        window.dispatchEvent(new CustomEvent('topic-preview', { detail: { topic } }));
      }
    });

    const form = h('div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          maxHeight: '70vh',
          overflowY: 'auto',
          paddingRight: '4px',
        },
      },
      // Row: name + icon
      h('div', { style: { display: 'flex', gap: '10px', marginBottom: '10px' } },
        h('div', { style: { flex: '1' } },
          h('label', { style: this.labelStyle() }, '주제명'),
          nameInput,
        ),
        h('div', { style: { flexShrink: '0' } },
          h('label', { style: this.labelStyle() }, '아이콘'),
          iconInput,
        ),
      ),
      this.fieldGroup('설명', descInput),
      // Map section
      h('div', { style: { marginBottom: '10px' } },
        h('label', { style: { ...this.labelStyle(), marginBottom: '5px' } }, '지도 중심 / 줌'),
        h('div', { style: { display: 'flex', gap: '8px' } },
          h('div', { style: { flex: '1' } },
            h('label', { style: { ...this.labelStyle(), fontSize: '0.68rem' } }, '위도'),
            latInput,
          ),
          h('div', { style: { flex: '1' } },
            h('label', { style: { ...this.labelStyle(), fontSize: '0.68rem' } }, '경도'),
            lngInput,
          ),
          h('div', { style: { flex: '0 0 80px' } },
            h('label', { style: { ...this.labelStyle(), fontSize: '0.68rem' } }, '줌 레벨'),
            zoomInput,
          ),
        ),
      ),
      // Color presets
      h('div', { style: { marginBottom: '10px' } }, colorSection),
      this.fieldGroup('한국 뉴스 검색어', newsKoInput),
      this.fieldGroup('영문 뉴스 검색어', newsEnInput),
      this.fieldGroup('YouTube 검색어', youtubeInput),
      this.fieldGroup('AI 분석 관점', aiTextarea),
      this.fieldGroup('핵심 키워드 (쉼표 구분)', keywordsInput),
    );

    const modal = h(
      'div',
      {
        className: 'topic-editor-modal',
        style: {
          position: 'fixed',
          inset: '0',
          zIndex: '2000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
        },
      },
      h(
        'div',
        {
          className: 'topic-editor-modal__dialog',
          style: {
            background: 'var(--popup-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: '8px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            padding: '20px',
            width: '480px',
            maxWidth: '95vw',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          },
        },
        // Title
        h('h2', {
          style: {
            fontSize: '1rem',
            fontWeight: '700',
            color: 'var(--accent)',
            margin: '0',
          },
        }, this.editingTopic ? '주제 편집' : '새 주제 만들기'),
        // Form
        form,
        // Buttons
        h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' } },
          previewBtn,
          cancelBtn,
          saveBtn,
        ),
      ),
    );

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.onCancel();
    });

    return modal;
  }

  private buildTopicFromForm(): TopicConfig | null {
    const name = this.fields.name?.value.trim() ?? '';
    if (!name) {
      alert('주제명을 입력하세요.');
      return null;
    }

    const icon = this.fields.icon?.value.trim() || '📌';
    const description = this.fields.description?.value.trim() ?? '';
    const lat = parseFloat(this.fields.lat?.value ?? '37.5');
    const lng = parseFloat(this.fields.lng?.value ?? '127.0');
    const zoom = parseInt(this.fields.zoom?.value ?? '7', 10);

    // Theme
    let theme: TopicTheme;
    if (this.customHex && /^#[0-9a-fA-F]{6}$/.test(this.customHex)) {
      const hex = this.customHex;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      theme = {
        accent: hex,
        accentRgb: `${r},${g},${b}`,
        headerTint: `rgba(${Math.round(r * 0.1)},${Math.round(g * 0.1)},${Math.round(b * 0.1)},0.8)`,
        panelBorder: `rgba(${Math.round(r * 0.3)},${Math.round(g * 0.3)},${Math.round(b * 0.3)},0.7)`,
        panelBg: `rgba(${Math.round(r * 0.2)},${Math.round(g * 0.2)},${Math.round(b * 0.2)},0.85)`,
        markerPrimary: hex,
        markerSecondary: '#ff8800',
        badgeBg: `rgba(${r},${g},${b},0.2)`,
      };
    } else {
      theme = { ...TopicEditorModal.COLOR_PRESETS[this.selectedPreset] };
    }

    // Feeds
    const feeds = [];
    const newsKo = this.fields.newsKo?.value.trim();
    if (newsKo) {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(newsKo)}&hl=ko&gl=KR&ceid=KR:ko`;
      feeds.push({ id: 'news-ko', name: '한국 뉴스', url, lang: 'ko' as const, category: 'news' });
    }
    const newsEn = this.fields.newsEn?.value.trim();
    if (newsEn) {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(newsEn)}&hl=en&gl=US&ceid=US:en`;
      feeds.push({ id: 'news-en', name: 'English News', url, lang: 'en' as const, category: 'news' });
    }

    const youtubeQuery = this.fields.youtube?.value.trim() ?? '';
    const keywords = (this.fields.keywords?.value ?? '')
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    const systemPrompt = this.fields.aiPrompt?.value.trim() ?? '';

    const id = this.editingTopic?.id ?? `custom-${Date.now()}`;

    const topic: TopicConfig = {
      id,
      name,
      icon,
      description,
      theme,
      map: {
        center: { lat, lng },
        zoom,
        globeAltitude: this.editingTopic?.map.globeAltitude ?? 1.5,
      },
      layers: this.editingTopic?.layers ?? {},
      panels: this.editingTopic?.panels ?? { left: [], right: [], bottom: [] },
      feeds,
      youtube: {
        liveSearchQuery: youtubeQuery,
        vodSearchQuery: youtubeQuery,
      },
      aiBriefing: {
        systemPrompt,
        focusKeywords: keywords,
        lang: 'ko',
      },
      refreshIntervals: this.editingTopic?.refreshIntervals,
      isBuiltIn: false,
    };

    return topic;
  }

  show(): void {
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  getElement(): HTMLElement {
    return this.el;
  }

  destroy(): void {
    this.el.remove();
  }
}
