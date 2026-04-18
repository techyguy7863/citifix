const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const Groq = require("groq-sdk");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are CitiFix AI Assistant — a helpful, friendly civic engagement assistant.

Your role is to help citizens:
- Report civic issues (potholes, broken streetlights, garbage, water leaks, etc.)
- Understand complaint statuses (OPEN, ASSIGNED, RESOLVED, ESCALATED)
- Learn how to earn reward points for active civic participation
- Navigate the CitiFix platform features
- Understand how complaints get escalated to authorities or posted on X (Twitter)

Keep responses concise, helpful, and focused on civic issues. 
If asked about non-civic topics, gently redirect to civic matters.
Always be encouraging and positive about civic engagement.`;

// Stateless chat — messages are managed on the frontend, no DB storage
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const cleanMessage = String(message).trim();

    // Build context from frontend-provided history (last 10 exchanges max)
    const contextMessages = history
      .slice(-10)
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      }));

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...contextMessages,
        { role: "user", content: cleanMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const assistantText =
      completion.choices[0]?.message?.content ||
      "Sorry, I could not generate a response right now. Please try again.";

    res.json({ reply: assistantText });
  } catch (error) {
    console.error("Chat error:", error?.message || error);
    res.status(500).json({
      error: error?.message || "Chat request failed. Please try again.",
    });
  }
});

module.exports = router;
