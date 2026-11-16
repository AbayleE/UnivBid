import { env } from './config/env.js';
import express from 'express';
import cors from 'cors';
import { handleStripeConnectWebhook, handleStripeWebhook } from './controllers/webhook_controller.js';
import { errorHandler, notFound } from './middleware/error_handler.js';
import stripeRoutes from './routes/stripe.js';

export const app = express();
app.disable('x-powered-by');

// Must stay above express.json(): Stripe signs the raw request body.
const rawJson = express.raw({ type: 'application/json', limit: '256kb' });
app.post('/api/stripe/webhook', rawJson, handleStripeWebhook);
if (handleStripeConnectWebhook) {
  app.post('/api/stripe/connect/webhook', rawJson, handleStripeConnectWebhook);
}

app.use(cors({
  origin: env.frontendOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' }));

app.use('/api/stripe', stripeRoutes);

app.use(notFound);
app.use(errorHandler);

export const server = app.listen(env.port, () => {
  console.log(`Stripe backend running on port ${env.port}`);
});
