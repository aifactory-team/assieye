import type { TopicConfig } from '@/config/topics/types';
import { BUILTIN_TOPICS, DEFAULT_TOPIC_ID } from '@/config/topics/index';
import { ThemeEngine } from './theme-engine';

const STORAGE_KEY_TOPIC = 'assieye-active-topic';
const STORAGE_KEY_CUSTOM_TOPICS = 'assieye-custom-topics';

export class TopicManager {
  private activeTopic: TopicConfig;
  private customTopics: TopicConfig[] = [];
  private generation = 0;
  private listeners: Array<(topic: TopicConfig, generation: number) => void> = [];

  constructor() {
    this.customTopics = this.loadCustomTopics();
    const urlTopic = new URLSearchParams(window.location.search).get('topic');
    const savedId = urlTopic || localStorage.getItem(STORAGE_KEY_TOPIC) || DEFAULT_TOPIC_ID;
    this.activeTopic = this.findTopic(savedId) || this.findTopic(DEFAULT_TOPIC_ID)!;
  }

  getActiveTopic(): TopicConfig {
    return this.activeTopic;
  }

  getGeneration(): number {
    return this.generation;
  }

  isCurrentGeneration(gen: number): boolean {
    return gen === this.generation;
  }

  getAllTopics(): TopicConfig[] {
    return [...BUILTIN_TOPICS, ...this.customTopics];
  }

  findTopic(id: string): TopicConfig | undefined {
    return this.getAllTopics().find(t => t.id === id);
  }

  onTopicChange(listener: (topic: TopicConfig, generation: number) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (topic: TopicConfig, generation: number) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  async switchTopic(topicId: string): Promise<void> {
    const topic = this.findTopic(topicId);
    if (!topic || topic.id === this.activeTopic.id) return;

    this.generation++;
    const gen = this.generation;

    // Transition animation
    document.body.classList.add('topic-transitioning');

    // 1. Apply theme
    ThemeEngine.apply(topic.theme);

    // 2. Update active topic
    this.activeTopic = topic;

    // 3. Save to localStorage
    localStorage.setItem(STORAGE_KEY_TOPIC, topic.id);

    // 4. Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('topic', topic.id);
    window.history.replaceState({}, '', url.toString());

    // 5. Notify listeners
    for (const listener of this.listeners) {
      listener(topic, gen);
    }

    // 6. Dispatch custom event for decoupled components
    window.dispatchEvent(new CustomEvent('topic-changed', { detail: { topic, generation: gen } }));

    // Remove transition after animation
    setTimeout(() => {
      document.body.classList.remove('topic-transitioning');
    }, 500);
  }

  // Apply initial topic theme without animation
  applyInitialTopic(): void {
    ThemeEngine.apply(this.activeTopic.theme);
  }

  // Custom topic CRUD
  saveCustomTopic(topic: TopicConfig): void {
    const existing = this.customTopics.findIndex(t => t.id === topic.id);
    const saved = { ...topic, isBuiltIn: false };
    if (existing >= 0) {
      this.customTopics[existing] = saved;
    } else {
      this.customTopics.push(saved);
    }
    this.persistCustomTopics();
  }

  deleteCustomTopic(topicId: string): void {
    this.customTopics = this.customTopics.filter(t => t.id !== topicId);
    this.persistCustomTopics();
    if (this.activeTopic.id === topicId) {
      void this.switchTopic(DEFAULT_TOPIC_ID);
    }
  }

  exportTopic(topicId: string): string | null {
    const topic = this.findTopic(topicId);
    if (!topic) return null;
    return JSON.stringify(topic, null, 2);
  }

  importTopic(json: string): TopicConfig | null {
    try {
      const topic = JSON.parse(json) as TopicConfig;
      if (!topic.id || !topic.name || !topic.theme) return null;
      topic.isBuiltIn = false;
      // Ensure unique ID
      if (this.findTopic(topic.id)) {
        topic.id = `${topic.id}-${Date.now()}`;
      }
      this.saveCustomTopic(topic);
      return topic;
    } catch {
      return null;
    }
  }

  private loadCustomTopics(): TopicConfig[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_TOPICS);
      if (!raw) return [];
      return JSON.parse(raw) as TopicConfig[];
    } catch {
      return [];
    }
  }

  private persistCustomTopics(): void {
    localStorage.setItem(STORAGE_KEY_CUSTOM_TOPICS, JSON.stringify(this.customTopics));
  }
}
