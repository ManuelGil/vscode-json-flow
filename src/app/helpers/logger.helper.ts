/**
 * Enhanced logger utility for the JSON Flow extension.
 * Provides structured logging with context, timestamps, performance metrics, and error details.
 * Optimized for worker debugging with detailed tracing capabilities.
 *
 * @module logger.helper
 */

import type { OutputChannel } from 'vscode';
import { window } from 'vscode';
import { EXTENSION_DISPLAY_NAME } from '../configs';

/**
 * Log levels for categorizing messages
 */
export enum LogLevel {
  Trace = 'TRACE', // Most verbose - for detailed tracing
  Debug = 'DEBUG',
  Info = 'INFO',
  Warn = 'WARN',
  Error = 'ERROR',
  Fatal = 'FATAL', // Critical errors that may crash the extension
}

/**
 * Worker performance metrics
 */
export interface WorkerMetrics {
  /** Worker ID or name */
  workerId?: string;
  /** Operation being performed */
  operation?: string;
  /** Start time in ms */
  startTime?: number;
  /** End time in ms */
  endTime?: number;
  /** Duration in ms */
  duration?: number;
  /** Memory usage in bytes */
  memoryUsage?: number;
  /** Number of items processed */
  itemsProcessed?: number;
  /** Processing rate (items/second) */
  processingRate?: number;
  /** Request ID for tracking */
  requestId?: string;
  /** Worker state */
  workerState?: 'idle' | 'processing' | 'error' | 'terminated';
  /** Queue size if applicable */
  queueSize?: number;
  /** Error count */
  errorCount?: number;
  /** Retry count */
  retryCount?: number;
}

/**
 * Configuration options for logger initialization
 */
export interface LoggerConfig {
  /** Whether to output to console in addition to output channel */
  enableConsole?: boolean;
  /** Minimum log level to display */
  minLevel?: LogLevel;
  /** Whether to include timestamps */
  includeTimestamp?: boolean;
  /** Whether to include caller location (file:line) */
  includeLocation?: boolean;
  /** Whether to include performance metrics */
  includePerformance?: boolean;
  /** Whether to buffer logs for batch output */
  enableBuffering?: boolean;
  /** Buffer size before flushing */
  bufferSize?: number;
  /** Maximum log file size in MB */
  maxLogSize?: number;
}

/**
 * Enhanced logger class for structured logging with worker debugging support
 */
export class Logger {
  private static instance: Logger;
  private outputChannel: OutputChannel;
  private config: LoggerConfig;
  private logBuffer: string[] = [];
  private performanceMap: Map<string, number> = new Map();
  private sessionId: string;
  private sequenceNumber: number = 0;

  private constructor(config: LoggerConfig = {}) {
    this.outputChannel = window.createOutputChannel(EXTENSION_DISPLAY_NAME);
    this.sessionId = this.generateSessionId();
    this.config = {
      enableConsole: false,
      minLevel: LogLevel.Info,
      includeTimestamp: true,
      includeLocation: false,
      includePerformance: true,
      enableBuffering: false,
      bufferSize: 100,
      maxLogSize: 50, // MB
      ...config,
    };

    // Show logger initialization
    this.info('Logger initialized', {
      sessionId: this.sessionId,
      config: this.config,
    });
  }

