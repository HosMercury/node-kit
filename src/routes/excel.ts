import express, { Request, Response } from "express";
import multer from "multer";
import xlsx from "xlsx";
import path from "path";

const router = express.Router();

// Set up Multer to preserve file extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory to save the uploaded files
  },
  filename: (req, file, cb) => {
    // Get the file extension from the uploaded file
    const extname = path.extname(file.originalname);
    // Save the file with its original name and extension
    cb(null, Date.now() + extname); // You can customize the filename as needed
  },
});

const upload = multer({ storage });

router.post("/excel", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  try {
    // Read the Excel file
    const workbook = xlsx.readFile(req.file.path);

    // Get the first sheet in the workbook
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert the sheet to JSON
    const data = xlsx.utils.sheet_to_json(sheet);

    // Respond with the data
    res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process the Excel file" });
    return;
  }
});

export default router;
