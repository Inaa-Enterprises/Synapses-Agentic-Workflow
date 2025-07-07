import { Injectable, Logger } from '@nestjs/common';
import { ChatflowService } from './chatflow.service';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(private readonly chatflowService: ChatflowService) {}

  async runAgentWorkflow(agentId: string, input: any): Promise<any> {
    // TODO: Implement agent workflow logic (multi-agent reasoning, context, memory, etc.)
    this.logger.log(`Running agent workflow for ${agentId}`);
    // Example: Pass input to chatflow
    return this.chatflowService.processInput(agentId, input);
  }
}
