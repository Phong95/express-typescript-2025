import express, { type Request, type Response, type Router } from "express";
import swaggerUi from "swagger-ui-express";

import { generateOpenAPIDocument } from "@/api-docs/openAPIDocumentGenerator";

export const openAPIRouter: Router = express.Router();
const openAPIDocument = generateOpenAPIDocument();

openAPIRouter.get("/swagger.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(openAPIDocument);
});

// Serve Swagger UI at /docs instead of root "/"
openAPIRouter.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(openAPIDocument, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "API Documentation",
  })
);

// Optional: Redirect root swagger path to /docs
openAPIRouter.get("/", (_req: Request, res: Response) => {
  res.redirect("/docs");
});
