import Router from "express";
import z from "zod";

import { register, login } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middlware";

const router = Router();

const authBodySchema = z.object({
  body: z.object({
    email: z.email("Email is invalid").trim(),
    password: z.string().trim().min(1, "Password is required"),
  }),
});

// Define routes here
router.post("/register", validate(authBodySchema), register);
router.post("/login", validate(authBodySchema), login);

export default router;
