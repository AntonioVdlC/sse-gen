import express from "express";
import cors from "cors";

const app = express();

app.use(cors());

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send a message every 1 seconds
  const intervalId = setInterval(() => {
    const date = new Date();
    res.write(`data: ${JSON.stringify({ time: date.toISOString() })}\n\n`);
  }, 1000);

  // Clean up on close
  req.on("close", () => {
    clearInterval(intervalId);
    res.end();
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
