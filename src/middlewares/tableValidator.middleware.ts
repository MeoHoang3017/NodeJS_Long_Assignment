import {AppDataSource} from '../configs/connectDB';
import type { Request, Response, NextFunction } from 'express';
import AppError from '../types/appError';

async function checkTableExist(req: Request<{ resource: string }>, res: Response, next: NextFunction) {
    try{
        const resource = req.params.resource;
        const repository = AppDataSource.hasMetadata(resource);
        if (repository)
            next();
        else
         next(new AppError(404,`Resource '${resource}' not found in database`));
    } catch (error) {
        console.error(error);
        if (error instanceof AppError) return next(error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return next(new AppError(500, message));
    }
}

export {checkTableExist};