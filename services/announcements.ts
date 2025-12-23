// services/announcements.ts
import { getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getTrainDoc } from "../firebase/config";
import { shouldDisplayAnnouncement, shouldKeepAnnouncement } from "../utils/timeAgo";


export type AnnouncementPriority = "emergency" | "service_change" | "info";


export interface Announcement {
 text: string;
 priority: AnnouncementPriority;
 driverName: string;
 createdAt: number;
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
 driverName: string
): Promise<void> {
 const trainDoc = getTrainDoc(trainNumber);
 const now = Date.now();


 const newAnnouncement: Announcement = { text, priority, driverName, createdAt: now };


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



