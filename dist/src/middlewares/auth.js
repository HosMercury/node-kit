"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect("/auth/signin"); // Redirect to login if not authenticated
    }
    next(); // Allow access if authenticated
};
exports.default = requireAuth;
