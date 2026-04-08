import { DataSource } from "typeorm";
import { createSchemas } from "../utils/createSchema";
import dotenv from "dotenv";
import AppError from "../types/appError";

dotenv.config();

// 1. Lấy Schemas và Data từ file JSON
const { schemas, data } = createSchemas();

// 2. Cấu hình DataSource
export const AppDataSource = new DataSource({
    type: (process.env.DB_TYPE as any) || "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "postgres_db",
    entities: schemas,
    // synchronize: true sẽ tự động:
    // - Tạo bảng nếu chưa có.
    // - Thêm cột nếu schema mới có thêm cột so với DB.
    synchronize: true,
    dropSchema: true,
    logging: false,
});

async function startServer() {
    try {
        // Bước 1: Khởi tạo kết nối (TypeORM sẽ tự check/tạo table ở đây)
        await AppDataSource.initialize();
        console.log("Data Source đã khởi tạo và đồng bộ cấu trúc bảng!");

        // Bước 2: Duyệt qua dữ liệu để thêm mới hoặc cập nhật
        for (const tableName in data) {
            const repository = AppDataSource.getRepository(tableName);
            const records = data[tableName];

            // 1. Sử dụng save(): 
            // - Nếu record có ID và ID đã tồn tại -> UPDATE
            // - Nếu record có ID nhưng chưa tồn tại -> INSERT với ID đó
            // - Nếu record KHÔNG có ID -> INSERT với ID tự tăng tiếp theo
            await repository.save(records);

            // 2. FIX CHO POSTGRES: Cập nhật lại Sequence của cột ID
            // Điều này giúp Postgres không bị "ngáo" khi lần sau bạn tạo data mới không kèm ID
            if (records.some((r: any) => r.id)) {
                const tableNameRaw = repository.metadata.tableName;
                await AppDataSource.query(
                    `SELECT setval(pg_get_serial_sequence('"${tableNameRaw}"', 'id'), MAX(id)) FROM "${tableNameRaw}"`
                );
            }
            

            console.log(`Synced and Reset Sequence for ${tableName}`);
        }

        console.log("Tất cả bảng và dữ liệu đã sẵn sàng!");

    } catch (error) {
        console.error("Lỗi trong quá trình khởi tạo/seed data:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        throw new AppError(500, message);
    }
}

export default startServer;