// types/TaskQueue.ts
import { env } from "@/common/utils/envConfig";
import type { JobsOptions, QueueOptions } from "bullmq";

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  connectTimeout?: number;
  commandTimeout?: number;
}

export interface TaskContext {
  enqueuedAt: string;
  requestId?: string;
  userId?: string;
  operation?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface TaskData {
  [key: string]: string | number | boolean | object | undefined;
}

export type TaskHandler<TData = TaskData, TResult = unknown> = (
  taskData: TData,
  context: TaskContext,
  job: Job
) => Promise<TResult>;

export interface EnqueueOptions extends Omit<JobsOptions, "jobId"> {
  delay?: number;
  priority?: number;
  attempts?: number;
}

export interface EnqueueResult {
  jobId: string;
  taskName: string;
  enqueuedAt: string;
}

export interface JobStatus<TData = TaskData, TResult = unknown> {
  id: string;
  taskName: string;
  state: string;
  progress: number | Record<string, unknown>;
  data: {
    taskName: string;
    taskData: TData;
    context: TaskContext;
  };
  result: TResult | null;
  error: string | null;
  createdAt: Date;
  processedAt: Date | null;
  finishedAt: Date | null;
}

export interface QueueStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// services/TaskQueueService.ts
import { type Job, type JobProgress, Queue, Worker } from "bullmq";
import type Redis from "ioredis";
import { redisClient } from "./redis-client.service";

interface JobData<TData = TaskData> {
  taskName: string;
  taskData: TData;
  context: TaskContext;
}

class TaskQueueService {
  private redisConfig: Redis;
  private queues: Map<string, Queue>;
  private workers: Map<string, Worker>;
  private taskHandlers: Map<string, TaskHandler<TaskData, unknown>>;
  private defaultQueue: Queue;

  constructor(redisConfig: Redis) {
    this.redisConfig = redisConfig;
    this.queues = new Map();
    this.workers = new Map();
    this.taskHandlers = new Map();

    // Default queue cho general tasks
    this.defaultQueue = new Queue("general-tasks", {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    this.queues.set("general-tasks", this.defaultQueue);
    this.initializeDefaultWorker();
  }

  // Initialize default worker to handle all registered tasks
  private initializeDefaultWorker(): void {
    const worker = new Worker(
      "general-tasks",
      async (job: Job): Promise<unknown> => {
        const jobData = job.data as JobData;
        const { taskName, taskData, context } = jobData;

        console.log(`🔄 Processing task: ${taskName} (Job ID: ${job.id})`);

        // Get registered handler
        const handler = this.taskHandlers.get(taskName);
        if (!handler) {
          throw new Error(`No handler registered for task: ${taskName}`);
        }

        // Execute the task with context
        const result = await handler(taskData, context, job);

        console.log(`✅ Task ${taskName} completed (Job ID: ${job.id})`);
        return result;
      },
      {
        connection: this.redisConfig,
        concurrency: 5,
      }
    );

    // Event listeners
    worker.on("completed", (job: Job, result: unknown) => {
      const jobData = job.data as JobData;
      console.log(`✅ Job ${job.id} (${jobData.taskName}) completed:`, result);
    });

    worker.on("failed", (job: Job | undefined, err: Error) => {
      if (job?.data) {
        const jobData = job.data as JobData;
        console.log(
          `❌ Job ${job.id} (${jobData.taskName}) failed:`,
          err.message
        );
      } else {
        console.log("❌ Job failed:", err.message);
      }
    });

    worker.on("progress", (job: Job, progress: JobProgress) => {
      const jobData = job.data as JobData;
      console.log(
        `📊 Job ${job.id} (${jobData.taskName}) progress: ${progress}%`
      );
    });

    this.workers.set("general-tasks", worker);
  }

  // Register a task handler (similar to defining what the task should do)
  public registerTask<TData extends TaskData = TaskData, TResult = unknown>(
    taskName: string,
    handlerFunction: TaskHandler<TData, TResult>
  ): void {
    // Type assertion is needed here due to map constraint, but it's safe
    this.taskHandlers.set(
      taskName,
      handlerFunction as TaskHandler<TaskData, unknown>
    );
    console.log(`📝 Task handler registered: ${taskName}`);
  }

  // Enqueue a task (equivalent to _taskQueue.EnqueueTask)
  public async enqueueTask<TData extends TaskData = TaskData>(
    taskName: string,
    taskData: TData = {} as TData,
    options: EnqueueOptions = {},
    context: Partial<TaskContext> = {}
  ): Promise<EnqueueResult> {
    try {
      const jobData: JobData<TData> = {
        taskName,
        taskData,
        context: {
          ...context,
          enqueuedAt: new Date().toISOString(),
        } as TaskContext,
      };

      const job = await this.defaultQueue.add(taskName, jobData, {
        delay: options.delay || 0,
        priority: options.priority || 0,
        attempts: options.attempts || 3,
        ...options,
      });

      console.log(`📨 Task enqueued: ${taskName} (Job ID: ${job.id})`);
      return {
        jobId: job.id!,
        taskName,
        enqueuedAt: jobData.context.enqueuedAt,
      };
    } catch (error) {
      console.error(`Failed to enqueue task ${taskName}:`, error);
      throw error;
    }
  }

  // Get job status
  public async getJobStatus<
    TData extends TaskData = TaskData,
    TResult = unknown
  >(jobId: string): Promise<JobStatus<TData, TResult> | null> {
    const job = await this.defaultQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const jobData = job.data as JobData<TData>;

    return {
      id: job.id!,
      taskName: jobData.taskName,
      state,
      progress: job.progress,
      data: jobData,
      result: job.returnvalue as TResult | null,
      error: job.failedReason || null,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
    };
  }

  // Create specialized queue for specific task types
  public createQueue(
    queueName: string,
    options: Partial<QueueOptions> = {}
  ): Queue {
    if (this.queues.has(queueName)) {
      return this.queues.get(queueName)!;
    }

    const queue = new Queue(queueName, {
      ...options,
      connection: options.connection || this.redisConfig,
    });

    this.queues.set(queueName, queue);
    return queue;
  }

  // Get queue statistics
  public async getQueueStats(queueName = "general-tasks"): Promise<QueueStats> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  // Get all registered task names
  public getRegisteredTasks(): string[] {
    return Array.from(this.taskHandlers.keys());
  }

  // Remove a task handler
  public unregisterTask(taskName: string): boolean {
    const removed = this.taskHandlers.delete(taskName);
    if (removed) {
      console.log(`🗑️ Task handler unregistered: ${taskName}`);
    }
    return removed;
  }

  // Graceful shutdown
  public async close(): Promise<void> {
    console.log("🔄 Closing task queue service...");

    // Close all workers
    for (const [name, worker] of this.workers) {
      console.log(`Closing worker: ${name}`);
      await worker.close();
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      console.log(`Closing queue: ${name}`);
      await queue.close();
    }

    console.log("✅ Task queue service closed");
  }
}

export const taskQueueService = new TaskQueueService(redisClient);
