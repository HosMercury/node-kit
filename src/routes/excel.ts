import express, { Request, Response } from "express";
import multer from "multer";
import xlsx from "xlsx";
import path from "path";
import { pool } from "../pool"; // Ensure pool is correctly configured

const router = express.Router();

// Set up Multer to preserve file extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory to save the uploaded files
  },
  filename: (req, file, cb) => {
    const extname = path.extname(file.originalname);
    cb(null, Date.now() + extname); // Save with timestamp
  },
});

const upload = multer({ storage });

router.post("/excel", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  try {
    // Read the Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0]; // Get first sheet
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to array of arrays (raw data)
    const rows: any[][] = xlsx.utils.sheet_to_json(sheet, {
      header: 1, // Forces output as an array of arrays
      defval: null, // Sets empty cells to `null`
    });

    if (rows.length < 2) {
      res.status(400).json({ error: "Excel file is empty or has no data" });
      return;
    }

    // Extract headers from the first row
    const headers = rows[0].map((h) => h?.toLowerCase().trim());

    // Find column indices based on expected column names
    const columnMap: Record<string, number> = {
      product_name: headers.indexOf("product name"),
      quantity: headers.indexOf("quantity"),
      condition: headers.indexOf("condition"),
      final_condition: headers.indexOf("final condition"),
      serial_tracking: headers.indexOf("serial tracking"),
      mfg_serial: headers.indexOf("mfg serial"),
      warranty: headers.indexOf("warranty"),
    };

    // Ensure all required columns exist
    if (Object.values(columnMap).some((index) => index === -1)) {
      res.status(400).json({ error: "Missing required columns in Excel file" });
      return;
    }

    // Extract data rows (skip header row)
    const data = rows.slice(1).map((row) => ({
      product_name: row[columnMap.product_name]?.toString().trim(),
      quantity: row[columnMap.quantity] ? Number(row[columnMap.quantity]) : 0,
      condition: row[columnMap.condition]?.toString().trim() || null,
      final_condition:
        row[columnMap.final_condition]?.toString().trim() || null,
      serial_tracking: row[columnMap.serial_tracking] === "Yes", // Convert "Yes"/"No" to boolean
      mfg_serial: row[columnMap.mfg_serial]?.toString().trim(),
      warranty: row[columnMap.warranty]
        ? Number(row[columnMap.warranty])
        : null,
    }));

    // Filter out rows where `product_name` is missing
    const validData = data.filter(
      (row) => row.product_name && row.product_name !== ""
    );

    if (validData.length === 0) {
      res.status(400).json({ error: "No valid data to insert" });
      return;
    }

    // Prepare values for SQL insertion
    const values = validData.map(
      ({
        product_name,
        quantity,
        condition,
        final_condition,
        serial_tracking,
        mfg_serial,
        warranty,
      }) => [
        product_name,
        quantity,
        condition,
        final_condition,
        serial_tracking,
        mfg_serial,
        warranty,
      ]
    );

    // Construct SQL query
    const query = `
      INSERT INTO products 
      (product_name, quantity, condition, final_condition, serial_tracking, mfg_serial, warranty)
      VALUES ${values
        .map(
          (_, i) =>
            `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${
              i * 7 + 5
            }, $${i * 7 + 6}, $${i * 7 + 7})`
        )
        .join(",")}
      RETURNING *;
    `;

    // Flatten values for query execution
    const flattenedValues = values.flat();

    // Execute batch insert
    const result = await pool.query(query, flattenedValues);

    res
      .status(201)
      .json({ message: "Data inserted successfully", inserted: rows });
    return;
  } catch (error) {
    console.error("Error processing Excel file:", error);
    res.status(500).json({ error: "Failed to process the Excel file" });
    return;
  }
});

export default router;
