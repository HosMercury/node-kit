import { Request, Response, NextFunction } from "express";

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.user) {
    return res.redirect("/auth/signin"); // Redirect to login if not authenticated
  }
  next(); // Allow access if authenticated
};

export default requireAuth;
