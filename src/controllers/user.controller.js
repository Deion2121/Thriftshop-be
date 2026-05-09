import * as userService from "../services/user.service.js";

export const getCurrentUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // ✅ Use dedicated function (clean + safe)
    const userMe = await userService.getCurrentUser(req.user.id);

    res.json(userMe);
  } catch (err) {
    next(err);
  }
};

// -----------------------------
// Update profile
// -----------------------------
export const updateProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const updatedUser = await userService.updateUserProfile(
      req.user.id,
      req.body
    );

    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
};

// -----------------------------
// Get all users (optional)
// -----------------------------
export const getUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();

    // ✅ Remove sensitive fields like password
    const safeUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
    }));

    res.json(safeUsers);
  } catch (err) {
    next(err);
  }
};