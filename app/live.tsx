<<<<<<< HEAD
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useUserRole } from "../context/UserRoleContext";

const TRANSCRIBE_URL =
  "https://build-a-bridge-backend.vercel.app/api/transcribe";
=======
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
<<<<<<< HEAD
>>>>>>> 661e891 (Save local changes before pulling)

export default function Live() {
  const { role } = useUserRole();
  const isPassenger = role === "passenger";

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isUploading, setIsUploading] = useState(false);

<<<<<<< HEAD
  const startRecording = async () => {
    if (isPassenger) {
      // Safety: passengers shouldn't record
      setTranscript(
        transcript || "Passenger mode – announcements will appear here…"
      );
      return;
    }

=======
  const TRANSCRIBE_URL =
    "https://build-a-bridge-backend.vercel.app/api/transcribe";

  async function startRecording() {
>>>>>>> 661e891 (Save local changes before pulling)
    try {
      // Request mic permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setTranscript("Microphone permission denied.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );

      setRecording(recording);
      setTranscript("Listening…");
    } catch (err) {
      console.error("Recording start error:", err);
      setTranscript("Could not start recording.");
    }
  };

<<<<<<< HEAD
  const stopRecording = async () => {
=======
  async function stopRecording() {
>>>>>>> 661e891 (Save local changes before pulling)
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        setTranscript("No audio URI found.");
        return;
      }

      setIsUploading(true);
      setTranscript("Transcribing…");

      const formData = new FormData();
      formData.append("audio", {
        uri,
        name: "audio.m4a",
        type: "audio/m4a",
      } as any);

      const res = await fetch(TRANSCRIBE_URL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server Error:", res.status, errorText);
        setTranscript(`Server Error (${res.status})`);
        return;
      }

<<<<<<< HEAD
      const data = (await res.json()) as { text?: string };
      setTranscript(data.text || "(No transcription)");
    } catch (err) {
      console.error("Stop recording / upload error:", err);
=======
      const data = await res.json();
      setTranscript(data.text || "(No transcription)");
    } catch (err) {
      console.error("Stop recording error:", err);
>>>>>>> 661e891 (Save local changes before pulling)
      setTranscript("Transcription failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
<<<<<<< HEAD
      <Text style={styles.heading}>
        {isPassenger ? "Live Announcements" : "Live Announcements (EN)"}
      </Text>

      <Text style={styles.modeLabel}>
        {isPassenger
          ? "Passenger mode – read-only transcript."
          : "Announcer mode – capture and send new announcements."}
      </Text>

      {/* ANNOUNCER: mic controls */}
      {!isPassenger && (
        <>
          <TouchableOpacity
            style={[
              styles.micButton,
              recording ? styles.micActive : styles.micIdle,
            ]}
            onPress={recording ? stopRecording : startRecording}
            disabled={isUploading}
          >
            <Ionicons
              name={recording ? "mic" : "mic-outline"}
              size={60}
              color="#fff"
              style={{ marginLeft: 2 }}
            />
          </TouchableOpacity>

          <Text style={styles.instructionText}>
            {recording
              ? "Recording… tap to stop"
              : "Tap the mic to start recording"}
          </Text>
        </>
      )}

      {/* PASSENGER: no mic, just info */}
      {isPassenger && (
        <Text style={styles.instructionText}>
          Live announcements will be shown below when available.
        </Text>
      )}

      {/* Transcript box */}
      <View style={styles.transcriptBox}>
        <Text style={styles.transcriptText}>
          {transcript ||
            (isPassenger
              ? "Announcements will appear here…"
              : "Your transcription will appear here…")}
        </Text>
      </View>

      {/* Loading spinner */}
=======
      {/* Microphone Button at the Top */}
      <TouchableOpacity
    style={[
    styles.micButton,
    recording ? styles.micActive : styles.micIdle,
    ]}
    onPress={recording ? stopRecording : startRecording}
    disabled={isUploading}
    >
  <Ionicons
    name={recording ? "mic" : "mic-outline"}
    size={60}         // <-- Bigger icon
    color="#fff"
    style={{ marginLeft: 2 }}  // Center adjustment
      />
    </TouchableOpacity>
=======
import { useUserRole } from "../context/UserRoleContext";


const TRANSCRIBE_URL =
 "https://build-a-bridge-backend.vercel.app/api/transcribe";


export default function Live() {
 const { role } = useUserRole();
 const isPassenger = role === "passenger";
>>>>>>> cd12398 (Updated Live)


 const [recording, setRecording] = useState<Audio.Recording | null>(null);
 const [transcript, setTranscript] = useState("");
 const [isUploading, setIsUploading] = useState(false);


<<<<<<< HEAD
      {/* Loading Spinner */}
>>>>>>> 661e891 (Save local changes before pulling)
      {isUploading && (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      )}
    </View>
  );
=======
 const startRecording = async () => {
   if (isPassenger) {
     // Safety: passengers shouldn't record
     setTranscript(
       transcript || "Passenger mode – announcements will appear here…"
     );
     return;
   }


   try {
     // Request mic permissions
     const { status } = await Audio.requestPermissionsAsync();
     if (status !== "granted") {
       setTranscript("Microphone permission denied.");
       return;
     }


     await Audio.setAudioModeAsync({
       allowsRecordingIOS: true,
       playsInSilentModeIOS: true,
     });


     const { recording } = await Audio.Recording.createAsync(
       Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
     );


     setRecording(recording);
     setTranscript("Listening…");
   } catch (err) {
     console.error("Recording start error:", err);
     setTranscript("Could not start recording.");
   }
 };


 const stopRecording = async () => {
   if (!recording) return;


   try {
     await recording.stopAndUnloadAsync();
     const uri = recording.getURI();
     setRecording(null);


     if (!uri) {
       setTranscript("No audio URI found.");
       return;
     }


     setIsUploading(true);
     setTranscript("Transcribing…");


     const formData = new FormData();
     formData.append("audio", {
       uri,
       name: "audio.m4a",
       type: "audio/m4a",
     } as any);


     const res = await fetch(TRANSCRIBE_URL, {
       method: "POST",
       body: formData,
     });


     if (!res.ok) {
       const errorText = await res.text();
       console.error("Server Error:", res.status, errorText);
       setTranscript(`Server Error (${res.status})`);
       return;
     }


     const data = (await res.json()) as { text?: string };
     setTranscript(data.text || "(No transcription)");
   } catch (err) {
     console.error("Stop recording / upload error:", err);
     setTranscript("Transcription failed.");
   } finally {
     setIsUploading(false);
   }
 };


 return (
   <View style={styles.container}>
     <Text style={styles.heading}>
       {isPassenger ? "Live Announcements" : "Live Announcements (EN)"}
     </Text>


     <Text style={styles.modeLabel}>
       {isPassenger
         ? "Passenger mode – read-only transcript."
         : "Announcer mode – capture and send new announcements."}
     </Text>


     {/* ANNOUNCER: mic controls */}
     {!isPassenger && (
       <>
         <TouchableOpacity
           style={[
             styles.micButton,
             recording ? styles.micActive : styles.micIdle,
           ]}
           onPress={recording ? stopRecording : startRecording}
           disabled={isUploading}
         >
           <Ionicons
             name={recording ? "mic" : "mic-outline"}
             size={60}
             color="#fff"
             style={{ marginLeft: 2 }}
           />
         </TouchableOpacity>


         <Text style={styles.instructionText}>
           {recording
             ? "Recording… tap to stop"
             : "Tap the mic to start recording"}
         </Text>
       </>
     )}


     {/* PASSENGER: no mic, just info */}
     {isPassenger && (
       <Text style={styles.instructionText}>
         Live announcements will be shown below when available.
       </Text>
     )}


     {/* Transcript box */}
     <View style={styles.transcriptBox}>
       <Text style={styles.transcriptText}>
         {transcript ||
           (isPassenger
             ? "Announcements will appear here…"
             : "Your transcription will appear here…")}
       </Text>
     </View>


     {/* Loading spinner */}
     {isUploading && (
       <ActivityIndicator size="large" style={{ marginTop: 20 }} />
     )}
   </View>
 );
>>>>>>> cd12398 (Updated Live)
}


const styles = StyleSheet.create({
<<<<<<< HEAD
  container: {
    flex: 1,
<<<<<<< HEAD
    paddingTop: 80,
=======
    paddingTop: 100,
>>>>>>> 661e891 (Save local changes before pulling)
    paddingHorizontal: 25,
    alignItems: "center",
    backgroundColor: "#fff",
  },
<<<<<<< HEAD
  heading: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  modeLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginBottom: 20,
  },
  micIdle: {
    backgroundColor: "#1E90FF",
  },
  micActive: {
    backgroundColor: "#FF3B30",
    shadowColor: "#FF3B30",
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  instructionText: {
    fontSize: 16,
    marginBottom: 20,
    color: "#444",
    textAlign: "center",
  },
  transcriptBox: {
    width: "100%",
    minHeight: 220,
=======

  micButton: {
  width: 120,
  height: 120,
  borderRadius: 60,
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOpacity: 0.3,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 8,
  marginBottom: 20,
},

micIdle: {
  backgroundColor: "#1E90FF",
},

micActive: {
  backgroundColor: "#FF3B30",
  shadowColor: "#FF3B30",
  shadowOpacity: 0.6,
  shadowRadius: 20,
},


  instructionText: {
    fontSize: 18,
    marginBottom: 30,
    color: "#444",
  },

  transcriptBox: {
    width: "100%",
    minHeight: 250,
>>>>>>> 661e891 (Save local changes before pulling)
    borderColor: "#CCC",
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    justifyContent: "flex-start",
  },
<<<<<<< HEAD
=======

>>>>>>> 661e891 (Save local changes before pulling)
  transcriptText: {
    fontSize: 17,
    color: "#333",
    lineHeight: 24,
  },
=======
 container: {
   flex: 1,
   paddingTop: 80,
   paddingHorizontal: 25,
   alignItems: "center",
   backgroundColor: "#fff",
 },
 heading: {
   fontSize: 22,
   fontWeight: "600",
   marginBottom: 4,
   textAlign: "center",
 },
 modeLabel: {
   fontSize: 14,
   color: "#666",
   marginBottom: 24,
   textAlign: "center",
   paddingHorizontal: 20,
 },
 micButton: {
   width: 120,
   height: 120,
   borderRadius: 60,
   justifyContent: "center",
   alignItems: "center",
   shadowColor: "#000",
   shadowOpacity: 0.3,
   shadowRadius: 12,
   shadowOffset: { width: 0, height: 4 },
   elevation: 8,
   marginBottom: 20,
 },
 micIdle: {
   backgroundColor: "#1E90FF",
 },
 micActive: {
   backgroundColor: "#FF3B30",
   shadowColor: "#FF3B30",
   shadowOpacity: 0.6,
   shadowRadius: 20,
 },
 instructionText: {
   fontSize: 16,
   marginBottom: 20,
   color: "#444",
   textAlign: "center",
 },
 transcriptBox: {
   width: "100%",
   minHeight: 220,
   borderColor: "#CCC",
   borderWidth: 1,
   borderRadius: 12,
   padding: 15,
   justifyContent: "flex-start",
 },
 transcriptText: {
   fontSize: 17,
   color: "#333",
   lineHeight: 24,
 },
>>>>>>> cd12398 (Updated Live)
});



