import { 
    MoreThanOrEqual, In, Equal, Raw, type FindOptionsWhere, ILike, Not, MoreThan, LessThan, LessThanOrEqual 
} from 'typeorm';

const OPERATOR_MAP: any = {
    _eq: (val: any) => Equal(val),
    _ne: (val: any) => Not(Equal(val)),
    _gt: (val: any) => MoreThan(val),
    _lt: (val: any) => LessThan(val),
    _gte: (val: any) => MoreThanOrEqual(val),
    _lte: (val: any) => LessThanOrEqual(val),
    _like: (val: any) => ILike(`%${val}%`),
    _in: (val: any) => In(String(val).split(',')),
};

export function buildSingleWhere<T>(
    query: any, 
    q?: string, 
    fields: string[] = []
): FindOptionsWhere<T> {
    const where: any = {};

    // 1. Xử lý các filter AND thông thường (_gte, _eq...)
    Object.keys(query).forEach((key) => {
        const operatorKey = Object.keys(OPERATOR_MAP).find(op => key.endsWith(op));
        if (operatorKey) {
            const fieldName = key.replace(operatorKey, '');
            where[fieldName] = OPERATOR_MAP[operatorKey](query[key]);
        }
    });

    // 2. Xử lý tìm kiếm 'q' trên nhiều fields (Dùng Raw để gom vào 1 object)
    if (q && fields.length > 0) {
        // Tạo chuỗi SQL: (field1 ILIKE :q OR field2 ILIKE :q OR ...)
        // Lưu ý: Dùng ILIKE cho Postgres (không phân biệt hoa thường), hoặc LIKE cho MySQL
        const sqlOrCondition = fields
            .map((field) => `${field} ILIKE :q`)
            .join(' OR ');

        // Gán Raw condition vào field đầu tiên trong danh sách search
        // TypeORM sẽ AND điều kiện Raw này với các điều kiện ở bước 1
        where[fields[0]!] = Raw(() => `(${sqlOrCondition})`, { q: `%${q}%` });
    }

    return where;
}