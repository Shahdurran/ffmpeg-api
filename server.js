const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

app.use(express.json());

const uploadDir = path.join(__dirname, "uploads");
const outputDir = path.join(__dirname, "processed");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

app.post("/upload", async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ error: "No video URL provided." });
    }

    const videoFileName = `downloaded-${Date.now()}.mov`;
    const localFilePath = path.join(uploadDir, videoFileName);
    const outputFileName = `processed-${Date.now()}.mp4`;
    const outputFilePath = path.join(outputDir, outputFileName);

    console.log("Downloading video...");
    const response = await axios({
      method: "GET",
      url: videoUrl,
      responseType: "stream",
    });

    const writer = fs.createWriteStream(localFilePath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      console.log("Download complete. Starting processing...");

      ffmpeg(localFilePath)
        .output(outputFilePath)
        .videoCodec("libx265")
        .outputOptions(["-preset slow", "-crf 28"])
        .size("1280x720")
        .on("end", () => {
          console.log("Processing complete. Deleting original file...");

          // Delete the uploaded file after processing
          fs.unlink(localFilePath, (err) => {
            if (err) console.error("Error deleting file:", err.message);
          });

          res.json({
            message: "Processing complete",
            processedFile: `${SERVER_URL}/processed/${outputFileName}`,
          });
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err.message);

          // Ensure uploaded file is deleted even if processing fails
          fs.unlink(localFilePath, (err) => {
            if (err) console.error("Error deleting file:", err.message);
          });

          res.status(500).json({ error: `FFmpeg error: ${err.message}` });
        })
        .run();
    });

    writer.on("error", (err) => {
      console.error("Download error:", err.message);
      res.status(500).json({ error: `Download error: ${err.message}` });
    });
  } catch (error) {
    console.error("Server error:", error.message);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

// Serve processed videos
app.use("/processed", express.static(outputDir));

app.listen(PORT, () => console.log(`Server running on ${SERVER_URL}`));
