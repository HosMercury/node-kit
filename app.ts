import express, { Express, Request, Response } from "express";
import session from "express-session";
import dotenv from "dotenv";
import pgSession from "connect-pg-simple";
import { pool } from "./src/pool";
import requireAuth from "./src/middlewares/auth";
import authRouter from "./src/routes/auth";

dotenv.config();

const PORT = process.env.PORT || 4400;

const app: Express = express();

// Middleware: Body Parsing
app.use(express.json()); // Parses JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded request bodies

// Middleware: Express Session with PostgreSQL Store
app.set("trust proxy", 1);
const PgStore = pgSession(session);
app.use(
  session({
    store: new PgStore({
      pool, // Use your database connection pool
      tableName: "sessions", // Custom table name for storing sessions
    }),
    secret: process.env.SESSION_SECRET as string,
    resave: false, // Avoids unnecessary session updates
    saveUninitialized: false, // Don't save empty sessions
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true, // Prevent client-side JavaScript access
      secure: process.env.NODE_ENV === "production", // Secure cookies in production
      sameSite: "strict", // Protect against CSRF attacks
    },
  })
);

// Serve static files (CSS, JS, images)
app.use(express.static("public"));

// Check database connection
async function checkDatabaseConnection() {
  try {
    const client = await pool.connect(); // Get a connection from the pool
    await client.query("SELECT 1"); // Run a test query
    client.release(); // Release the connection back to the pool
    console.log("✅ Database connection successful!");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1); // Exit the process if the database connection fails
  }
}

// Example Route: Render an EJS template
app.get("/", requireAuth, (req: Request, res: Response) => {
  res.json({ mesage: "home page" });
});

app.use("/auth", authRouter);

// Start the server after checking the database connection
checkDatabaseConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Now listening on port ${PORT}`);
  });
});
