import { Request, Response, NextFunction } from "express";

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

export default requireAuth;
