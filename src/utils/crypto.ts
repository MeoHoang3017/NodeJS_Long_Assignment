import cryptoImp from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Cấu hình: Trong thực tế, hãy để các giá trị này trong file .env
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-must-be-32-chars!!';
 // Phải đúng 32 ký tự cho AES-256
const IV_LENGTH = 12; // Độ dài tiêu chuẩn cho AES-GCM là 12 bytes

/**
 * Mã hóa một object payload thành chuỗi hex
 */
export const encrypt = (payload: any): string => {
    // Chuyển payload sang JSON string
    const text = JSON.stringify(payload);
    
    // Tạo initialization vector (IV) ngẫu nhiên
    const iv = cryptoImp.randomBytes(IV_LENGTH);
    
    // Tạo cipher
    const cipher = cryptoImp.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);

    // Mã hóa dữ liệu
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Lấy authentication tag (Chỉ có trong chế độ GCM)
    const authTag = cipher.getAuthTag().toString('hex');

    // Trả về chuỗi định dạng: iv.encryptedData.authTag
    return `${iv.toString('hex')}.${encrypted}.${authTag}`;
};

/**
 * Giải mã chuỗi hex về object payload ban đầu
 */
export const decrypt = (cipherText: string): any => {
    try {
        const [ivHex, encryptedHex, authTagHex] = cipherText.split('.');

        if (!ivHex || !encryptedHex || !authTagHex) {
            throw new Error('Invalid cipher text format');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const encryptedText = Buffer.from(encryptedHex, 'hex');

        // Tạo decipher
        const decipher = cryptoImp.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
        
        // Thiết lập auth tag để kiểm tra tính toàn vẹn
        decipher.setAuthTag(authTag);

        // Giải mã
        let decrypted = decipher.update(encryptedText as any, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } catch (error: any) {
        throw new Error('Decryption failed: ' + error.message);
    }
};