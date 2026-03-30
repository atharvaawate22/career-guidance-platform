import { Router } from 'express';
import * as authController from './auth.controller';
import {
  authMiddleware,
  requireAdminRole,
} from '../../middleware/authMiddleware';
import { verifyCsrfToken } from '../../middleware/csrfMiddleware';

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
router.get(
  '/session',
  authMiddleware,
  requireAdminRole,
  authController.sessionController,
);
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
