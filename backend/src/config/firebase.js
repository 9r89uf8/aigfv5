/**
 * Firebase Admin SDK initialization
 * Manages Firebase app instance and provides auth/firestore access
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from './environment.js';
import logger from '../utils/logger.js';

let firebaseApp = null;
let auth = null;
let firestore = null;

/**
 * Initializes Firebase Admin SDK
 * @returns {Object} Firebase services
 */
export const initializeFirebase = () => {
  try {
    if (firebaseApp) {
      return { firebaseApp, auth, firestore };
    }

    // Build service account credentials
    const serviceAccount = {
      type: 'service_account',
      project_id: config.firebase.projectId,
      private_key_id: config.firebase.privateKeyId,
      private_key: config.firebase.privateKey,
      client_email: config.firebase.clientEmail,
      client_id: config.firebase.clientId,
      auth_uri: config.firebase.authUri,
      token_uri: config.firebase.tokenUri,
      auth_provider_x509_cert_url: config.firebase.authProviderCertUrl,
      client_x509_cert_url: config.firebase.clientCertUrl
    };

    // Initialize Firebase app
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: config.firebase.projectId
    });

    // Initialize services
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);

    // Configure Firestore settings
    firestore.settings({
      ignoreUndefinedProperties: true
    });

    logger.info('Firebase Admin SDK initialized successfully');
    
    return { firebaseApp, auth, firestore };
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error(`Firebase initialization failed: ${error.message}`);
  }
};

/**
 * Get Firebase Auth instance
 * @returns {Auth} Firebase Auth instance
 */
export const getFirebaseAuth = () => {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
};

/**
 * Get Firestore instance
 * @returns {Firestore} Firestore instance
 */
export const getFirebaseFirestore = () => {
  if (!firestore) {
    initializeFirebase();
  }
  
  // Temporary logging to trace Firestore usage
  const stack = new Error().stack;
  logger.info('Firestore instance requested', { 
    caller: stack.split('\n')[2].trim() 
  });

  return firestore;
};

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token
 * @returns {Promise<DecodedIdToken>} Decoded token
 */
export const verifyIdToken = async (idToken) => {
  try {
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    logger.error('Token verification failed:', error);
    throw error;
  }
};

export default {
  initializeFirebase,
  getFirebaseAuth,
  getFirebaseFirestore,
  verifyIdToken
}; 