const express = require("express");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please provide a message.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is missing.");

      return res.status(503).json({
        error: "AI service is not configured.",
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are MADAI, a helpful AI assistant. Help users answer questions, write code, build websites, and plan business workflows. Never claim to have executed code or changed a website unless that action was actually performed.",
            },
            {
              role: "user",
              content: message.trim(),
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", response.status, data.error?.message);

      return res.status(502).json({
        error: "MADAI could not get an AI response. Please try again.",
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: "MADAI received an empty response.",
      });
    }

    return res.status(200).json({
      reply,
    });
  } catch (error) {
    console.error("MADAI chat error:", error.message);

    return res.status(500).json({
      error: "An unexpected error occurred. Please try again.",
    });
  }
});

module.exports = router;
