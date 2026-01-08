// services/announcements.ts
import { getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import type { TTCLine } from "../constants/ttcLines";
import { db, getTrainDoc } from "../firebase/config";
import { shouldDisplayAnnouncement, shouldKeepAnnouncement } from "../utils/timeAgo";


export type AnnouncementPriority = "emergency" | "service_change" | "info";


export interface Announcement {
  text: string;
  priority: AnnouncementPriority;
  driverName: string;
  createdAt: number;
  announcerId?: string;
  announcerEmail?: string;
  lineNumber?: TTCLine;
}


export interface TrainDocument {
  announcements: Announcement[];
  updatedAt: any;
}


const MAX_ANNOUNCEMENTS = 20;


export async function saveAnnouncement(
  trainNumber: string,
  text: string,
  priority: AnnouncementPriority,
  driverName: string,
  announcerId?: string,
  announcerEmail?: string,
  lineNumber?: TTCLine
): Promise<void> {
  const trainDoc = getTrainDoc(trainNumber);
  const now = Date.now();


  const newAnnouncement: Announcement = {
    text,
    priority,
    driverName,
    createdAt: now,
    ...(announcerId && { announcerId }),
    ...(announcerEmail && { announcerEmail }),
    ...(lineNumber && { lineNumber })
  };


  try {
    const docSnapshot = await getDoc(trainDoc);


    let announcements: Announcement[] = [];
    if (docSnapshot.exists()) {
      const data = docSnapshot.data() as Partial<TrainDocument>;
      announcements = data.announcements || [];
    }


    announcements.push(newAnnouncement);
    announcements = announcements.filter((a) => shouldKeepAnnouncement(a.createdAt));


    if (announcements.length > MAX_ANNOUNCEMENTS) {
      announcements = announcements.slice(-MAX_ANNOUNCEMENTS);
    }


    announcements.sort((a, b) => b.createdAt - a.createdAt);


    await setDoc(
      trainDoc,
      { announcements, updatedAt: serverTimestamp() },
      { merge: true }
    );

    // If this is a line-specific announcement, also save it to the lines collection
    if (lineNumber) {
      const { collection, doc, setDoc: setDocFirestore } = await import("firebase/firestore");
      const lineAnnouncementRef = doc(collection(db, "lines", lineNumber, "announcements"), `${now}`);
      await setDocFirestore(lineAnnouncementRef, {
        ...newAnnouncement,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error saving announcement:", error);
    throw error;
  }
}


export function subscribeToAnnouncements(
  trainNumber: string,
  onUpdate: (announcements: Announcement[]) => void,
  onError?: (error: Error) => void
): () => void {
  const trainDoc = getTrainDoc(trainNumber);


  const unsubscribe = onSnapshot(
    trainDoc,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<TrainDocument>;
        let announcements = data.announcements || [];


        announcements = announcements.filter((a) => shouldDisplayAnnouncement(a.createdAt));
        announcements.sort((a, b) => b.createdAt - a.createdAt);


        onUpdate(announcements);
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      console.error("Error subscribing to announcements:", error);
      onError?.(error as unknown as Error);
    }
  );


  return unsubscribe;
}

// Subscribe to line-specific announcements
export async function subscribeToLineAnnouncements(
  lineNumber: TTCLine,
  onUpdate: (announcements: Announcement[]) => void,
  onError?: (error: Error) => void
): Promise<() => void> {
  // Import Firestore functions dynamically
  const { collection, onSnapshot: onSnapshotFirestore } = await import("firebase/firestore");

  // Subscribe to the lines collection for this specific line
  const lineAnnouncementsCollection = collection(db, "lines", lineNumber, "announcements");

  const unsubscribe = onSnapshotFirestore(
    lineAnnouncementsCollection,
    (snapshot) => {
      let announcements: Announcement[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as Announcement;
        announcements.push(data);
      });

      // Filter by time (last hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      announcements = announcements.filter((a) => a.createdAt >= oneHourAgo);
      announcements.sort((a, b) => b.createdAt - a.createdAt);

      onUpdate(announcements);
    },
    (error) => {
      console.error("Error subscribing to line announcements:", error);
      onError?.(error as unknown as Error);
    }
  );

  return unsubscribe;
}

// Subscribe to combined announcements (both line and train)
export async function subscribeToCombinedAnnouncements(
  lineNumber: TTCLine,
  trainNumber: string,
  onUpdate: (announcements: Announcement[]) => void,
  onError?: (error: Error) => void
): Promise<() => void> {
  let lineAnnouncements: Announcement[] = [];
  let trainAnnouncements: Announcement[] = [];

  const combineAndUpdate = () => {
    const combined = [...lineAnnouncements, ...trainAnnouncements];
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const filtered = combined.filter((a) => a.createdAt >= oneHourAgo);
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    onUpdate(filtered);
  };

  let unsubscribeLine: (() => void) | null = null;
  let unsubscribeTrain: (() => void) | null = null;

  try {
    // Await the async subscribeToLineAnnouncements
    unsubscribeLine = await subscribeToLineAnnouncements(
      lineNumber,
      (announcements) => {
        lineAnnouncements = announcements;
        combineAndUpdate();
      },
      onError
    );
  } catch (error) {
    console.error("Error subscribing to line announcements:", error);
    onError?.(error as Error);
  }

  try {
    unsubscribeTrain = subscribeToAnnouncements(
      trainNumber,
      (announcements) => {
        trainAnnouncements = announcements;
        combineAndUpdate();
      },
      onError
    );
  } catch (error) {
    console.error("Error subscribing to train announcements:", error);
    onError?.(error as Error);
  }

  return () => {
    if (unsubscribeLine && typeof unsubscribeLine === 'function') {
      unsubscribeLine();
    }
    if (unsubscribeTrain && typeof unsubscribeTrain === 'function') {
      unsubscribeTrain();
    }
  };
}


export async function getAnnouncements(trainNumber: string): Promise<Announcement[]> {
  const trainDoc = getTrainDoc(trainNumber);


  try {
    const snapshot = await getDoc(trainDoc);


    if (!snapshot.exists()) return [];


    const data = snapshot.data() as Partial<TrainDocument>;
    let announcements = data.announcements || [];


    announcements = announcements.filter((a) => shouldDisplayAnnouncement(a.createdAt));
    announcements.sort((a, b) => b.createdAt - a.createdAt);


    return announcements;
  } catch (error) {
    console.error("Error getting announcements:", error);
    throw error;
  }
}


export async function deleteAnnouncement(
  trainNumber: string,
  announcementToDelete: Announcement
): Promise<void> {
  const trainDoc = getTrainDoc(trainNumber);


  try {
    const docSnapshot = await getDoc(trainDoc);


    if (!docSnapshot.exists()) {
      throw new Error("Train document not found");
    }


    const data = docSnapshot.data() as Partial<TrainDocument>;
    let announcements = data.announcements || [];


    // Find and remove the announcement by matching createdAt timestamp
    // This is more reliable than using an index
    announcements = announcements.filter(
      (a) => a.createdAt !== announcementToDelete.createdAt
    );


    // Update the document
    await setDoc(
      trainDoc,
      { announcements, updatedAt: serverTimestamp() },
      { merge: true }
    );

    // If this was a line-specific announcement, also delete it from the lines collection
    if (announcementToDelete.lineNumber) {
      const { collection, doc, deleteDoc } = await import("firebase/firestore");
      const lineAnnouncementRef = doc(
        collection(db, "lines", announcementToDelete.lineNumber, "announcements"),
        `${announcementToDelete.createdAt}`
      );
      await deleteDoc(lineAnnouncementRef);
    }
  } catch (error) {
    console.error("Error deleting announcement:", error);
    throw error;
  }
}