import { logger } from '../utils/logger';

export enum TaskPriority {
  USER_INTERACTION = 1,
  AI_CHAT = 2,
  HOME_SCREEN = 3,
  NOTES = 4,
  CALENDAR = 5,
  WORKSPACE = 6,
  NOTIFICATIONS = 7,
  BACKGROUND_SYNC = 8,
}

interface QueuedSyncTask {
  id: string;
  priority: TaskPriority;
  task: () => Promise<any>;
}

class SyncManager {
  private queue: QueuedSyncTask[] = [];
  private isProcessing = false;
  private isAIChatActive = false;

  public setAIChatActive(active: boolean) {
    if (this.isAIChatActive !== active) {
      logger.info(`[SyncManager] AI Chat active state changed: ${active}`);
      this.isAIChatActive = active;
      if (!active) {
        this.processNext();
      }
    }
  }

  public scheduleTask<T>(id: string, priority: TaskPriority, task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // If task with same ID is already queued, replace or ignore
      const existingIdx = this.queue.findIndex(t => t.id === id);
      if (existingIdx !== -1) {
        this.queue.splice(existingIdx, 1);
      }

      this.queue.push({
        id,
        priority,
        task: async () => {
          try {
            const res = await task();
            resolve(res);
          } catch (err) {
            reject(err);
          }
        },
      });

      // Sort by priority ascending (1 highest, 8 lowest)
      this.queue.sort((a, b) => a.priority - b.priority);
      this.processNext();
    });
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    // Pause low-priority background tasks while AI Chat is active
    const nextTask = this.queue[0];
    if (this.isAIChatActive && nextTask && nextTask.priority >= TaskPriority.WORKSPACE) {
      logger.info(`[SyncManager] Pausing background task '${nextTask.id}' (Priority ${nextTask.priority}) while AI Chat is active.`);
      return;
    }

    this.isProcessing = true;

    const nextItem = this.queue.shift();
    if (nextItem) {
      try {
        logger.info(`[SyncManager] Executing task '${nextItem.id}' (Priority ${nextItem.priority})`);
        await nextItem.task();
      } catch (e) {
        logger.error(`[SyncManager] Task '${nextItem.id}' failed:`, e);
      }
    }

    this.isProcessing = false;
    this.processNext();
  }
}

export const syncManager = new SyncManager();
