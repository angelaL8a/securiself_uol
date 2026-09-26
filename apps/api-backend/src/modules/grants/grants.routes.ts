import { Router } from "express";
import { getRequestMeta, getSessionUser } from "../../lib/request";
import { authUser } from "../../middleware/authUser";
import { listGrants, revokeGrant } from "./grants.service";

export const grantsRouter = Router();

grantsRouter.use(authUser);

grantsRouter.get("/", async (req, res) => {
  const user = getSessionUser(req);
  const grants = await listGrants(user.id);
  res.json({ status: "success", data: grants });
});

grantsRouter.post("/:id/revoke", async (req, res) => {
  const user = getSessionUser(req);
  const data = await revokeGrant(user.id, req.params.id, getRequestMeta(req));
  res.json({ status: "success", message: "Grant revoked", data });
});
