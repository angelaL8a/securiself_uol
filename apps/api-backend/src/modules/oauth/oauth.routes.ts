import { Router } from "express";
import { getRequestMeta, getSessionUser } from "../../lib/request";
import { authUser } from "../../middleware/authUser";
import {
  authorizeDecisionSchema,
  authorizeQuerySchema,
  tokenSchema,
} from "./oauth.schemas";
import {
  decideAuthorization,
  exchangeToken,
  getAuthorizeView,
} from "./oauth.service";

export const oauthRouter = Router();

oauthRouter.get("/authorize", authUser, async (req, res) => {
  const user = getSessionUser(req);
  const query = authorizeQuerySchema.parse(req.query);
  const view = await getAuthorizeView(user.id, query);
  res.json(view);
});

oauthRouter.post("/authorize/decision", authUser, async (req, res) => {
  const user = getSessionUser(req);
  const body = authorizeDecisionSchema.parse(req.body);
  const result = await decideAuthorization(user, body, getRequestMeta(req));
  res.json(result);
});

oauthRouter.post("/token", async (req, res) => {
  const body = tokenSchema.parse(req.body);
  const tokens = await exchangeToken(body, getRequestMeta(req));
  res.json(tokens);
});
