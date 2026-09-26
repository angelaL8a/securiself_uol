import { Router } from "express";
import { getSessionUser } from "../../lib/request";
import { authUser } from "../../middleware/authUser";
import { listAuditLogs } from "./audit.service";

export const auditRouter = Router();

auditRouter.get("/", authUser, async (req, res) => {
  const user = getSessionUser(req);
  const logs = await listAuditLogs(user.id);
  res.json({ status: "success", data: logs });
});
