// src/controllers/auth.controller.js
import * as userService from '../services/user.service.js';
import { registerSchema, loginSchema } from '../validators/userValidator.js';
import { createCsrfToken, csrfCookieOptions } from '../middleware/security.js';

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000
};

const clearAuthCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
};

const clearCsrfCookieOptions = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
};

export const register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const user = await userService.registerUser(value);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const { token, user } = await userService.loginUser(value);

    const csrfToken = createCsrfToken();

    res.cookie('jwt', token, authCookieOptions);
    res.cookie('csrfToken', csrfToken, csrfCookieOptions);

    res.json({ message: 'Logged in', user, csrfToken });
  } catch (err) {
    next(err);
  }
};

export const logout = (req, res) => {
  res.clearCookie('jwt', clearAuthCookieOptions);
  res.clearCookie('csrfToken', clearCsrfCookieOptions);
  res.json({ message: 'Logged out' });
};
