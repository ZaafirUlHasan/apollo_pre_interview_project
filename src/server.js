import dotenv from "dotenv";
import pg from "pg";
import express from "express";

dotenv.config();

const Pool = pg.Pool;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const app = express();
app.use(express.json());

let port = process.env.PORT || 3000;
let hostname = process.env.HOSTNAME || "localhost";


function validateVehiclePayload(payload) {
  const errors = {};
  const addError = (field, message) => {
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(message);
  };

  const requiredStrings = ["vin", "manufacturer", "modelName", "fuelType"];

  for (const field of requiredStrings) {
    if (typeof payload[field] !== "string" || payload[field].trim() === "") {
      addError(field, "Required string field missing or empty");
    }
  }

  const requiredNumbers = ["horsePower", "modelYear", "purchasePrice"];
  for (const field of requiredNumbers) {
    if (typeof payload[field] !== "number") {
      addError(field, "Required number field missing");
    }
  }

  // description is optional, but if provided, it must be a string
  if (
    payload.description !== undefined &&
    typeof payload.description !== "string"
  ) {
    addError("description", "Must be a string if provided");
  }

  if (typeof payload.horsePower === "number" && payload.horsePower < 0) {
    addError("horsePower", "Must be >= 0");
  }
  if (typeof payload.modelYear === "number" && payload.modelYear < 1850) {
    addError("modelYear", "Must be >= 1850");
  }
  if (typeof payload.purchasePrice === "number" && payload.purchasePrice < 0) {
    addError("purchasePrice", "Must be >= 0");
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, hostname, function () {
  console.log(`http://${hostname}:${port}`);
});