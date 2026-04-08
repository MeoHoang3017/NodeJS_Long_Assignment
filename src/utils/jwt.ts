import jsonwebtoken from 'jsonwebtoken';
import dotenv from 'dotenv';
import {encrypt, decrypt} from './crypto';

dotenv.config();

const JWT_ACCESS_SECRET_KEY = process.env.JWT_ACCESS_SECRET_KEY || 'your-secret-key-must-be-32-chars!!'; // Phải đúng 32 ký tự cho AES-256
const JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET_KEY || 'your-secret-key-must-be-32-chars!!'; // Phải đúng 32 ký tự cho AES-256
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES as jsonwebtoken.SignOptions['expiresIn'] | undefined || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES as jsonwebtoken.SignOptions['expiresIn'] | undefined || '7d';

type Payload = {
    id: number,
    email: string,
    role: string
}

export function generateAccessToken (payload: Payload){
    const encryptedPayload = encrypt(payload);
    const accessToken = jsonwebtoken.sign({ encryptedData: encryptedPayload}, JWT_ACCESS_SECRET_KEY, 
        { expiresIn: ACCESS_EXPIRES });
    return accessToken;
}

export function generateRefreshToken (payload: Payload){
    const encryptedPayload = encrypt(payload);
    const refreshToken = jsonwebtoken.sign({ encryptedData: encryptedPayload}, JWT_REFRESH_SECRET_KEY, 
        { expiresIn: REFRESH_EXPIRES });
    return refreshToken;
}

export function verifyAccessToken (token: string): Payload{
    const decoded = jsonwebtoken.verify(token, JWT_ACCESS_SECRET_KEY) as { encryptedData: string }
    const decryptedPayload = decrypt(decoded.encryptedData);
    console.log(decoded);
    console.log(decryptedPayload);
    return decryptedPayload;
}

export function verifyRefreshToken (token: string): Payload{
    const decoded = jsonwebtoken.verify(token, JWT_REFRESH_SECRET_KEY) as { encryptedData: string }
    const decryptedPayload = decrypt(decoded.encryptedData);
    return decryptedPayload;
}