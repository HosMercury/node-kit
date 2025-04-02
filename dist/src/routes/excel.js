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
const multer_1 = __importDefault(require("multer"));
const xlsx_1 = __importDefault(require("xlsx"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs")); // For file cleanup
const pool_1 = require("../pool"); // Ensure pool is correctly configured
const router = express_1.default.Router();
// Configure Multer storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({ storage });
router.post("/excel", upload.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        res.status(400).json([{ error: "No file uploaded" }]);
        return;
    }
    try {
        const workbook = xlsx_1.default.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Convert sheet to an array of arrays
        const rows = xlsx_1.default.utils.sheet_to_json(sheet, {
            header: 1,
            defval: null,
        });
        if (rows.length < 2) {
            res.status(400).json([{ error: "Excel file is empty or has no data" }]);
            return;
        }
        // Extract headers
        const headers = rows[0].map((h) => h === null || h === void 0 ? void 0 : h.toLowerCase().trim());
        // Map headers to column indices
        const columnMap = {
            product_name: headers.indexOf("product name"), //0
            quantity: headers.indexOf("quantity"), //1
            condition: headers.indexOf("condition"), //2
            final_condition: headers.indexOf("final condition"), //3
            serial_tracking: headers.indexOf("serial tracking"), //4
            mfg_serial: headers.indexOf("mfg serial"), //5
            warranty: headers.indexOf("warranty"), //10
        };
        if (Object.values(columnMap).some((index) => index === -1)) {
            res
                .status(400)
                .json([{ error: "Missing required columns in Excel file" }]);
            return;
        }
        // Extract and transform data
        const data = rows.slice(1).map((row) => {
            var _a, _b, _c, _d, _e;
            return ({
                product_name: (_a = row[columnMap.product_name]) === null || _a === void 0 ? void 0 : _a.toString().trim(),
                quantity: row[columnMap.quantity] ? Number(row[columnMap.quantity]) : 0,
                condition: ((_b = row[columnMap.condition]) === null || _b === void 0 ? void 0 : _b.toString().trim()) || null,
                final_condition: ((_c = row[columnMap.final_condition]) === null || _c === void 0 ? void 0 : _c.toString().trim()) || null,
                serial_tracking: ["yes", "1", "true"].includes((_d = row[columnMap.serial_tracking]) === null || _d === void 0 ? void 0 : _d.toString().trim().toLowerCase()), // Handle variations
                mfg_serial: (_e = row[columnMap.mfg_serial]) === null || _e === void 0 ? void 0 : _e.toString().trim(),
                warranty: row[columnMap.warranty]
                    ? Number(row[columnMap.warranty])
                    : null,
            });
        });
        // Remove rows where `product_name` is missing
        const validData = data.filter((row) => row.product_name);
        if (validData.length === 0) {
            res.status(400).json({ error: "No valid data to insert" });
            return;
        }
        // Insert using `unnest`
        const query = `
      INSERT INTO products (product_name, quantity, condition, final_condition, serial_tracking, mfg_serial, warranty)
      SELECT * FROM unnest(
        $1::text[], $2::int[], $3::text[], $4::text[], $5::boolean[], $6::text[], $7::int[]
      )
      RETURNING *;
    `;
        const columns = (key) => validData.map((row) => row[key]);
        const result = yield pool_1.pool.query(query, [
            columns("product_name"),
            columns("quantity"),
            columns("condition"),
            columns("final_condition"),
            columns("serial_tracking"),
            columns("mfg_serial"),
            columns("warranty"),
        ]);
        // Cleanup: Delete the uploaded file after processing
        fs_1.default.unlink(req.file.path, (err) => {
            if (err)
                console.error("Failed to delete file:", err);
        });
        res.status(201).json({
            data: result.rowCount,
        });
        return;
    }
    catch (error) {
        res.status(500).json([{ error: "Failed to process the Excel file" }]);
        return;
    }
}));
exports.default = router;
