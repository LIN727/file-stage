const express = require("express");
const cors = require("cors");

require("./database/db-client");
require("./database/multer");

const app = express();
app.use(cors());
app.use(express.json());

const server = require("./socket")(app);

app.get("/", (_req, res) => {
  res.send("Welcome to the file server");
});

app.use("/api", require("./routes/api"));

server.listen(1028, async () => {
  console.log("✅ API server running on port 1028");
});
