import 'dotenv/config'; 
import express, { Request, Response, NextFunction } from 'express';
import { connectDB } from './config/prisma';
import { PrismaClient, Prisma } from '@prisma/client'; 
import { setupSwagger } from './config/swagger';
import compression from 'compression';
import { generalLimiter, strictLimiter } from './middlewares/rateLimiter';

import userRoutes from './routes/users.routes';
import listingRoutes from './routes/listings.routes';
import bookingRoutes from './routes/bookings.routes';
import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/upload.routes';
import reviewRoutes from './routes/reviews.routes';
import statsRoutes from './routes/stats.routes';

const app = express();

// 1. Compression middleware
app.use(compression());

// 2. General rate limiter (applied to all requests)
app.use(generalLimiter);

// 3. Strict rate limiter for authentication and mutation endpoints
app.use('/auth', strictLimiter);
app.use('/listings', strictLimiter);
app.use('/bookings', strictLimiter);
app.use('/reviews', strictLimiter);

app.use(express.json());

// 4. Setup Swagger Docs
setupSwagger(app);

// 5. Mount Routes
app.use('/auth', authRoutes);
app.use('/', uploadRoutes);
app.use('/users', userRoutes);
app.use('/listings', listingRoutes);
app.use('/bookings', bookingRoutes);
app.use('/', reviewRoutes);
app.use('/', statsRoutes);

// 6. Default route to redirect to Swagger Docs
app.get('/', (req: Request, res: Response) => {
  res.redirect('/api-docs');
});

// 7. Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Error]: ${err.message}`);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Duplicate field value (email/username)' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
    if (err.code === 'P2003') return res.status(400).json({ error: 'Foreign key constraint failed' });
  }

  if (typeof err?.http_code === 'number') {
    const msg = err?.error?.message || err?.message || 'Upload provider rejected the request';
    return res.status(err.http_code).json({ error: msg });
  }

  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 3000;

const main = async () => {
  await connectDB(); 
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

main();