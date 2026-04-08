import Router from "express";
import {
  healthCheck,
  getResources,
  getResourceById,
  createResource,
  updatePutResource,
  updatePatchResource,
  deleteResource,
} from "../controllers/resourse.controller";
import { checkTableExist } from "../middlewares/tableValidator.middleware";
import { jwtAuthenticate, isAdmin } from "../middlewares/authenticate.middleware";
import zod from "zod";
import { validate } from "../middlewares/validate.middlware";
const router = Router();

const createResourceSchema = zod.object({
  params: zod.object({
    resource: zod.string().trim().min(1, "Resource is required"),
  }),
  body: zod
    .object({})
    .catchall(zod.any())
    .refine((value) => Object.keys(value).length > 0, {
      message: "Body must not be empty",
    }),
});

const updateResourceSchema = zod.object({
  params: zod.object({
    resource: zod.string().trim().min(1, "Resource is required"),
    id: zod.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: zod
    .object({})
    .catchall(zod.any())
    .refine((value) => Object.keys(value).length > 0, {
      message: "Body must not be empty",
    }),
});

// Define routes here
router.get("/health", healthCheck);

router.use("/:resource", checkTableExist);

// Define get all dynamic routes
router.get("/:resource", getResources);
router.get("/:resource/:id", getResourceById);

// Add middleware for protected routes
router.use(jwtAuthenticate);

// Define protected routes
router.post("/:resource", validate(createResourceSchema), createResource);
router.put("/:resource/:id", validate(updateResourceSchema), updatePutResource);
router.patch("/:resource/:id", validate(updateResourceSchema), updatePatchResource);

// Add middleware for secure admin routes
router.delete("/:resource/:id", isAdmin, deleteResource);

export default router;
