import { Controller, Post, Body, Param } from '@nestjs/common';
import { ChatflowService } from '../services/chatflow.service';

@Controller('chatflow')
export class ChatflowController {
  constructor(private readonly chatflowService: ChatflowService) {}

  @Post(':agentId/process')
  async processInput(@Param('agentId') agentId: string, @Body() input: any) {
    return this.chatflowService.processInput(agentId, input);
  }
}
