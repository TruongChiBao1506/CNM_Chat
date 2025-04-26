const fs = require("fs");
const S3 = require("aws-sdk/clients/s3");
const MyError = require("../exception/MyError");
const BucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

// Kiểm tra xem các thông số kết nối AWS đã được cấu hình đúng chưa
if (!BucketName || !region || !accessKeyId || !secretAccessKey) {
  console.error(
    "AWS configuration missing. Please check your environment variables."
  );
  console.error(`Bucket: ${BucketName ? "OK" : "MISSING"}`);
  console.error(`Region: ${region ? "OK" : "MISSING"}`);
  console.error(`Access Key: ${accessKeyId ? "OK" : "MISSING"}`);
  console.error(`Secret Key: ${secretAccessKey ? "OK" : "MISSING"}`);
}

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

const FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024; // Mặc định 20MB nếu không được thiết lập

class AwsS3Service {
  constructor() {
    // Thiết lập cấu hình CORS cho S3 bucket khi khởi tạo service
    this.configureBucketCors();
    // Kiểm tra bucket có tồn tại không
    this.checkBucketExists();
  }

  // Thêm phương thức kiểm tra bucket tồn tại
  async checkBucketExists() {
    try {
      await s3.headBucket({ Bucket: BucketName }).promise();
      console.log(`S3 bucket ${BucketName} exists and is accessible`);
    } catch (err) {
      console.error(`Error accessing S3 bucket ${BucketName}:`, err.message);
      // Không throw lỗi để service vẫn hoạt động
    }
  }

  // Thêm phương thức cấu hình CORS cho S3 bucket
  async configureBucketCors() {
    try {
      const corsParams = {
        Bucket: BucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
              AllowedOrigins: [
                "http://localhost:3000", // React app development
                "http://localhost:3001", // API server
                process.env.REACT_APP_FRONTEND_URL || "*", // Production URL nếu có
              ],
              ExposeHeaders: ["ETag", "x-amz-meta-custom-header"],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      };

      await s3.putBucketCors(corsParams).promise();
      console.log("S3 bucket CORS configured successfully");
    } catch (err) {
      console.error("Error configuring S3 bucket CORS:", err.message);
      if (err.code === "AccessDenied") {
        console.warn(
          "Access denied to configure CORS. Check your AWS permissions."
        );
      }
      // Không throw lỗi ở đây để vẫn cho phép service chạy nếu không có quyền cấu hình CORS
    }
  }

  async uploadFile(file, bucketName = BucketName) {
    const fileStream = fs.readFileSync(file.path);

    const uploadParams = {
      Bucket: bucketName,
      Body: fileStream,
      Key: `zelo-${Date.now()}-${file.originalname}`,
      // Đã loại bỏ ACL vì bucket có thể không cho phép ACLs
    };

    const { mimetype } = file;
    if (
      mimetype === "image/jpeg" ||
      mimetype === "image/png" ||
      mimetype === "image/gif" ||
      mimetype === "video/mp3" ||
      mimetype === "video/mp4"
    )
      uploadParams.ContentType = mimetype;

    try {
      const { Location } = await s3.upload(uploadParams).promise();
      console.log(`File uploaded successfully to ${Location}`);
      return Location;
    } catch (err) {
      console.error("Error uploading file to S3:", err);
      throw new MyError("Upload file Aws S3 failed");
    }
  }

  async uploadWithBase64(fileBase64, fileName, fileExtension) {
    try {
      // Kiểm tra tham số đầu vào
      if (!fileBase64) {
        throw new Error("Missing base64 file data");
      }
      if (!fileName) {
        throw new Error("Missing file name");
      }
      if (!fileExtension) {
        fileExtension = ".png"; // Mặc định là png nếu không có phần mở rộng
      }

      const fileBuffer = Buffer.from(fileBase64, "base64");

      if (fileBuffer.length > FILE_SIZE) {
        throw new MyError(
          `File size exceeds limit (${FILE_SIZE / 1024 / 1024}MB)`
        );
      }

      // Xác định Content-Type dựa trên phần mở rộng
      let contentType = "application/octet-stream"; // Mặc định
      if (fileExtension === ".png") contentType = "image/png";
      if (fileExtension === ".jpg" || fileExtension === ".jpeg")
        contentType = "image/jpeg";
      if (fileExtension === ".gif") contentType = "image/gif";
      if (fileExtension === ".mp3") contentType = "audio/mpeg";
      if (fileExtension === ".mp4") contentType = "video/mp4";

      const uploadParams = {
        Bucket: BucketName,
        Body: fileBuffer,
        Key: `zelo-${Date.now()}-${fileName}${fileExtension}`,
        ContentType: contentType,
        // Đã loại bỏ ACL vì bucket có thể không cho phép ACLs
      };

      console.log(
        `Uploading ${fileName}${fileExtension} to S3 bucket ${BucketName}...`
      );

      const uploadResult = await s3.upload(uploadParams).promise();
      console.log(`File uploaded successfully to ${uploadResult.Location}`);

      return uploadResult.Location;
    } catch (err) {
      console.error("Error in uploadWithBase64:", err);
      if (err instanceof MyError) {
        throw err; // Re-throw MyError instances
      }
      throw new MyError(`Upload file Aws S3 failed: ${err.message}`);
    }
  }

  async deleteFile(url, bucketName = BucketName) {
    if (!url) {
      console.error("Invalid URL provided to deleteFile");
      return;
    }

    const urlSplit = url.split("/");
    const key = urlSplit[urlSplit.length - 1];

    const params = {
      Bucket: bucketName,
      Key: key,
    };

    try {
      await s3.deleteObject(params).promise();
      console.log(`Successfully deleted file ${key} from bucket ${bucketName}`);
    } catch (err) {
      console.error(`Error deleting file ${key} from S3:`, err);
      throw new MyError("Delete file Aws S3 failed");
    }
  }
}

module.exports = new AwsS3Service();
