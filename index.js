require("dotenv").config();
const { GoogleGenAI, Modality } = require("@google/genai");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const awsS3Service = require("./services/AwsS3Service");
const axios = require("axios");

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
const handleErr = require('./middleware/handleErr');

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
routes(app, io);

app.use(handleErr);

app.post("/edit-image", upload.single("image"), async (req, res) => {
  try {
    // Kiểm tra request
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const prompt = req.body.text;
    console.log("🚀 ~ app.post ~ prompt:", prompt);
    console.log(
      "🚀 ~ app.post ~ file:",
      req.file.originalname,
      req.file.mimetype,
      req.file.size
    );

    const imageBuffer = req.file.buffer;

    // Tạo temporary file từ buffer để lưu trữ ảnh gốc nếu cần
    const tempFilePath = path.join(
      __dirname,
      `temp-${Date.now()}-${req.file.originalname}`
    );
    fs.writeFileSync(tempFilePath, imageBuffer);
    console.log(`Temporary file created: ${tempFilePath}`);

    const tempFile = {
      path: tempFilePath,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    };

    const base64Image = imageBuffer.toString("base64");
    console.log(`Base64 image size: ${base64Image.length} characters`);

    // Prepare the content parts
    const contents = [
      { text: prompt },
      {
        inlineData: {
          mimeType: req.file.mimetype || "image/png",
          data: base64Image,
        },
      },
    ];

    // Set responseModalities to include "Image" so the model can generate an image
    console.log("Sending request to Gemini API...");
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    if (
      !response ||
      !response.candidates ||
      !response.candidates[0] ||
      !response.candidates[0].content ||
      !response.candidates[0].content.parts
    ) {
      throw new Error("Invalid response from Gemini API");
    }

    console.log("Received response from Gemini API");

    let imageUrl = null;
    let resultText = null;

    for (const part of response.candidates[0].content.parts) {
      // Based on the part type, either save the text or save the image to S3
      if (part.text) {
        console.log("Text result:", part.text);
        resultText = part.text;
      } else if (part.inlineData) {
        console.log("Processing image data from Gemini API...");
        const imageData = part.inlineData.data;
        if (!imageData) {
          console.error("No image data in the response");
          continue;
        }
        console.log(`Received image data size: ${imageData.length} characters`);



        try {
          // Lưu ảnh đã chỉnh sửa vào S3
          const fileName = `edited-${Date.now()}`;
          const fileExtension = path.extname(req.file.originalname) || ".png";

          console.log(
            `Uploading to S3 with filename: ${fileName}${fileExtension}`
          );

          // Thử lưu ảnh tạm để kiểm tra dữ liệu
          const debugImagePath = path.join(
            __dirname,
            `debug-${fileName}${fileExtension}`
          );
          try {
            fs.writeFileSync(debugImagePath, Buffer.from(imageData, "base64"));
            console.log(`Debug image saved to ${debugImagePath}`);
          } catch (debugErr) {
            console.error("Failed to save debug image:", debugErr);
          }

          imageUrl = await awsS3Service.uploadWithBase64(
            imageData,
            fileName,
            fileExtension
          );

          console.log(`Successfully uploaded to S3: ${imageUrl}`);
        } catch (uploadError) {
          console.error("Error uploading to S3:", uploadError);
          throw uploadError;
        }
      }
    }

    // Xóa file tạm sau khi hoàn thành
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log(`Deleted temporary file: ${tempFilePath}`);
      }
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }

    // Trả về URL của ảnh đã lưu trên S3 và text kết quả (nếu có)
    res.json({
      success: true,
      data: {
        imageUrl,
        text: resultText,
      },
    });
  } catch (error) {
    console.error("Error processing image:", error);

    // Trả về thông tin lỗi chi tiết
    res.status(500).json({
      success: false,
      message: "Error processing image",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});


// Thêm endpoint proxy để giải quyết vấn đề CORS khi truy cập ảnh S3
app.get("/proxy-image", async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res
        .status(400)
        .json({ success: false, message: "URL không hợp lệ" });
    }
    const response = await axios({
      method: "GET",
      url: imageUrl,
      responseType: "arraybuffer",
    });

    // Xác định Content-Type dựa trên URL hoặc từ response
    const contentType =
      response.headers["content-type"] ||
      (imageUrl.endsWith(".png")
        ? "image/png"
        : imageUrl.endsWith(".jpg") || imageUrl.endsWith(".jpeg")
          ? "image/jpeg"
          : "application/octet-stream");

    res.set("Content-Type", contentType);
    res.set("Access-Control-Allow-Origin", "*");
    res.send(response.data);
  } catch (error) {
    console.error("Error proxying image:", error);
    res.status(500).json({
      success: false,
      message: "Không thể tải ảnh từ URL",
      error: error.message,
    });
  }
});

server.listen(port, function () {
  console.log("App listening at http://localhost:" + port);
});
