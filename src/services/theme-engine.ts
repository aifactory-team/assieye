import type { TopicTheme } from '@/config/topics/types';

export class ThemeEngine {
  static apply(theme: TopicTheme): void {
    const root = document.documentElement.style;

    // Direct theme properties
    root.setProperty('--accent', theme.accent);
    root.setProperty('--accent-rgb', theme.accentRgb);
    root.setProperty('--header-tint', theme.headerTint);
    root.setProperty('--panel-border', theme.panelBorder);
    root.setProperty('--panel-bg', theme.panelBg);
    root.setProperty('--marker-primary', theme.markerPrimary);
    root.setProperty('--marker-secondary', theme.markerSecondary);
    root.setProperty('--badge-bg', theme.badgeBg);

    // Derive secondary variables from panelBg
    const rgb = ThemeEngine.parseRgba(theme.panelBg);
    if (rgb) {
      const [r, g, b] = rgb;
      root.setProperty('--body-bg', ThemeEngine.darken(r, g, b, 0.4));
      root.setProperty('--text-primary', '#e0e0e0');
      root.setProperty('--text-secondary', '#b0b0b0');
      root.setProperty('--text-muted', '#707070');
      root.setProperty('--border-subtle', `rgba(${r * 1.6 | 0}, ${g * 1.6 | 0}, ${b * 1.6 | 0}, 0.3)`);
      root.setProperty('--border-dark', `rgba(${r * 1.6 | 0}, ${g * 1.6 | 0}, ${b * 1.6 | 0}, 0.5)`);
      root.setProperty('--scrollbar-thumb', `rgba(${r * 1.6 | 0}, ${g * 1.6 | 0}, ${b * 1.6 | 0}, 0.5)`);
      root.setProperty('--scrollbar-thumb-hover', `rgba(${r * 1.6 | 0}, ${g * 1.6 | 0}, ${b * 1.6 | 0}, 0.8)`);
      root.setProperty('--status-bar-bg', `rgba(${r * 0.5 | 0}, ${g * 0.5 | 0}, ${b * 0.5 | 0}, 0.9)`);
      root.setProperty('--panel-header-bg', 'rgba(0, 0, 0, 0.2)');
      root.setProperty('--map-bg', ThemeEngine.darken(r, g, b, 0.2));
      root.setProperty('--toolbar-bg', `rgba(${r * 0.5 | 0}, ${g * 0.5 | 0}, ${b * 0.5 | 0}, 0.85)`);
      root.setProperty('--popup-bg', `rgba(${r}, ${g}, ${b}, 0.95)`);
    }

    if (theme.mapStyle) {
      root.setProperty('--map-style-url', theme.mapStyle);
    }
  }

  private static parseRgba(rgba: string): [number, number, number] | null {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return [parseInt(match[1]!), parseInt(match[2]!), parseInt(match[3]!)];
    }
    return null;
  }

  private static darken(r: number, g: number, b: number, factor: number): string {
    return `rgb(${r * factor | 0}, ${g * factor | 0}, ${b * factor | 0})`;
  }
}
