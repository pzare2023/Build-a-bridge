import "dotenv/config";
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";

const app = express();
app.use(cors());
app.use(express.json());

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.get("/health", (_req, res) => res.json({ ok: true }));
// server/server.js
app.get("/", (_req, res) => res.send("OK"));


app.post("/chat", async (req, res) => {
  try {
    const { text } = req.body ?? {};
    if (!text) return res.status(400).json({ error: "Missing 'text'" });
    const out = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are the Toronto Transit Companion. English only." },
        { role: "user", content: text }
      ],
      temperature: 0.3
    });
    res.json({ reply: out.choices[0]?.message?.content?.trim() ?? "" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Chat failed" });
  }
});

app.listen(process.env.PORT || 3000, "0.0.0.0", () =>
  console.log("chat server listening")
);

app.use((req, _res, next) => { console.log(req.method, req.url); next(); });
console.log("GROQ key loaded?", !!process.env.GROQ_API_KEY);