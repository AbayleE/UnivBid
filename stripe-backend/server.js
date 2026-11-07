import { env } from './config/env.js';
import express from 'express';
import cors from 'cors';
import stripeRoutes from './routes/stripe.js';

const app = express();
app.use(cors({
  origin: env.frontendOrigin,
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' }));

app.use('/api/stripe', stripeRoutes);

app.listen(env.port, () => {
  console.log(`Stripe backend running on port ${env.port}`);
});
