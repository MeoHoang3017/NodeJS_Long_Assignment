import { verifyAccessToken } from '../utils/jwt';
import type { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../configs/connectDB';
import AppError from '../types/appError';

export async function jwtAuthenticate(req: any, res: any, next: any) {
    try {
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith("Bearer ")) return next(new AppError(401,"Unauthorized"));
        const accessToken = authHeader.split(" ")[1];

        const payload =  verifyAccessToken(accessToken);
        if(!payload) return next(new AppError(401,"Unauthorized"));
        if(AppDataSource.hasMetadata("users") === false)
           return next(new AppError(401,"Unauthorized"));
        const userRepository = AppDataSource.getRepository("users");
        const user = await userRepository.findOneBy({ id: payload.id });
        if(!user) return next(new AppError(401,"Unauthorized"));
        req.user = payload;
        next();
    } catch (error) {
        return next(new AppError(401,"Unauthorized"));
    }
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.user?.role !== "admin") {
        return next(new AppError(403, "Forbidden"));
    }
    next();
}

