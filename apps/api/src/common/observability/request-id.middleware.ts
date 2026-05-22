import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

type RequestWithId = Request & { requestId?: string };

export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction,
): void {
  const existing = req.header("x-request-id");
  const requestId =
    existing && existing.trim().length > 0 ? existing : randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
