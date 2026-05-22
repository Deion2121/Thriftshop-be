// src/routes/routes.js

import express from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { authRateLimiter, csrfProtection } from "../middleware/security.js";
import * as authController from "../controllers/auth.controller.js";
import * as userController from "../controllers/user.controller.js";

const router = express.Router();

// -----------------------------
// PUBLIC ROUTES
// -----------------------------
router.post("/register", authRateLimiter, authController.register);
router.post("/login", authRateLimiter, authController.login);

// JWT logout is handled client-side
router.post("/logout", csrfProtection, authController.logout); // optional

// -----------------------------
// PROTECTED ROUTES
// -----------------------------
router.use(authMiddleware); // 🔒 all routes below require token

// ✅ Get current logged-in user
router.get("/me", userController.getCurrentUser);

// ✅ Update current user profile
router.put("/profile", csrfProtection, userController.updateProfile);
router.put("/password", csrfProtection, userController.updatePassword);

// -----------------------------
// ADMIN ROUTES
// -----------------------------
router.get("/users", adminMiddleware, userController.getUsers);

export default router;
