import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      return res.status(500).json({ message: "Server authentication is not configured" });
    }

    const authHeader = req.headers["authorization"];
    const cookieToken = req.cookies?.jwt;

    if ((!authHeader || !authHeader.startsWith("Bearer ")) && !cookieToken) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : cookieToken;

    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }

  next();
};
