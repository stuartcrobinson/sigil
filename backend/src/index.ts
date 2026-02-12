import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import socialRoutes from './routes/social';
import activityRoutes from './routes/activities';
import interactionRoutes from './routes/interactions';
import photoRoutes from './routes/photos';
import statsRoutes from './routes/stats';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS to allow frontend origins
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin.split(',').map(o => o.trim()),
  credentials: true,
}));
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ message: 'Hello Sigil' });
});

// Health check endpoint for monitoring and deployment
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/activities', interactionRoutes);
app.use('/api/activities', photoRoutes);
app.use('/api/users', statsRoutes);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Sigil backend running on port ${PORT}`);
  });
}

export default app;
