"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireClerkAuth = requireClerkAuth;
const express_1 = require("@clerk/express");
function requireClerkAuth(req, res, next) {
    const auth = (0, express_1.getAuth)(req);
    if (!auth.userId) {
        return res.status(401).json({ error: 'Unauthorized: Clerk user not authenticated' });
    }
    req.clerkUserId = auth.userId;
    next();
}
