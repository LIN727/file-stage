const { GridFsStorage } = require("multer-gridfs-storage");
const multer = require("multer");

const url = require("./db-client").db_url;

if (!url) {
  console.log("MongoDB URL is missing");
  process.exit(1);
}

const storage = new GridFsStorage({
  url,
  file: (_req, file) => {
    return {
      bucketName: "uploads",
      filename: Buffer.from(file.originalname, "binary").toString("utf-8"),
    };
  },
});

module.exports = multer({ storage });
