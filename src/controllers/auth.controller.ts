import type { Request, Response } from "express";
import { AppDataSource } from "../configs/connectDB";
import { hashPassword, isMatch } from "../utils/hasher";
import { generateAccessToken } from "../utils/jwt";
import AppError from "../types/appError";

async function login(req: Request<{}, {}, { email?: string; password?: string }>, res: Response) {
    try {
        const { email = "", password = "" } = req.body || {};
        if(!email || email.trim() === "" || !password || password.trim() === "") {
            throw new AppError(400, "email and password are required");
        }
        const repository = AppDataSource.getRepository("users");
        const user = await repository.findOneBy({ email });
        if (!user) {
            throw new AppError(401, "Invalid email or password");
        }
        const isPasswordMatch = await isMatch(password, user.password);
        if (!isPasswordMatch) {
            throw new AppError(401, "Invalid email or password");
        }
        const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role});
        res.status(200).json({ accessToken });
    } catch (error) {
        console.error(error);
        if (error instanceof AppError) throw error;
        const message = error instanceof Error ? error.message : "Internal Server Error";
        throw new AppError(500, message);
    }
}

async function register(req: Request, res: Response) {
    try {
        const { email = "", password = "" } = req.body || {};
        if(!email || !password) {
            throw new AppError(400, "Email and password are required");
        }
        const userRepo = AppDataSource.getRepository("users");
        const existingUser = await userRepo.findOneBy({ email });
        if (existingUser) {
            throw new AppError(400, "User already exists");
        }
        const hashedPassword = await hashPassword(password);
        const user = userRepo.create({ email, password: hashedPassword, role: "user" });
        await userRepo.save(user);
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error(error);
        if (error instanceof AppError) throw error;
        const message = error instanceof Error ? error.message : "Internal Server Error";
        throw new AppError(500, message);
    }
}

export { login, register };