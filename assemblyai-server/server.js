import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import multer from "multer";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// enable CORS so your Expo app can call this API
app.use(cors());

// allow JSON bodies
app.use(express.json());

// multer stores uploaded files temporarily
const upload = multer({ dest: "uploads/" });

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const filePath = req.file.path;

    // 1️⃣ Upload audio file to AssemblyAI
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
      },
      body: fs.createReadStream(filePath),
    });

    const uploadData = await uploadRes.json();
    const audioUrl = uploadData.upload_url;

    // 2️⃣ Request transcription
    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ audio_url: audioUrl }),
    });

    const transcriptData = await transcriptRes.json();

    // 3️⃣ Poll until transcription completes
    let status = transcriptData.status;
    let finalText = "";

    while (status !== "completed" && status !== "failed") {
      await new Promise((r) => setTimeout(r, 2000));

      const checkRes = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptData.id}`,
        {
          headers: { authorization: process.env.ASSEMBLYAI_API_KEY },
        }
      );

      const checkData = await checkRes.json();
      status = checkData.status;
      finalText = checkData.text || "";
    }

    // delete temp file
    fs.unlinkSync(filePath);

    if (status === "failed") {
      return res.status(500).json({ error: "Transcription failed" });
    }

    return res.json({ text: finalText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));