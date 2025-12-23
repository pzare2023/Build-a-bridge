// firebase/config.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  collection,
  doc,
  initializeFirestore,
  setLogLevel,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
} from "firebase/firestore";

/**
 * Firebase config
 * MUST use EXPO_PUBLIC_ variables for Expo Go
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

// --- DEBUG (temporary, safe to remove later) ---
console.log("🔥 Firebase projectId:", firebaseConfig.projectId);

// Initialize Firebase app (safe for Fast Refresh)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Optional but VERY helpful while debugging
setLogLevel("debug");

// ✅ CRITICAL FOR EXPO GO / REACT NATIVE
// Fixes: "Failed to get document because the client is offline"
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

// ----------------- TYPES -----------------

export type AnnouncementPriority = "emergency" | "service_change" | "info";

export interface Announcement {
  text: string;
  priority: AnnouncementPriority;
  driverName: string;
  createdAt: number;
}

export interface TrainDocument {
  announcements: Announcement[];
  updatedAt: any; // serverTimestamp()
}

// ----------------- REFERENCES -----------------

export const trainsCollection = collection(
  db,
  "trains"
) as CollectionReference<TrainDocument>;

export const getTrainDoc = (trainNumber: string) =>
  doc(trainsCollection, trainNumber) as DocumentReference<TrainDocument>;
