import type { MapLayers, AppModule } from '@/types';

export type { AppModule };

export interface AppContext {
  container: HTMLElement;
  isMobile: boolean;
  mapLayers: MapLayers;
}
