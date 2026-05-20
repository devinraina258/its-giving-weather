import type { Request, Response, NextFunction } from "express";

export interface AuthUser {
  email: string;
  name: string;
  sub: string;
}

declare module "express-session" {
  interface SessionData {
    user?: AuthUser;
  }
}

export function isMockAuth(): boolean {
  return process.env.MOCK_AUTH === "true" || !process.env.AUTH0_DOMAIN;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (isMockAuth() && req.session.user) {
    next();
    return;
  }
  if (req.session.user) {
    next();
    return;
  }
  res.redirect("/login");
}

export function mockLogin(req: Request, res: Response): void {
  req.session.user = {
    email: "demo.user@talentserv.example",
    name: "Demo User",
    sub: "mock|demo-user",
  };
  res.redirect("/dashboard");
}

export function logout(req: Request, res: Response): void {
  req.session.destroy(() => {
    res.redirect("/");
  });
}
