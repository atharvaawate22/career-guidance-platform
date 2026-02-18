import { Router } from 'express';
import * as authController from './auth.controller';

const router = Router();

router.get('/login', (_req, res) => {
  res.json({
    endpoint: '/api/admin/login',
    method: 'POST',
    description: 'Admin authentication endpoint',
    requiredFields: {
      email: 'string',
      password: 'string',
    },
    returns: {
      token: 'JWT token for authenticated requests',
      user: 'Admin user information',
    },
  });
});

router.post('/login', authController.loginController);

export default router;
