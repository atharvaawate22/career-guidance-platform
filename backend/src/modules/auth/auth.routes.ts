import { Router } from 'express';
import * as authController from './auth.controller';
import {
  authMiddleware,
  requireAdminRole,
} from '../../middleware/authMiddleware';
import { verifyCsrfToken } from '../../middleware/csrfMiddleware';
import { authLimiter } from '../../middleware/rateLimit';

const router = Router();

router.get('/login', (_req, res) => {
  res.json({
    endpoint: '/api/v1/admin/login',
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

router.post('/login', authLimiter, authController.loginController);

// Session check is public so it doesn't throw 401 warnings in visitor consoles
router.get('/session', authController.sessionController);

router.get(
  '/csrf',
  authMiddleware,
  requireAdminRole,
  authController.csrfController,
);

router.post(
  '/logout',
  authMiddleware,
  requireAdminRole,
  verifyCsrfToken,
  authController.logoutController,
);

export default router;
