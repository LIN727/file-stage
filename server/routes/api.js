const express = require("express");
const router = express.Router();

const MongoGridFS = require("mongodb").GridFSBucket;
const ObjectId = require("mongodb").ObjectId;

const upload = require("../database/multer");
const dbClient = require("../database/db-client").dbClient;

router.post("/asset", upload.single("asset"), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send("File not uploaded");
  }
  const data = {
    message: "File uploaded successfully",
    id: file.id,
    name: file.filename,
    contentType: file.contentType,
  };
  req.socketChannel.emit("new-file", data);
  res.json(data);
});

router.get("/assets", async (req, res) => {
  try {
    await dbClient.connect();
    const collection = dbClient.db("file-stage").collection("uploads.files");
    const docs = await collection.find({}).toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).send("Failed to connect to database");
  }
});

router.get("/assets/:id", async (req, res) => {
  try {
    await dbClient.connect();
    const database = dbClient.db("file-stage");
    const bucket = new MongoGridFS(database, {
      bucketName: "uploads",
    });
    const downloadStream = bucket.openDownloadStream(
      new ObjectId(req.params.id)
    );
    downloadStream.on("data", (chunk) => {
      res.status(200).write(chunk);
    });
    downloadStream.on("error", () => {
      res.sendStatus(404);
    });
    downloadStream.on("end", () => {
      res.end();
    });
  } catch (err) {
    res.status(500).send("Failed to connect to database");
  }
});

router.delete("/assets/:id", async (req, res) => {
  try {
    await dbClient.connect();
    const collection = dbClient.db("file-stage").collection("uploads.files");
    const result = await collection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    if (result.deletedCount === 1) {
      res.status(200).send("File deleted successfully");
      req.socketChannel.emit("delete-file", req.params.id);
    } else {
      res.status(404).send("File not found");
    }
  } catch (err) {
    res.status(500).send("Failed to connect to database");
  }
});

module.exports = router;
