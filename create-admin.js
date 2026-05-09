// Run this manually in the database to create an admin user
// Or use it as a reference

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const hashedPassword = await bcrypt.hash("admin123", 10);
console.log("Hashed password:", hashedPassword);

// Then insert into database:
// INSERT INTO users (email, password, role) VALUES ('admin@example.com', '<hashed_password>', 'admin');

const token = jwt.sign(
  { id: 1, email: "admin@example.com", role: "admin" },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);
console.log("Test token:", token);