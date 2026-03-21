import type { AppModule } from '@/types';

/**
 * DataLoaderManager satisfies the AppModule interface for lifecycle management.
 * Actual data loading is orchestrated by App.ts; this class exists as a
 * thin lifecycle hook for any future cross-cutting loader concerns.
 */
export class DataLoaderManager implements AppModule {
  init(): void {
    // Intentional no-op: data loading is initiated by App.ts directly.
  }

  destroy(): void {
    // Intentional no-op: no persistent resources owned by this manager.
  }
}
