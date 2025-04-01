import express from "express";
import bcrypt from "bcrypt";
import { pool } from "../pool";
import { z } from "zod";
import requireAuth from "../middlewares/auth";

const router = express.Router();

declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      createdAt: Date;
    };
  }
}

const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const signUpSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name must be at least 2 characters long")
      .max(50, "First name must be at not 2 characters long"),
    lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters long")
      .max(50, "Last name must be at not 2 characters long"),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

router.post("/register", async (req, res) => {
  const parseResult = signUpSchema.safeParse(req.body);

  if (!parseResult.success) {
    // Map Zod error format to your desired error format
    const formattedErrors = parseResult.error.errors.map((err) => ({
      field: err.path[0], // Get the field name from the path
      error: err.message, // Get the error message
    }));

    res.status(400).json(formattedErrors);
    return;
  }

  const { firstName, lastName, email, password } = parseResult.data;

  try {
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      res
        .status(400)
        .json([{ field: "email", error: "Email is already in use" }]);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password)  
        VALUES ($1, $2, $3, $4) RETURNING *`,
      [firstName, lastName, email, hashedPassword]
    );

    req.session.user = {
      id: newUser.rows[0].id,
      firstName: newUser.rows[0].first_name,
      lastName: newUser.rows[0].last_name,
      email: newUser.rows[0].email,
      createdAt: newUser.rows[0].created_at,
    };

    res.status(201).json({ data: req.session.user });
    return;
  } catch (error) {
    res.status(500).json([{ error: "Internal server error" }]);
    return;
  }
});

router.post("/login", async (req, res) => {
  const parseResult = signInSchema.safeParse(req.body);

  if (!parseResult.success) {
    // Map Zod error format to your desired error format
    const formattedErrors = parseResult.error.errors.map((err) => ({
      field: err.path[0], // Get the field name from the path
      error: err.message, // Get the error message
    }));

    res.status(400).json(formattedErrors);
    return;
  }

  const { email, password } = parseResult.data;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      res.status(401).json([{ error: "Invalid credentials" }]);
      return;
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401).json([{ error: "Invalid credentials" }]);
      return;
    }

    req.session.user = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      createdAt: user.created_at,
    };

    res.status(200).json({ data: req.session.user });
  } catch (error) {
    console.error("Error signing in:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to sign out" });
      return;
    }
    res.status(200);
    return;
  });
});

router.get("/me", requireAuth, (req, res) => {
  // Check if the user is in the session
  if (!req.session.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.status(200).json({ data: req.session.user });
  return;
});

export default router;
