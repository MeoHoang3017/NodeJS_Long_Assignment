import type { Request, Response, NextFunction } from 'express';
import { type ZodTypeAny, ZodError } from 'zod';
import AppError from '../types/appError';

export const validate = (schema: ZodTypeAny) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues?.length
          ? error.issues.map((i) => i.message).join('; ')
          : 'Validation error';
        return next(new AppError(400, message));
      }
      return next(new AppError(400, 'Invalid data'));
    }
  };