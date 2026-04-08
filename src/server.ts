import express from 'express';
import startServer from './configs/connectDB';
import router from './routes/resourse.route';
import morgan from 'morgan';
import authRouter from './routes/auth.route';
import setupSwagger from './docs/swagger';
import { rateLimiter } from './middlewares/rateLimit.middleware';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email: string;
                role: string;
            };
        }
    }
}

const app = express();

// Parse JSON request body
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.use(morgan('dev'));
app.use(rateLimiter);
setupSwagger(app);

// Apply routes
app.use('/auth', authRouter);
app.use(router);

// Handle routes not found
app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
})

// Write a global error handler
app.use((err: any, req: any, res: any, next: any) => {
    err.statusCode = err.statusCode || 500;
    res.status(err.statusCode).json({ error: err.message || 'Internal Server Error' });
});

startServer().then(() => {
    app.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}).catch((error) => {
    console.error('Error starting the server:', error);
});