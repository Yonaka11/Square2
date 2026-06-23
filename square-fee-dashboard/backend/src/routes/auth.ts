import { Router } from 'express';
import { checkPassword, isAuthEnabled, signToken } from '../auth/auth.js';

export const authRouter = Router();

// GET /api/auth/status -> whether auth is required by this server
authRouter.get('/status', (_req, res) => {
  res.json({ authRequired: isAuthEnabled() });
});

// POST /api/auth/login { password } -> { token } when password is correct
authRouter.post('/login', (req, res) => {
  if (!isAuthEnabled()) {
    // Auth disabled: hand back a token so the client flow is uniform.
    return res.json({ token: signToken(), authRequired: false });
  }
  const { password } = req.body ?? {};
  if (!checkPassword(password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  res.json({ token: signToken(), authRequired: true });
});
