import { EntitySchema, type EntitySchemaColumnOptions } from 'typeorm';
import fs from 'fs';
import path from 'path';

function createSchemas() {
    // SỬA Ở ĐÂY:
    const filePath = path.join(import.meta.dirname, '../../schema.json');
    
    if (!fs.existsSync(filePath)) {
        console.error("File schema.json không tồn tại!");
        return { schemas: [], data: {} };
    }

    const rawData = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(rawData);
    const schemas: EntitySchema[] = [];

    for (const tableName in data) {
        const records = data[tableName];
        if (!Array.isArray(records) || records.length === 0) continue;

        const sample = records[0];
        const columns: { [key: string]: EntitySchemaColumnOptions } = {};

        for (const key in sample) {
            const value = sample[key];
            let type: any = "varchar"; 

            // Logic suy luận kiểu dữ liệu
            if (typeof value === "number") {
                type = Number.isInteger(value) ? "int" : "float";
            } else if (typeof value === "boolean") {
                type = "boolean";
            } 
            // Sửa lỗi Date: Kiểm tra nếu là string và khớp định dạng ISO Date
            else if (typeof value === "string" && !isNaN(Date.parse(value)) && value.length > 10) {
                type = "timestamp";
            }

            const isId = key === "id";

            // 6. Cấu hình chi tiết (Đã sửa lỗi generated và nullable)
            columns[key] = {
                type: type,
                primary: isId, 
                // Khóa chính không được để trống, các cột khác thì có thể
                nullable: !isId ,
                // CHỈ tự động tăng nếu là cột ID và có kiểu số
                ...(isId && { generated: type === "int" ? "increment" : true }),

                // Tự động tạo ngày tạo với ngày cập nhật
                ...(/created_?at/i.test(key) && { createDate: true }),
                ...(/updated_?at/i.test(key) && { updateDate: true }),
            };
        }

        if (!columns['createdAt'] && !columns['created_at']) {
        columns['createdAt'] = {
            type: 'timestamptz',
            createDate: true,
            nullable: false,
            default: () => 'CURRENT_TIMESTAMP', // Gán mặc định ở tầng DB
        };
    }

    if (!columns['updatedAt'] && !columns['updated_at']) {
        columns['updatedAt'] = {
            type: 'timestamptz',
            updateDate: true,
            nullable: false,
            default: () => 'CURRENT_TIMESTAMP',
        };
    }
        schemas.push(new EntitySchema({
            name: tableName,
            tableName: tableName,
            columns: columns
        }));
    }

    return { schemas, data };
}

export { createSchemas } ;