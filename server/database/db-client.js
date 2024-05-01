const MongoClient = require("mongodb").MongoClient;

const url = process.env.DB_URL || "mongodb://localhost:27017/file-stage";

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

module.exports.db_url = url;
module.exports.dbClient = dbClient;
