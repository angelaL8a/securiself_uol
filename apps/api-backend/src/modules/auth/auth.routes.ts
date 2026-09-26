import { Router } from "express";
import { getSessionUser } from "../../lib/request";
import { serializeUser } from "../../lib/serializers";
import { authUser } from "../../middleware/authUser";
import {
  googleAuthSchema,
  loginSchema,
  registerSchema,
} from "./auth.schemas";
import { loginUser, loginWithGoogle, registerUser } from "./auth.service";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const body = registerSchema.parse(req.body);
  const result = await registerUser(body);
  res.status(201).json({ status: "success", ...result });
});

authRouter.post("/login", async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await loginUser(body);
  res.json({ status: "success", ...result });
});

authRouter.post("/google", async (req, res) => {
  const body = googleAuthSchema.parse(req.body);
  const result = await loginWithGoogle(body);
  res.json({ status: "success", ...result });
});

authRouter.get("/me", authUser, (req, res) => {
  const user = getSessionUser(req);
  res.json({ status: "success", user: serializeUser(user) });
});
