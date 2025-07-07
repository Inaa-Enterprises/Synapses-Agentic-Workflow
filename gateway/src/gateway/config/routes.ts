export const routingConfig = [
  {
    path: '/api/users',
    config: {
      target: process.env.USER_SERVICE_URL,
      changeOrigin: true,
      pathRewrite: { '^/api/users': '' },
      onError: (err: any, req: any, res: any) => {
        res.status(503).json({ error: 'User service unavailable' });
      }
    }
  },
  {
    path: '/api/orders',
    config: {
      target: process.env.ORDER_SERVICE_URL,
      changeOrigin: true,
      pathRewrite: { '^/api/orders': '' }
    }
  }
];
