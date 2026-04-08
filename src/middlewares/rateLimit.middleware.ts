import type { Request, Response, NextFunction } from 'express';
import AppError from '../types/appError';

interface RateLimitInfo {
    count: number;
    resetTime: number;
}

const limitStore = new Map<string, RateLimitInfo>();

const WINDOW_MS = 60 * 1000;
const MAX_LIMIT = 100;

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const currentTime = Date.now();

    let record = limitStore.get(ip);

    if (!record || currentTime > record.resetTime) {
        record = { count: 1, resetTime: currentTime + WINDOW_MS };
        limitStore.set(ip, record);
    } else {
        record.count++;
    }

    // Luôn set Headers để client theo dõi
    res.setHeader('X-RateLimit-Limit', MAX_LIMIT);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_LIMIT - record.count));

    if (record.count > MAX_LIMIT) {
        // Ném lỗi về Global Error Handler thay vì tự trả về res.json
        const secondsLeft = Math.ceil((record.resetTime - currentTime) / 1000);
        return next(new AppError(429, `Too many requests. Please try again in ${secondsLeft}s.`));
    }

    next();
};

// Cleanup để tránh tràn bộ nhớ
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of limitStore.entries()) {
        if (now > record.resetTime) limitStore.delete(ip);
    }
}, 5 * 60 * 1000);