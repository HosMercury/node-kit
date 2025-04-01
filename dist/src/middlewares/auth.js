"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
};
exports.default = requireAuth;
