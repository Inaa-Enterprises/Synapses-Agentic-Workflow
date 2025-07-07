import { Controller, Get } from '@nestjs/common';
import { MonitoringService } from '../services/monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  getHealth() {
    return this.monitoringService.getHealth();
  }
}
