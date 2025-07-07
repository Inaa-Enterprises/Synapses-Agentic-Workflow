import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  getHealth(): Record<string, any> {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuLoad: os.loadavg(),
      timestamp: new Date().toISOString(),
    };
  }

  logMetric(metric: string, value: any) {
    this.logger.log(`[METRIC] ${metric}: ${JSON.stringify(value)}`);
  }
}
