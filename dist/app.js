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
const express_session_1 = __importDefault(require("express-session"));
const dotenv_1 = __importDefault(require("dotenv"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const pool_1 = require("./src/pool");
const auth_1 = __importDefault(require("./src/middlewares/auth"));
const cors_1 = __importDefault(require("cors"));
const auth_2 = __importDefault(require("./src/routes/auth"));
const excel_1 = __importDefault(require("./src/routes/excel"));
dotenv_1.default.config();
const PORT = process.env.PORT || 4400;
const app = (0, express_1.default)();
const corsOptions = {
    origin: "http://localhost:5173", // Replace "*" with a specific origin if needed
    methods: ["GET", "POST", "PUT", "DELETE"], // Allow only certain HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
    credentials: true, // Allow cookies to be sent with requests
};
app.use((0, cors_1.default)(corsOptions));
// Middleware: Body Parsing
app.use(express_1.default.json()); // Parses JSON request bodies
app.use(express_1.default.urlencoded({ extended: true })); // Parses URL-encoded request bodies
// Middleware: Express Session with PostgreSQL Store
app.set("trust proxy", 1);
const PgStore = (0, connect_pg_simple_1.default)(express_session_1.default);
app.use((0, express_session_1.default)({
    store: new PgStore({
        pool: pool_1.pool, // Use your database connection pool
        tableName: "sessions", // Custom table name for storing sessions
    }),
    secret: process.env.SESSION_SECRET,
    resave: false, // Avoids unnecessary session updates
    saveUninitialized: false, // Don't save empty sessions
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true, // Prevent client-side JavaScript access
        secure: process.env.NODE_ENV === "production", // Secure cookies in production
        sameSite: "strict", // Protect against CSRF attacks
    },
}));
// Serve static files (CSS, JS, images)
app.use(express_1.default.static("public"));
// Check database connection
function checkDatabaseConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = yield pool_1.pool.connect(); // Get a connection from the pool
            yield client.query("SELECT 1"); // Run a test query
            client.release(); // Release the connection back to the pool
            console.log("✅ Database connection successful!");
        }
        catch (error) {
            console.error("❌ Database connection failed:", error);
            process.exit(1); // Exit the process if the database connection fails
        }
    });
}
// Example Route: Render an EJS template
app.get("/", auth_1.default, (_, res) => {
    res.json({ mesage: "home page" });
});
app.use("/auth", auth_2.default);
app.use("/", excel_1.default);
// Start the server after checking the database connection
checkDatabaseConnection().then(() => {
    app.listen(PORT, () => {
        console.log(`Now listening on port ${PORT}`);
    });
});
