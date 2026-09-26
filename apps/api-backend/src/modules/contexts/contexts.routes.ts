import { Router } from "express";
import { getSessionUser } from "../../lib/request";
import { authUser } from "../../middleware/authUser";
import { createContextSchema, updateContextSchema } from "./contexts.schemas";
import {
  createContext,
  deleteContext,
  getOwnedContext,
  listContexts,
  updateContext,
} from "./contexts.service";

export const contextsRouter = Router();

contextsRouter.use(authUser);

contextsRouter.post("/", async (req, res) => {
  const user = getSessionUser(req);
  const body = createContextSchema.parse(req.body);
  const context = await createContext(user.id, body);
  res.status(201).json({ status: "success", data: context });
});

contextsRouter.get("/", async (req, res) => {
  const user = getSessionUser(req);
  const contexts = await listContexts(user.id);
  res.json({ status: "success", data: contexts });
});

contextsRouter.get("/:id", async (req, res) => {
  const user = getSessionUser(req);
  const context = await getOwnedContext(user.id, req.params.id);
  res.json({ status: "success", data: context });
});

contextsRouter.put("/:id", async (req, res) => {
  const user = getSessionUser(req);
  const body = updateContextSchema.parse(req.body);
  const context = await updateContext(user.id, req.params.id, body);
  res.json({ status: "success", data: context });
});

contextsRouter.delete("/:id", async (req, res) => {
  const user = getSessionUser(req);
  await deleteContext(user.id, req.params.id);
  res.status(204).send();
});
