const express = require("express");
const { GridFsStorage } = require("multer-gridfs-storage");
const multer = require("multer");
const MongoClient = require("mongodb").MongoClient;
const MongoGridFS = require("mongodb").GridFSBucket;
const ObjectId = require("mongodb").ObjectId;
const cors = require("cors");

const url = process.env.DB_URL || "mongodb://localhost:27017/file-stage";
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

const upload = multer({ storage });

const dbClient = new MongoClient(url);
dbClient
  .connect()
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.log("❌ Failed to connect to MongoDB");
    console.error(err);
    process.exit(1);
  });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

const server = require("http").Server(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://192.168.3.29:5173",
  },
});
const namespace = io.of(/^\/channel-\d+$/);

namespace.on("connection", (socket) => {
  console.log(`✅ Client connected to namespace: ${socket.nsp.name}`);
  socket.on("upload-progress", (data) =>
    namespace.emit("upload-progress", data)
  );
  socket.on("complete-upload-task", (data) =>
    namespace.emit("complete-upload", data)
  );
  socket.on("finish-upload-task", () => namespace.emit("finish-upload"));
});

app.get("/", (_req, res) => {
  res.send("Welcome to the file server");
});

app.post("/asset", upload.single("asset"), (req, res) => {
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
  namespace.emit("new-file", data);
  res.json(data);
});

app.get("/assets", async (_req, res) => {
  try {
    await dbClient.connect();
    const collection = dbClient.db("file-stage").collection("uploads.files");
    const docs = await collection.find({}).toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).send("Failed to connect to database");
  }
});

app.get("/assets/:id", async (req, res) => {
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

app.delete("/assets/:id", async (req, res) => {
  try {
    await dbClient.connect();
    const collection = dbClient.db("file-stage").collection("uploads.files");
    const result = await collection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    if (result.deletedCount === 1) {
      res.status(200).send("File deleted successfully");
      namespace.emit("delete-file", req.params.id);
    } else {
      res.status(404).send("File not found");
    }
  } catch (err) {
    res.status(500).send("Failed to connect to database");
  }
});

server.listen(1028, () => {
  console.log("✅ API server running on port 1028");
});
