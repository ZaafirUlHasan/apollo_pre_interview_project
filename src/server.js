require("dotenv").config();
let express = require("express");
let app = express();

let port = process.env.PORT || 3000;
let hostname = process.env.HOSTNAME || "localhost";

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, hostname, function () {
  console.log(`http://${hostname}:${port}`);
});