import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.get('/health', async (req, res) => {
  const services = [
    { name: 'user-service', url: process.env.USER_SERVICE_URL },
    { name: 'order-service', url: process.env.ORDER_SERVICE_URL }
  ];

  const healthChecks = await Promise.allSettled(
    services.map(async service => {
      const response = await axios.get(`${service.url}/health`);
      return { service: service.name, status: 'healthy' };
    })
  );

  res.json({
    gateway: 'healthy',
    services: healthChecks.map(check =>
      check.status === 'fulfilled' ? check.value : { status: 'unhealthy' }
    )
  });
});

export default router;
