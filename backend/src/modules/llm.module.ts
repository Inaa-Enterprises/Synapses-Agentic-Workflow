import { Module, Global } from '@nestjs/common';
import { LlmService } from '../services/llm.service';

@Global()
@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
