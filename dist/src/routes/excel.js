"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const xlsx_1 = __importDefault(require("xlsx"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// Set up Multer to preserve file extension
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Directory to save the uploaded files
    },
    filename: (req, file, cb) => {
        // Get the file extension from the uploaded file
        const extname = path_1.default.extname(file.originalname);
        // Save the file with its original name and extension
        cb(null, Date.now() + extname); // You can customize the filename as needed
    },
});
const upload = (0, multer_1.default)({ storage });
router.post("/excel", upload.single("file"), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
    }
    try {
        // Read the Excel file
        const workbook = xlsx_1.default.readFile(req.file.path);
        // Get the first sheet in the workbook
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Convert the sheet to JSON
        const data = xlsx_1.default.utils.sheet_to_json(sheet);
        // Respond with the data
        res.status(200).json({ data });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to process the Excel file" });
        return;
    }
});
exports.default = router;
