import type { AppModule } from '@/types';

interface ScheduledTask {
  intervalId: ReturnType<typeof setInterval>;
  name: string;
}

export class RefreshScheduler implements AppModule {
  private readonly tasks = new Map<string, ScheduledTask>();

  init(): void {
    // Ready to accept scheduled tasks
  }

  schedule(name: string, fn: () => Promise<void>, intervalMs: number): void {
    this.cancel(name);

    const intervalId = setInterval(() => {
      fn().catch((err) => {
        console.error(`[RefreshScheduler] Error in task "${name}":`, err);
      });
    }, intervalMs);

    this.tasks.set(name, { intervalId, name });
  }

  cancel(name: string): void {
    const task = this.tasks.get(name);
    if (task) {
      clearInterval(task.intervalId);
      this.tasks.delete(name);
    }
  }

  cancelAll(): void {
    for (const task of this.tasks.values()) {
      clearInterval(task.intervalId);
    }
    this.tasks.clear();
  }

  destroy(): void {
    this.cancelAll();
  }
}
