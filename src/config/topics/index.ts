import type { TopicConfig } from './types';
import { TOPIC_DAEJEON_FIRE } from './daejeon-fire';
import { TOPIC_BTS_CONCERT } from './bts-concert';

export type { TopicConfig, TopicTheme, TopicMapConfig, PanelSlot, TopicFeedSource, TopicAiBriefing } from './types';

export const BUILTIN_TOPICS: TopicConfig[] = [
  TOPIC_DAEJEON_FIRE,
  TOPIC_BTS_CONCERT,
];

export const DEFAULT_TOPIC_ID = 'daejeon-fire';

export { TOPIC_DAEJEON_FIRE, TOPIC_BTS_CONCERT };
