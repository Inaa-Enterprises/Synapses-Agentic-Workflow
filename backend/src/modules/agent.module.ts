import { Module } from '@nestjs/common';
import { AgentService } from '../services/agent.service';
import { ChatflowService } from '../services/chatflow.service';
import { LlmModule } from './llm.module';

@Module({
  imports: [LlmModule],
  providers: [AgentService, ChatflowService],
  exports: [AgentService, ChatflowService],
})
export class AgentModule {}
