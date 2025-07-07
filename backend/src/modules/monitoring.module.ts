import { Module, Global } from '@nestjs/common';
import { MonitoringService } from '../services/monitoring.service';

@Global()
@Module({
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
