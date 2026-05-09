import * as userRepository from "../repositories/user.repository.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import jwt from "jsonwebtoken";
import AppError from "../utils/appError.js";

// -----------------------------
// Register user
// -----------------------------
export const registerUser = async ({ email, password, role = "user" }) => {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) throw new AppError("Email already exists", 400);

  const hashedPassword = await hashPassword(password);

  return await userRepository.createUser({
    email,
    password: hashedPassword,
    role,
  });
};

// -----------------------------
// Login user
// -----------------------------
export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError("Email and password required", 400);
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
};

// -----------------------------
// Get current user
// -----------------------------
export const getCurrentUser = async (id) => {
  const user = await userRepository.findById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
};

// -----------------------------
// Get user by ID
// -----------------------------
export const getUserById = async (id) => {
  const user = await userRepository.findById(id);
  if (!user) throw new AppError("User not found", 404);
  return user;
};

// -----------------------------
// Update profile
// -----------------------------
export const updateUserProfile = async (id, data) => {
  const existingUser = await userRepository.findById(id);
  if (!existingUser) throw new AppError("User not found", 404);

  const updatedUser = await userRepository.updateUser(id, data);
  if (!updatedUser) throw new AppError("Failed to update user", 500);

  return updatedUser;
};

// -----------------------------
// Get all users
// -----------------------------
export const getAllUsers = async () => {
  return await userRepository.getAllUsers();
};