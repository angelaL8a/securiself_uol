import { Router } from "express";
import { unauthorized } from "../../lib/errors";
import { parseAcceptLanguage } from "../../lib/locale";
import { getRequestMeta } from "../../lib/request";
import { requireBearerToken } from "../../middleware/requireBearerToken";
import { readProfile } from "./profiles.service";

export const profilesRouter = Router();

profilesRouter.get("/me", requireBearerToken, async (req, res) => {
  const tokenContext = req.tokenContext;
  if (!tokenContext) {
    throw unauthorized("Invalid access token");
  }

  const payload = await readProfile(
    {
      user: tokenContext.user,
      context: tokenContext.context,
      applicationId: tokenContext.application.id,
    },
    getRequestMeta(req),
    parseAcceptLanguage(req.headers["accept-language"]),
  );

  res.json(payload);
});
