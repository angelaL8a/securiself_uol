import { Router } from "express";
import { auditRouter } from "./modules/audit/audit.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { clientsRouter } from "./modules/clients/clients.routes";
import { contextsRouter } from "./modules/contexts/contexts.routes";
import { grantsRouter } from "./modules/grants/grants.routes";
import { profilesRouter } from "./modules/profiles/profiles.routes";
import { vaultRouter } from "./modules/vault/vault.routes";

/** Router for all versioned application endpoints, mounted at /api/v1. */
export const apiV1Router = Router();

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/vault", vaultRouter);
apiV1Router.use("/contexts", contextsRouter);
apiV1Router.use("/clients", clientsRouter);
apiV1Router.use("/profiles", profilesRouter);
apiV1Router.use("/audit-logs", auditRouter);
apiV1Router.use("/grants", grantsRouter);
