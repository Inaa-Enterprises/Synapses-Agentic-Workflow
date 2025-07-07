import { Controller, Post, Body, Param, UploadedFiles, UseInterceptors, BadRequestException } from '@nestjs/common';
import { AgentService } from '../services/agent.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post(':agentId/run')
  @UseInterceptors(AnyFilesInterceptor())
  async runAgent(
    @Param('agentId') agentId: string,
    @Body() input: any,
    @UploadedFiles() attachments: Array<Express.Multer.File>
  ) {
    try {
      // Attachments are available as Express.Multer.File[]
      const result = await this.agentService.runAgentWorkflow(agentId, {
        ...input,
        attachments: attachments?.map(f => ({
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
          buffer: f.buffer,
        })) || [],
      });
      return { success: true, data: result };
    } catch (err) {
      throw new BadRequestException(err.message || 'Failed to process input');
    }
  }
}
