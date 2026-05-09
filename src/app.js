import express from 'express';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/routes.js';
import assetRoutes from './routes/assetRoutes.js';
import productRoutes from './routes/productRoutes.js';
import { securityMiddleware } from './middleware/security.js';

const app = express();

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security middleware (CORS, headers, etc.)
securityMiddleware(app);

// --- Routes ---
app.use('/api/users', userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/products', productRoutes); // PRODUCT ROUTES ADDED

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error('Error:', err.message, err.stack);
  const statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  
  if (err.code === 'ER_NO_SUCH_TABLE') {
    message = 'Database table not found. Please ensure the database is properly initialized.';
  }
  
  res.status(statusCode).json({
    status: err.status || 'error',
    message,
  });
});

export default app;