  /**
   * Generate unique session ID for log correlation
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get singleton instance of the logger
   */
  static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Reconfigure the logger after activation.
   * Call from extension activate() with context.extensionMode.
   */
  configure(config: LoggerConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get caller location from stack trace
   */
  private getCallerLocation(): string {
    const stack = new Error().stack;
    if (!stack) return '';

    const lines = stack.split('\n');
    // Skip first 3 lines (Error, getCallerLocation, formatMessage)
    const callerLine = lines[4];
    if (!callerLine) return '';

    const match =
      callerLine.match(/\((.*):(\d+):(\d+)\)/) ||
      callerLine.match(/at (.*):(\d+):(\d+)/);
    if (match) {
      const file = match[1].split('/').pop() || match[1];
      return `${file}:${match[2]}`;
    }
    return '';
  }

  /**
   * Format a log message with enhanced context information
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    metrics?: WorkerMetrics,
  ): string {
    const parts: string[] = [];

    // Add sequence number for ordering
    parts.push(`#${++this.sequenceNumber}`);

    // Add timestamp
    if (this.config.includeTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    // Add session ID for correlation
    parts.push(`[${this.sessionId.substring(0, 8)}]`);

    // Add log level
    parts.push(`[${level}]`);

    // Add caller location
    if (this.config.includeLocation) {
      const location = this.getCallerLocation();
      if (location) {
        parts.push(`[${location}]`);
      }
    }

    // Add worker metrics if available
    if (metrics) {
      const metricsStr = this.formatWorkerMetrics(metrics);
      if (metricsStr) {
        parts.push(`[METRICS: ${metricsStr}]`);
      }
    }

    // Add main message
    parts.push(message);

    // Add context
    if (context && Object.keys(context).length > 0) {
      const contextStr = JSON.stringify(context, null, 2)
        .split('\n')
        .map((line, index) => (index === 0 ? line : `  ${line}`))
        .join('\n');
      parts.push(`\n  Context: ${contextStr}`);
    }

    return parts.join(' ');
  }

  /**
   * Format worker metrics for logging
   */
  private formatWorkerMetrics(metrics: WorkerMetrics): string {
    const parts: string[] = [];

    if (metrics.workerId) parts.push(`Worker:${metrics.workerId}`);
    if (metrics.requestId) parts.push(`Req:${metrics.requestId}`);
    if (metrics.operation) parts.push(`Op:${metrics.operation}`);
    if (metrics.duration !== undefined) parts.push(`${metrics.duration}ms`);
    if (metrics.itemsProcessed !== undefined)
      parts.push(`Items:${metrics.itemsProcessed}`);
    if (metrics.processingRate !== undefined)
      parts.push(`Rate:${metrics.processingRate.toFixed(2)}/s`);
    if (metrics.memoryUsage !== undefined)
      parts.push(`Mem:${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    if (metrics.workerState) parts.push(`State:${metrics.workerState}`);
    if (metrics.queueSize !== undefined)
      parts.push(`Queue:${metrics.queueSize}`);
    if (metrics.errorCount !== undefined && metrics.errorCount > 0)
      parts.push(`Errors:${metrics.errorCount}`);
    if (metrics.retryCount !== undefined && metrics.retryCount > 0)
      parts.push(`Retries:${metrics.retryCount}`);

    return parts.join(' ');
  }

  /**
   * Format error details for logging
   */
  private formatError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      const errorRecord = error as unknown as Record<string, unknown>;
      return {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'), // First 5 stack lines
        ...(errorRecord.code && { code: errorRecord.code }),
      };
    }

    if (typeof error === 'object' && error !== null) {
      try {
        return { details: JSON.stringify(error, null, 2) };
      } catch {
        return { details: String(error) };
      }
    }

    return { details: String(error) };
  }

  /**
   * Log a message at the specified level with optional metrics
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    metrics?: WorkerMetrics,
  ): void {
    const levelPriority = {
      [LogLevel.Trace]: 0,
      [LogLevel.Debug]: 1,
      [LogLevel.Info]: 2,
      [LogLevel.Warn]: 3,
      [LogLevel.Error]: 4,
      [LogLevel.Fatal]: 5,
    };

    const minLevelPriority =
      levelPriority[this.config.minLevel || LogLevel.Info];
    const currentLevelPriority = levelPriority[level];

    if (currentLevelPriority < minLevelPriority) {
      return;
    }

    const formattedMessage = this.formatMessage(
      level,
      message,
      context,
      metrics,
    );

    // Buffer logs if enabled
    if (this.config.enableBuffering) {
      this.logBuffer.push(formattedMessage);
      if (this.logBuffer.length >= (this.config.bufferSize || 100)) {
        this.flush();
      }
    } else {
      // Always output to VS Code output channel
      this.outputChannel.appendLine(formattedMessage);
    }

    // Optionally output to console (only in development)
    if (this.config.enableConsole) {
      const consoleMethod =
        level === LogLevel.Fatal || level === LogLevel.Error
          ? 'error'
          : level === LogLevel.Warn
            ? 'warn'
            : level === LogLevel.Debug || level === LogLevel.Trace
              ? 'debug'
              : 'log';
      console[consoleMethod](formattedMessage);
    }

    // Show output channel on error or fatal
    if (level === LogLevel.Error || level === LogLevel.Fatal) {
      this.outputChannel.show(true);
    }
  }

  /**
   * Flush buffered logs to output
   */
  private flush(): void {
    if (this.logBuffer.length === 0) return;

    const output = this.logBuffer.join('\n');
    this.outputChannel.appendLine(output);
    this.logBuffer = [];
  }

  /**
   * Log trace message (most verbose)
   */
  trace(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Trace, message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Debug, message, context);
  }

  /**
   * Log informational message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Info, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Warn, message, context);
  }

  /**
   * Log error message with enhanced error formatting
   */
  error(
    message: string,
    error?: unknown,
    additionalContext?: Record<string, unknown>,
  ): void {
    const context = {
      ...additionalContext,
      ...(error && { error: this.formatError(error) }),
    };
    this.log(LogLevel.Error, message, context);
  }

  /**
   * Log fatal error (crashes or unrecoverable errors)
   */
  fatal(
    message: string,
    error?: unknown,
    additionalContext?: Record<string, unknown>,
  ): void {
    const context = {
      ...additionalContext,
      ...(error && { error: this.formatError(error) }),
    };
    this.log(LogLevel.Fatal, message, context);
  }

  /**
   * Log worker-specific message with metrics
   */
  worker(
    message: string,
    metrics: WorkerMetrics,
    context?: Record<string, unknown>,
  ): void {
    const level =
      metrics.errorCount && metrics.errorCount > 0
        ? LogLevel.Warn
        : LogLevel.Info;
    this.log(level, `[WORKER] ${message}`, context, metrics);
  }

  /**
   * Start performance timing for an operation
   */
  startTiming(operationId: string): void {
    this.performanceMap.set(operationId, performance.now());
    this.trace(`Performance timing started`, { operationId });
  }

  /**
   * End performance timing and log metrics
   */
  endTiming(operationId: string, metrics?: Partial<WorkerMetrics>): number {
    const startTime = this.performanceMap.get(operationId);
    if (!startTime) {
      this.warn(`No timing found for operation`, { operationId });
      return 0;
    }

    const duration = performance.now() - startTime;
    this.performanceMap.delete(operationId);

    const workerMetrics: WorkerMetrics = {
      operation: operationId,
      duration: Math.round(duration),
      ...metrics,
    };

    // Calculate processing rate if items were processed
    if (metrics?.itemsProcessed && duration > 0) {
      workerMetrics.processingRate = (metrics.itemsProcessed * 1000) / duration;
    }

    this.worker(`Operation completed`, workerMetrics);
    return duration;
  }

  /**
   * Log worker lifecycle event
   */
  workerLifecycle(
    workerId: string,
    event: 'created' | 'started' | 'stopped' | 'error' | 'terminated',
    context?: Record<string, unknown>,
  ): void {
    const level =
      event === 'error'
        ? LogLevel.Error
        : event === 'terminated'
          ? LogLevel.Warn
          : LogLevel.Info;
    this.log(level, `Worker ${event}`, {
      workerId,
      event,
      ...context,
    });
  }

  /**
   * Log worker message event with detailed info
   */
  workerMessage(
    workerId: string,
    direction: 'sent' | 'received',
    messageType: string,
    payload?: unknown,
    requestId?: string,
  ): void {
    this.trace(`Worker message ${direction}`, {
      workerId,
      direction,
      messageType,
      requestId,
      payloadSize: payload ? JSON.stringify(payload).length : 0,
    });
  }

  /**
   * Show the output channel to the user
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Clear the output channel
   */
  clear(): void {
    this.outputChannel.clear();
  }

  /**
   * Dispose of the output channel
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}

// Export singleton instance for convenience
export const logger = Logger.getInstance();
