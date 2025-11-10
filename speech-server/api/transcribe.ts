const Busboy = require("busboy");
const FormData = require("form-data");
const fetch = require("node-fetch");

module.exports.config = { api: { bodyParser: false } };

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    const bufs = [];
    let filename = "audio.webm";
    let contentType = "audio/webm";

    bb.on("file", (_name, file, info) => {
      filename = (info && (info.filename || info.filename === "")) ? info.filename : filename;
      contentType = (info && (info.mimeType || info.mimeType === "")) ? info.mimeType : contentType;
      file.on("data", (d) => bufs.push(d));
    });
    bb.on("error", reject);
    bb.on("finish", () => {
      if (bufs.length === 0) return reject(new Error("No file uploaded"));
      resolve({ buffer: Buffer.concat(bufs), filename, contentType });
    });

    req.pipe(bb);
  });
}

module.exports = async function handler(req, res) {
  // CORS (for browser uploads)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const { buffer, filename, contentType } = await parseMultipart(req);

    const form = new FormData();
    form.append("file", buffer, { filename, contentType });
    form.append("model", "gpt-4o-mini-transcribe"); // or "whisper-1"
    form.append("language", "en");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form
    });

    const txt = await r.text();
    if (!r.ok) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(r.status).send(txt);
    }

    const data = JSON.parse(txt);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({ text: data.text });
  } catch (e) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).send(e?.message ?? "Transcription failed");
  }
};
