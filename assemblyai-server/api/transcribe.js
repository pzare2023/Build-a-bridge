// api/transcribe.js (Vercel Serverless Function)

const formidable = require("formidable");
const fs = require("fs");

// Vercel will call this function on POST /api/transcribe
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Parse multipart/form-data (file upload)
  const form = formidable({ multiples: false });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(400).json({ error: "Bad request" });
    }

    // We support both "audio" (Expo app) and "file" (old web recorder)
    const file = files.audio || files.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    handleTranscription(file, res);
  });
};

async function handleTranscription(file, res) {
  try {
    // 1️⃣ Upload file to AssemblyAI
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
      },
      body: fs.createReadStream(file.filepath),
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

    // 3️⃣ Poll for completion (short, to avoid Vercel timeout)
    let status = transcriptData.status;
    let finalText = "";
    const maxChecks = 15; // ~30s total (15 * 2s)
    let attempts = 0;

    while (status !== "completed" && status !== "failed" && attempts < maxChecks) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;

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

    // If it’s still not done, return 202 so client knows it’s in progress
    if (status !== "completed") {
      return res.status(202).json({
        status,
        text: finalText || null,
        message: "Transcription still processing; try again with same audio later.",
      });
    }

    return res.status(200).json({ text: finalText });
  } catch (err) {
    console.error("Transcription error:", err);
    return res.status(500).json({ error: "Server error" });
  } finally {
    // Clean up temp file
    if (file && file.filepath) {
      fs.unlink(file.filepath, () => {});
    }
  }
}
