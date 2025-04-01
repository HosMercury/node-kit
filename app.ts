import express, { Express } from "express";
import session from "express-session";
import dotenv from "dotenv";
import pgSession from "connect-pg-simple";
import { pool } from "./src/pool";
import requireAuth from "./src/middlewares/auth";
import cors from "cors";
import authRouter from "./src/routes/auth";
import excelRouter from "./src/routes/excel";

dotenv.config();

const PORT = process.env.PORT || 4400;

const app: Express = express();

const corsOptions = {
  origin: "http://localhost:5173", // Replace "*" with a specific origin if needed
  methods: ["GET", "POST", "PUT", "DELETE"], // Allow only certain HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
  credentials: true, // Allow cookies to be sent with requests
};
app.use(cors(corsOptions));

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
app.get("/", requireAuth, (_, res) => {
  res.json({ mesage: "home page" });
});

app.use("/auth", authRouter);
app.use("/", excelRouter);

// Start the server after checking the database connection
checkDatabaseConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Now listening on port ${PORT}`);
  });
});
