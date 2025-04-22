require("dotenv").config();
const { GoogleGenAI, Modality } = require("@google/genai");
const fs = require("fs");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });
const ai = new GoogleGenAI({
  apiKey: "AIzaSyAlCktfIQquOYg13Qxkew-HMr5KbV-9zvw",
});

const express = require("express");
const cors = require("cors");
const http = require("http");
const routes = require("./routes");
const db = require("./config/database");
const socketio = require("socket.io");
const socket = require("./app/socket");

const port = process.env.PORT;

const app = express();
const useragent = require("express-useragent");
db.connect();

app.use(cors());
app.use(useragent.express());

app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));

const server = http.createServer(app);
const io = socketio(server);
socket(io);
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.post("/edit-image", upload.single("image"), async (req, res) => {
  const prompt = req.body.text;
  console.log("🚀 ~ app.post ~ prompt:", prompt);

  const imageBuffer = req.file.buffer;
  console.log("🚀 ~ app.post ~ imageBuffer:", imageBuffer);

  const base64Image = imageBuffer.toString("base64");

  // Prepare the content parts
  const contents = [
    { text: prompt },
    {
      inlineData: {
        mimeType: "image/png",
        data: base64Image,
      },
    },
  ];

  // Set responseModalities to include "Image" so the model can generate an image
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp-image-generation",
    contents: contents,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });
  for (const part of response.candidates[0].content.parts) {
    // Based on the part type, either show the text or save the image
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      res.set("Content-Type", part.inlineData.mimeType || "image/png");
      res.send(buffer);
    }
  }
});

routes(app, io);

server.listen(port, function () {
  console.log("App listening at http://localhost:" + port);
});
