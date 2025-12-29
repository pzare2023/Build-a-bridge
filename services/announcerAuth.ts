// IMPORTANT: Import crypto polyfill FIRST before bcrypt
import "react-native-get-random-values";

import bcrypt from "bcryptjs";
import {
  getDocs,
  query,
  where,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  announcersCollection,
  getAnnouncerDoc,
  type AnnouncerDocument,
} from "../firebase/config";

// Configure bcrypt for React Native environment
// The react-native-get-random-values polyfill provides crypto.getRandomValues
bcrypt.setRandomFallback((len: number) => {
  const buf = new Uint8Array(len);
  return Array.from(crypto.getRandomValues(buf));
});

const SALT_ROUNDS = 10;

/**
 * Validate announcer credentials against Firestore
 */
export async function validateAnnouncerCredentials(
  email: string,
  password: string
): Promise<AnnouncerDocument | null> {
  try {
    // Query Firestore for announcer with matching email
    const q = query(announcersCollection, where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("No announcer found with email:", email);
      return null;
    }

    const announcerDoc = querySnapshot.docs[0];
    const announcer = announcerDoc.data();

    // Check if account is active
    if (!announcer.isActive) {
      console.log("Announcer account is inactive:", email);
      return null;
    }

    // Verify password (ensure both are strings for React Native)
    const isPasswordValid = await bcrypt.compare(
      String(password),
      String(announcer.passwordHash)
    );

    if (!isPasswordValid) {
      console.log("Invalid password for announcer:", email);
      return null;
    }

    // Update last login timestamp
    await updateDoc(announcerDoc.ref, {
      lastLogin: Date.now(),
    });

    return announcer;
  } catch (error) {
    console.error("Error validating announcer credentials:", error);
    return null;
  }
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  // Ensure password is a string and generate salt first for React Native compatibility
  const stringPassword = String(password);
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(stringPassword, salt);
}

/**
 * Create a new announcer account
 */
export async function createAnnouncer(
  email: string,
  password: string,
  name: string,
  role: "announcer" | "admin" = "announcer"
): Promise<AnnouncerDocument | null> {
  try {
    // Check if email already exists
    const q = query(announcersCollection, where("email", "==", email.toLowerCase()));
    const existing = await getDocs(q);

    if (!existing.empty) {
      console.error("Announcer with this email already exists:", email);
      return null;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create announcer document
    const announcerData: Omit<AnnouncerDocument, "id"> = {
      email: email.toLowerCase(),
      passwordHash,
      name,
      role,
      createdAt: Date.now(),
      isActive: true,
    };

    const docRef = await addDoc(announcersCollection, announcerData as any);

    // Update with the document ID
    await updateDoc(docRef, { id: docRef.id });

    return {
      ...announcerData,
      id: docRef.id,
    };
  } catch (error) {
    console.error("Error creating announcer:", error);
    return null;
  }
}

/**
 * Get all announcers (for admin dashboard)
 */
export async function getAllAnnouncers(): Promise<AnnouncerDocument[]> {
  try {
    const querySnapshot = await getDocs(announcersCollection);
    return querySnapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error("Error getting all announcers:", error);
    return [];
  }
}

/**
 * Update announcer status (activate/deactivate)
 */
export async function updateAnnouncerStatus(
  announcerId: string,
  isActive: boolean
): Promise<boolean> {
  try {
    const docRef = getAnnouncerDoc(announcerId);
    await updateDoc(docRef, { isActive });
    return true;
  } catch (error) {
    console.error("Error updating announcer status:", error);
    return false;
  }
}

/**
 * Delete announcer account
 */
export async function deleteAnnouncer(announcerId: string): Promise<boolean> {
  try {
    const docRef = getAnnouncerDoc(announcerId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting announcer:", error);
    return false;
  }
}

/**
 * Update announcer password
 */
export async function updateAnnouncerPassword(
  announcerId: string,
  newPassword: string
): Promise<boolean> {
  try {
    const passwordHash = await hashPassword(newPassword);
    const docRef = getAnnouncerDoc(announcerId);
    await updateDoc(docRef, { passwordHash });
    return true;
  } catch (error) {
    console.error("Error updating announcer password:", error);
    return false;
  }
}
