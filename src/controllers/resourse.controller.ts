import type { Request, Response } from "express";
import { AppDataSource } from "../configs/connectDB";
import { In, Raw } from "typeorm";
import { buildSingleWhere } from "../utils/queryBuilder";
import AppError from "../types/appError";
// Helper function to parse select fields from query params
const getSelectFields = (fieldsQuery?: string): any => {
  if (!fieldsQuery) return undefined;
  return fieldsQuery.split(",").map((f) => f.trim());
};

const toSingular = (str: string) => (str.endsWith('s') ? str.slice(0, -1) : str);
const toPlural = (str: string) => (str.endsWith('s') ? str : str + 's');

// Health check
async function healthCheck(req: Request, res: Response) {
  try {
    await AppDataSource.query("SELECT 1");
    res.status(200).json({
      status: "ok",
      database: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Health check failed:", error.message);
    throw new AppError(503, error?.message || "Database disconnected");
  }
}

// Get all resources
async function getResources(
  req: Request<
    { resource: string },
    {},
    {},
    {
      _page?: string;
      _limit?: string;
      _sort?: string;
      _order?: string;
      _expand?: string;
      _embed?: string;
      _fields?: string;
      q?: string;
    }
  >,
  res: Response,
) {
  try {
    const { resource } = req.params;

    const { _page, _limit, _sort, _order, _fields,_expand, _embed, q: searchTerm, ...query } = req.query;
    const repository = AppDataSource.getRepository(resource);
    const metadata = repository.metadata;

    //Xác định các field full text search
    const fullTextSearchFields = metadata.columns
      .filter((column) => column.propertyName != "password" && (column.type === "varchar" || column.type === "text"))
      .map((column) => column.propertyName);

    // Xử lý tìm kiếm 'q' và truy vấn toán tử 
    const whereClause = buildSingleWhere(query, searchTerm, fullTextSearchFields);

    // Xử lý _fields (Lấy dữ liệu cơ bản)
    const selectFields = getSelectFields(_fields);

    // Truy vấn dữ liệu trên bảng
    let [data, total] = await repository.findAndCount({
      ...(selectFields && { select: selectFields }),
      order: _sort
        ? { [_sort]: _order?.toUpperCase() === "DESC" ? "DESC" : "ASC" }
        : {},
      take: _limit ? parseInt(_limit) : undefined,
      skip:
        _page && _limit ? (parseInt(_page) - 1) * parseInt(_limit) : undefined,
      where: whereClause
    });

    // Xử lý _expand (Lấy dữ liệu cha - ManyToOne)
     if (_expand && data.length > 0) {
      const expandTargets = _expand.split(",").map(item => item.trim());
      
      for (const target of expandTargets) {
        const singularTarget = toSingular(target);
        const pluralTarget = toPlural(target);
        const fkField = `${singularTarget}Id`;
        
        const hasColumn = metadata.columns.some(col => col.propertyName === fkField);
        
        if (hasColumn) {
          const targetRepo = AppDataSource.getRepository(pluralTarget);
          const parentIds = [...new Set(data.map(item => item[fkField]).filter(id => id))];

          if (parentIds.length > 0) {
            const parents = await targetRepo.find({ where: { id: In(parentIds) } as any });
            
            data = data.map(item => {
              const parent = parents.find(p => p.id === item[fkField]);
              // Ẩn password của dữ liệu expand
              if (parent) delete (parent as any).password;
              
              return {
                ...item,
                [singularTarget]: parent || null
              };
            });
          }
        }
      }
    }

    // Xử lý _embed (Lấy dữ liệu con)
    if (_embed && data.length > 0) {
      const embedTargets = _embed.split(",").map(item => item.trim());
      
      for (const target of embedTargets) {
        const singularCurrent = toSingular(resource);
        const backRefField = `${singularCurrent}Id`;
        
        try {
          const targetRepo = AppDataSource.getRepository(target);
          const currentIds = data.map(item => item.id);

          const children = await targetRepo.find({
            where: { [backRefField]: In(currentIds) } as any
          });

          data = data.map(item => {
            const itemChildren = children.filter(c => c[backRefField] === item.id);
            // Ẩn password của dữ liệu embed
            itemChildren.forEach(child => delete (child as any).password);

            return {
              ...item,
              [target]: itemChildren
            };
          });
        } catch (e: any) {
          console.warn(`Could not embed ${target}:`, e.message);
        }
      }
    }

    res.setHeader("X-Total-Count", total);
    res.setHeader("Access-Control-Expose-Headers", "X-Total-Count");
    res.status(200).json(data);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Invalid request";
    throw new AppError(500, message);
  }
}

// Get resource by id
async function getResourceById(
  req: Request<{ resource: string; id: string }>,
  res: Response,
) {
  try {
    const resource = req.params.resource;
    const id = parseInt(req.params.id, 10);
    const repository = AppDataSource.getRepository(resource);
    const data = await repository.findOneBy({ id });
    if (data) {
      res.status(200).json(data);
    } else {
      throw new AppError(404, `Resource ${resource} with id ${id} not found`);
    }
  } catch (error) {
    console.error(error);
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    throw new AppError(500, message);
  }
}

// Create resource
async function createResource(
  req: Request<{ resource: string }, {}, { [key: string]: any }>,
  res: Response,
) {
  try {
    const resource = req.params.resource;
    const repository = AppDataSource.getRepository(resource);
    const newResource = repository.create(req.body);
    const savedResource = await repository.save(newResource);
    res.status(201).json(savedResource);
  } catch (error) {
    console.error(error);
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    throw new AppError(500, message);
  }
}

// Update resource
async function updatePutResource(
  req: Request<{ resource: string; id: string }, {}, { [key: string]: any }>,
  res: Response,
) {
  try {
    const { resource, id } = req.params;

    const repository = AppDataSource.getRepository(resource);
    let entity = await repository.findOneBy({ id: parseInt(id) } as any);

    if (!entity) throw new AppError(404, `Resource ${resource} with id ${id} not found`);

    // LOGIC PUT: Thay thế toàn bộ trường (trừ ID và created_at với updated_at)
    const allColumns = repository.metadata.columns
        .filter((c) => c.propertyName !== "id" && c.propertyName !== "createdAt" && c.propertyName !== "updatedAt")
        .map((c) => c.propertyName);

    allColumns.forEach((col) => {
      if (col !== "id" && col !== "created_at") {
        // Nếu body không có field đó -> set về null (hoặc giá trị mặc định)
        entity![col] = req.body[col] !== undefined ? req.body[col] : null;
      }
    });

    const saved = await repository.save(entity);
    res.status(200).json(saved);
  } catch (error) {
    console.error(error);
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    throw new AppError(500, message);
  }
}

// Update resource
async function updatePatchResource(
  req: Request<{ resource: string; id: string }, {}, { [key: string]: any }>,
  res: Response,
) {
  try {
    const { resource, id } = req.params;

    const repository = AppDataSource.getRepository(resource);
    const entity = await repository.findOneBy({ id: parseInt(id) } as any);

    if (!entity) throw new AppError(404, `Resource ${resource} with id ${id} not found`);

    // LOGIC PATCH: Chỉ ghi đè các trường có trong body
    repository.merge(entity, req.body);

    const saved = await repository.save(entity);
    res.status(200).json(saved);
  } catch (error) {
    console.error(error);
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    throw new AppError(500, message);
  }
}

// Delete resource
async function deleteResource(
  req: Request<{ resource: string; id: string }>,
  res: Response,
) {
  try {
    const resource = req.params.resource;
    const id = parseInt(req.params.id, 10);
    const repository = AppDataSource.getRepository(resource);
    const existingResource = await repository.findOneBy({ id });
    if (existingResource) {
      await repository.remove(existingResource);
      res.status(204).send();
    } else {
      throw new AppError(404, `Resource ${resource} with id ${id} not found`);
    }
  } catch (error) {
    console.error(error);
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : "Internal Server Error";
    throw new AppError(500, message);
  }
}

export {
  healthCheck,
  getResources,
  getResourceById,
  createResource,
  updatePutResource,
  updatePatchResource,
  deleteResource,
};
