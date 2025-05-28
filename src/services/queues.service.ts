// types/TaskQueue.ts
import { env } from "@/common/utils/envConfig";
import { JobsOptions, QueueOptions } from "bullmq";

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
  [key: string]: any;
}

export interface TaskData {
  [key: string]: any;
}

export interface TaskHandler<TData = TaskData, TResult = any> {
  (taskData: TData, context: TaskContext, job: Job): Promise<TResult>;
}

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

export interface JobStatus {
  id: string;
  taskName: string;
  state: string;
  progress: number | object;
  data: {
    taskName: string;
    taskData: TaskData;
    context: TaskContext;
  };
  result: any;
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
import { Queue, Worker, Job, JobProgress } from "bullmq";
import Redis from "ioredis";
import { redisClient } from "./redis-client.service";

class TaskQueueService {
  private redisConfig: Redis;
  private queues: Map<string, Queue>;
  private workers: Map<string, Worker>;
  private taskHandlers: Map<string, TaskHandler>;
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
      async (job: Job) => {
        const { taskName, taskData, context } = job.data as {
          taskName: string;
          taskData: TaskData;
          context: TaskContext;
        };

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
    worker.on("completed", (job: Job, result: any) => {
      console.log(`✅ Job ${job.id} (${job.data.taskName}) completed:`, result);
    });

    worker.on("failed", (job: Job | undefined, err: Error) => {
      console.log(
        `❌ Job ${job?.id} (${job?.data?.taskName}) failed:`,
        err.message
      );
    });

    worker.on("progress", (job: Job, progress: JobProgress) => {
      console.log(
        `📊 Job ${job.id} (${job.data.taskName}) progress: ${progress}%`
      );
    });

    this.workers.set("general-tasks", worker);
  }

  // Register a task handler (similar to defining what the task should do)
  public registerTask<TData = TaskData, TResult = any>(
    taskName: string,
    handlerFunction: TaskHandler<TData, TResult>
  ): void {
    this.taskHandlers.set(taskName, handlerFunction as TaskHandler);
    console.log(`📝 Task handler registered: ${taskName}`);
  }

  // Enqueue a task (equivalent to _taskQueue.EnqueueTask)
  public async enqueueTask<TData = TaskData>(
    taskName: string,
    taskData: TData = {} as TData,
    options: EnqueueOptions = {},
    context: Partial<TaskContext> = {}
  ): Promise<EnqueueResult> {
    try {
      const jobData = {
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
  public async getJobStatus(jobId: string): Promise<JobStatus | null> {
    const job = await this.defaultQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return {
      id: job.id!,
      taskName: job.data.taskName,
      state,
      progress: job.progress,
      data: job.data,
      result: job.returnvalue,
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
  public async getQueueStats(
    queueName: string = "general-tasks"
  ): Promise<QueueStats> {
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
