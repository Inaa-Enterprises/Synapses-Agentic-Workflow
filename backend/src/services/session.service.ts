import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'nestjs-redis';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly sessionPrefix = 'ali:session:';

  constructor(private readonly redisService: RedisService) {}

  async createSession(data: Record<string, any>): Promise<string> {
    const sessionId = uuidv4();
    await this.redisService.getClient().set(
      this.sessionPrefix + sessionId,
      JSON.stringify(data),
      'EX',
      60 * 60 * 24
    ); // 24h expiry
    this.logger.log(`Session created: ${sessionId}`);
    return sessionId;
  }

  async getSession(sessionId: string): Promise<any> {
    const data = await this.redisService.getClient().get(this.sessionPrefix + sessionId);
    if (!data) return null;
    return JSON.parse(data);
  }

  async destroySession(sessionId: string): Promise<void> {
    await this.redisService.getClient().del(this.sessionPrefix + sessionId);
    this.logger.log(`Session destroyed: ${sessionId}`);
  }
}
