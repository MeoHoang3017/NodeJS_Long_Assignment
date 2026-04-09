import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import type { Express } from "express";
import dotenv from "dotenv";

function setupSwagger(app: Express): void {
  dotenv.config();
  const swaggerPath = path.join(import.meta.dirname, "swagger.yaml");
  const swaggerDocument = YAML.load(swaggerPath);

  const serverUrl =
    process.env.SWAGGER_SERVER_URL ||
    process.env.APP_URL ||
    `http://localhost:${process.env.PORT || 3000}`;

  console.log(serverUrl);
  // Override `servers` so Swagger UI can follow the environment (.env / Docker).
  swaggerDocument.servers = [{ url: serverUrl }];

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

export default setupSwagger;
