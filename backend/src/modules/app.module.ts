import { Module } from '@nestjs/common';
import { HealthModule } from './health.module';
import { MonitoringModule } from './monitoring.module';
import { AgentModule } from './agent.module';
import { LoggingModule } from './logging.module';
import { SessionModule } from './session.module';
import { DatabaseModule } from './database.module';
import { LlmModule } from './llm.module';
import { MonitoringController } from '../routes/monitoring.controller';
import { AgentController } from '../routes/agent.controller';
import { ChatflowController } from '../routes/chatflow.controller';
import { HealthController } from '../routes/health.controller';

@Module({
  imports: [
    HealthModule,
    MonitoringModule,
    AgentModule,
    LoggingModule,
    SessionModule,
    DatabaseModule,
    LlmModule,
  ],
  controllers: [
    HealthController,
    MonitoringController,
    AgentController,
    ChatflowController,
  ],
})
export class AppModule {}
