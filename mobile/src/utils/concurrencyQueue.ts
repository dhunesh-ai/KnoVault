/**
 * ConcurrencyQueue
 * Limits parallel asynchronous operations (e.g. network requests or sync tasks)
 * to a configurable maximum (default 2) to prevent startup request storms.
 */
export class ConcurrencyQueue {
  private maxConcurrency: number;
  private runningCount = 0;
  private queue: (() => Promise<void>)[] = [];

  constructor(maxConcurrency = 2) {
    this.maxConcurrency = maxConcurrency;
  }

  public async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }

  private async processNext() {
    if (this.runningCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const nextTask = this.queue.shift();
    if (!nextTask) return;

    this.runningCount++;
    try {
      await nextTask();
    } catch (e) {
      // Errors handled in task wrapper promise
    } finally {
      this.runningCount--;
      this.processNext();
    }
  }
}

export const networkConcurrencyQueue = new ConcurrencyQueue(2);
