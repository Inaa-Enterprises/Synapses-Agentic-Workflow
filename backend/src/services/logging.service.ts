import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

@Injectable()
export class LoggingService implements LoggerService {
  log(message: any, ...optionalParams: any[]) {
    // Production-grade log (could be extended to external log aggregation)
    console.log('[LOG]', message, ...optionalParams);
  }
  error(message: any, ...optionalParams: any[]) {
    console.error('[ERROR]', message, ...optionalParams);
  }
  warn(message: any, ...optionalParams: any[]) {
    console.warn('[WARN]', message, ...optionalParams);
  }
  debug?(message: any, ...optionalParams: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', message, ...optionalParams);
    }
  }
  verbose?(message: any, ...optionalParams: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[VERBOSE]', message, ...optionalParams);
    }
  }
}
