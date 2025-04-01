"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const pool_1 = require("../pool");
const zod_1 = require("zod");
const auth_1 = __importDefault(require("../middlewares/auth"));
const router = express_1.default.Router();
const signInSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters long"),
});
const signUpSchema = zod_1.z
    .object({
    firstName: zod_1.z
        .string()
        .min(2, "First name must be at least 2 characters long")
        .max(50, "First name must be at not 2 characters long"),
    lastName: zod_1.z
        .string()
        .min(2, "Last name must be at least 2 characters long")
        .max(50, "Last name must be at not 2 characters long"),
    email: zod_1.z.string().email("Invalid email"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: zod_1.z.string(),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
router.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const existingUser = yield pool_1.pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            res
                .status(400)
                .json([{ field: "email", error: "Email is already in use" }]);
            return;
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 12);
        const newUser = yield pool_1.pool.query(`INSERT INTO users (first_name, last_name, email, password)  
        VALUES ($1, $2, $3, $4) RETURNING *`, [firstName, lastName, email, hashedPassword]);
        req.session.user = {
            id: newUser.rows[0].id,
            firstName: newUser.rows[0].first_name,
            lastName: newUser.rows[0].last_name,
            email: newUser.rows[0].email,
            createdAt: newUser.rows[0].created_at,
        };
        res.status(201).json({ data: req.session.user });
        return;
    }
    catch (error) {
        res.status(500).json([{ error: "Internal server error" }]);
        return;
    }
}));
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const result = yield pool_1.pool.query("SELECT * FROM users WHERE email = $1", [
            email,
        ]);
        if (result.rows.length === 0) {
            res.status(401).json([{ error: "Invalid credentials" }]);
            return;
        }
        const user = result.rows[0];
        const isMatch = yield bcrypt_1.default.compare(password, user.password);
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
    }
    catch (error) {
        console.error("Error signing in:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
router.post("/logout", auth_1.default, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ error: "Failed to sign out" });
            return;
        }
        res.status(200);
        return;
    });
});
router.get("/me", auth_1.default, (req, res) => {
    // Check if the user is in the session
    if (!req.session.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    res.status(200).json({ data: req.session.user });
    return;
});
exports.default = router;
