import { Router } from "express";
import { getSessionUser } from "../../lib/request";
import { authUser } from "../../middleware/authUser";
import { createClientSchema } from "./clients.schemas";
import {
  createClient,
  getClient,
  listClients,
  rotateClientSecret,
} from "./clients.service";

export const clientsRouter = Router();

clientsRouter.use(authUser);

clientsRouter.post("/", async (req, res) => {
  const user = getSessionUser(req);
  const body = createClientSchema.parse(req.body);
  const { application, clientSecret } = await createClient(user.id, body);
  // clientSecret is returned exactly once, here, and never stored in plaintext.
  res.status(201).json({ status: "success", data: { application, clientSecret } });
});

clientsRouter.get("/", async (req, res) => {
  const user = getSessionUser(req);
  const applications = await listClients(user.id);
  res.json({ status: "success", data: applications });
});

clientsRouter.get("/:id", async (req, res) => {
  const user = getSessionUser(req);
  const application = await getClient(user.id, req.params.id);
  res.json({ status: "success", data: application });
});

clientsRouter.post("/:id/rotate-secret", async (req, res) => {
  const user = getSessionUser(req);
  const { application, clientSecret } = await rotateClientSecret(
    user.id,
    req.params.id,
  );
  res.json({ status: "success", data: { application, clientSecret } });
});
