import { db } from '../config/clients.js';

const RETENTION_DAYS = 30;

// HookGuard idempotency store backed by Firestore, so an event id is handled
// once even when several Cloud Run instances receive the same retry.
// create() fails when the document exists, which is the claim.
// Add a Firestore TTL policy on expiresAt to keep the collection small.
export const webhookEventStore = {
  async claim(key, event) {
    const ref = db.collection('webhook_events').doc(key.replaceAll('/', '_'));
    try {
      await ref.create({
        provider: event.provider,
        type: event.type,
        receivedAt: new Date(),
        expiresAt: new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
      });
      return true;
    } catch (error) {
      if (error?.code === 6 || /already exists/i.test(error?.message || '')) return false;
      throw error;
    }
  },

  // A failed handler releases the claim so Stripe's retry can run it again.
  async release(key) {
    await db.collection('webhook_events').doc(key.replaceAll('/', '_')).delete();
  },
};

// Rejected requests (bad signature, stale timestamp, missing header) are
// expected noise from scanners and misconfigured senders. Handler failures are
// the ones worth paging on.
// Replace with an alerting sink (Error Reporting, Sentry, Slack) in production.
export const reportWebhookError = (error, event) => {
  const rejected = /Signature|Timestamp|MissingHeader|Payload/.test(error.name);
  console.error(JSON.stringify({
    severity: rejected ? 'WARNING' : 'ERROR',
    message: `[webhook] ${error.message}`,
    provider: event?.provider,
    eventId: event?.id,
    eventType: event?.type,
    ...(rejected ? {} : { stack: error.stack }),
  }));
};
