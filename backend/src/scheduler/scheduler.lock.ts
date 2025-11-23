export class SchedulerLock {
  private static isRunning = false;
  private static currentTask = "";

  static async acquire(taskName: string): Promise<boolean> {
    if (this.isRunning) {
      console.log(`⚠️ Scheduler Locked: '${this.currentTask}' is currently running. Skipping '${taskName}'.`);
      return false;
    }
    this.isRunning = true;
    this.currentTask = taskName;
    console.log(`🔒 Lock acquired for: ${taskName}`);
    return true;
  }

  static release() {
    console.log(`🔓 Lock released for: ${this.currentTask}`);
    this.isRunning = false;
    this.currentTask = "";
  }
}
