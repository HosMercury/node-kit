import express from "express";
import multer from "multer";
import xlsx from "xlsx";
import path from "path";
import fs from "fs"; // For file cleanup
import { pool } from "../pool"; // Ensure pool is correctly configured

const router = express.Router();

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post("/excel", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json([{ error: "No file uploaded" }]);
    return;
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to an array of arrays
    const rows: any[][] = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    });

    if (rows.length < 2) {
      res.status(400).json([{ error: "Excel file is empty or has no data" }]);
      return;
    }

    // Extract headers
    const headers = rows[0].map((h) => h?.toLowerCase().trim());

    // Map headers to column indices
    const columnMap: Record<string, number> = {
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
    const data = rows.slice(1).map((row) => ({
      product_name: row[columnMap.product_name]?.toString().trim(),
      quantity: row[columnMap.quantity] ? Number(row[columnMap.quantity]) : 0,
      condition: row[columnMap.condition]?.toString().trim() || null,
      final_condition:
        row[columnMap.final_condition]?.toString().trim() || null,
      serial_tracking: ["yes", "1", "true"].includes(
        row[columnMap.serial_tracking]?.toString().trim().toLowerCase()
      ), // Handle variations
      mfg_serial: row[columnMap.mfg_serial]?.toString().trim(),
      warranty: row[columnMap.warranty]
        ? Number(row[columnMap.warranty])
        : null,
    }));

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

    const columns = (key: keyof (typeof validData)[0]) =>
      validData.map((row) => row[key]);

    const result = await pool.query(query, [
      columns("product_name"),
      columns("quantity"),
      columns("condition"),
      columns("final_condition"),
      columns("serial_tracking"),
      columns("mfg_serial"),
      columns("warranty"),
    ]);

    // Cleanup: Delete the uploaded file after processing
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Failed to delete file:", err);
    });

    res.status(201).json({
      data: result.rowCount,
    });
    return;
  } catch (error) {
    res.status(500).json([{ error: "Failed to process the Excel file" }]);
    return;
  }
});

export default router;
