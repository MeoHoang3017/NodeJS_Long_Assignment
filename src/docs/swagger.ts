import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import type { Express } from "express";

function setupSwagger(app: Express): void {
  const swaggerPath = path.join(import.meta.dirname, "swagger.yaml");
  const swaggerDocument = YAML.load(swaggerPath);

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

export default setupSwagger;
