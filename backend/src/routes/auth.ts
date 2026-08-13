import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, signAuthToken } from '../middleware/auth.js';
import { createUser, findUserByEmail, findUserById } from '../services/authFileStore.js';
import { ApiError } from '../utils/apiError.js';

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/\d/, 'Password must include a number'),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);

  const existing = await findUserByEmail(data.email);
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await createUser({
    email: data.email,
    fullName: data.fullName,
    passwordHash,
  });
  const token = signAuthToken({ userId: user.id, email: user.email });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
  });
});

authRouter.post('/login', async (req, res) => {
  const data = loginSchema.parse(req.body);

  const user = await findUserByEmail(data.email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signAuthToken({ userId: user.id, email: user.email });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
  });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
  });
});
