import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal server error";
  let details: any = {};

  // Handle known error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation error";
    details = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "Invalid ID format";
  } else if ((err as any).code === 11000) {
    // MongoDB duplicate key
    statusCode = 409;
    message = "Duplicate entry";
    details = { field: Object.keys((err as any).keyPattern)[0] };
  }

  // Log error (replace with proper logger)
  console.error("Global Error Handler Caught:", {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode,
    message,
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    fullError: err
  });

  // Send response
  res.status(statusCode).json({
    error: message,
    ...(Object.keys(details).length > 0 && { details }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
