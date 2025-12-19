import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import forumRoutes from "./routes/forum";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/v1/forum", forumRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Forum API server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
