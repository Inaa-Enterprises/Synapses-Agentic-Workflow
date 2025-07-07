import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';

@Injectable()
export class ChatflowService {
  private readonly logger = new Logger(ChatflowService.name);

  constructor(private readonly llmService: LlmService) {}

  async processInput(agentId: string, input: any): Promise<any> {
    this.logger.log(`Processing input for agent ${agentId}`);
    // TODO: Implement chatflow logic (prompt engineering, adaptive context, etc.)
    // Example: Call LLM connector (Gemini as default)
    return this.llmService.callLlm('gemini', input.prompt, input.options || {});
  }
}
