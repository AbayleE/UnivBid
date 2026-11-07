import { env } from './config/env.js';
import express from 'express';
import cors from 'cors';
import { handleStripeWebhook } from './controllers/webhook_controller.js';
import stripeRoutes from './routes/stripe.js';

const app = express();

// Must stay above express.json(): Stripe signs the raw request body.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(cors({
  origin: env.frontendOrigin,
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' }));

app.use('/api/stripe', stripeRoutes);

export const server = app.listen(env.port, () => {
  console.log(`Stripe backend running on port ${env.port}`);
});
