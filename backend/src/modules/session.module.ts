import { Module, Global } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { RedisModule } from 'nestjs-redis';

@Global()
@Module({
  imports: [RedisModule],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
