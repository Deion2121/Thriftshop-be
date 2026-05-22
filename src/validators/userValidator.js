// src/validators/userValidator.js
import Joi from 'joi';

export const registerSchema = Joi.object({
    email: Joi.string().email().trim().lowercase().max(255).required(),
    password: Joi.string().min(8).max(128).required(),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().trim().lowercase().max(255).required(),
    password: Joi.string().min(8).max(128).required(),
});

export const updateProfileSchema = Joi.object({
    email: Joi.string().email().trim().lowercase().max(255).required(),
});

export const updatePasswordSchema = Joi.object({
    currentPassword: Joi.string().min(8).max(128).required(),
    newPassword: Joi.string().min(8).max(128).required(),
});
