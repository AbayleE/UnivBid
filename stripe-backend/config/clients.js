import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { env } from './env.js';

// applicationDefault() reads the service account file named by
// GOOGLE_APPLICATION_CREDENTIALS, or the host's identity on Google Cloud.
const firebaseApp = initializeApp({
  credential: applicationDefault(),
  projectId: env.firebaseProjectId,
});

export const adminAuth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const stripe = new Stripe(env.stripeSecretKey);
