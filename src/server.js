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
app.use((err, req, res, next)=>{
  //middleware to check for express json body parsing errors and to return a nicely formatted json instead of html
  if (err instanceof SyntaxError && err.status === 400 && "body" in err){
    console.error("Invalid JSON recieved:", err.message);
    return res.status(400).json({
      error: "Request body must be valid JSON"
    })
  }
  next(err); //other errors get passed on
})

let port = process.env.PORT || 3000;
let hostname = process.env.HOSTNAME || "localhost";

function rowToVehicle(row) {
  return {
    id: row.id,
    vin: row.vin,
    manufacturer: row.manufacturer,
    description: row.description,
    horsePower: row.horse_power,
    modelName: row.model_name,
    modelYear: row.model_year,
    purchasePrice: Number(row.purchase_price),
    fuelType: row.fuel_type
  }
}
function validateVehiclePayload(payload) {
  const errors = {};
  const addError = (field, message) => {
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(message);
  };

  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      valid: false,
      errors: { _global: ["Body must be a JSON object"] },
    };
  }

  const requiredStrings = ["vin", "manufacturer", "modelName", "fuelType"];

  for (const field of requiredStrings) {
    if (typeof payload[field] !== "string" || payload[field].trim() === "") {
      addError(field, "Required string field missing or empty");
    }
  }

  const requiredNumbers = ["horsePower", "modelYear", "purchasePrice"];
  for (const field of requiredNumbers) {
    if (typeof payload[field] !== "number" || Number.isNaN(payload[field])){
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

app.get("/vehicle", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM vehicles ORDER BY id ASC;");
    const vehicles = result.rows.map(rowToVehicle);
    res.json(vehicles);
  } catch (error) {
    console.log("Error fetching vehicles", error);
    res.status(500).json({error: "Internal Server Error"});
  }
})


app.post("/vehicle", async(req, res) =>{
  const {valid, errors} = validateVehiclePayload(req.body);

  if (!valid){ //the json was parsed fine but it's not a valid vehicle
    return res.status(422).json({
      error: "Validation failed",
      details: errors
    });
  }

  const {
    vin,
    manufacturer,
    description,
    horsePower,
    modelName,
    modelYear,
    purchasePrice,
    fuelType,
  } = req.body;

  const insert_sql = 
  `INSERT INTO vehicles
    (vin, manufacturer, description, horse_power, model_name, model_year, purchase_price, fuel_type)
  VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    vin,
    manufacturer,
    description ?? null,
    horsePower,
    modelName,
    modelYear,
    purchasePrice,
    fuelType,
  ];

  try{
    const result = await pool.query(insert_sql, values);
    const vehicle = rowToVehicle(result.rows[0]);
    res.status(201).json(vehicle);
  }catch(err){
    if (err.code === "23505"){//handle unique vin violation (postgres error code 23505)
      console.warn("VIN uniqueness violation:", err.detail);
      return res.status(422).json({
        error: "Validation failed",
        details: {
          vin: ["VIN must be unique (case-insensitive)"]
        },
      });

    }else{
      console.error("Error inserting vehicle:", err);
      res.status(500).json({error: "Internal Server Error"});
    }
  }
})

app.get("/vehicle/:vin", async (req, res)=>{
  const { vin } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM vehicles WHERE LOWER(vin) = LOWER($1);",
      [vin]
    );

    if (result.rows.length === 0){
      return res.status(404).json({error: "Vehicle not found"});
    }

    const vehicle = rowToVehicle(result.rows[0]);
    res.json(vehicle);
    
  } catch (error) {
    console.error("Error fetching vehicle by VIN:", err);
    res.status(500).json({error: "Internal Server Error"});
    
  }
})


app.put("/vehicle/:vin", async (req, res)=>{
  const pathVin = req.params.vin;
  const {valid, errors} = validateVehiclePayload(req.body);

  if (!valid){
    return res.status(422).json({
      error: "Validation failed",
      details: errors,
    });
  }

  if(
    typeof req.body.vin === "string" &&
    req.body.vin.toLowerCase() !== pathVin.toLowerCase()
  ){
    return res.status(422).json({
      error: "Validation failed",
      details: {
        vin: ["VIN in body must match VIN in URL (case-insensitive)"]
      }
    })
  }

  const {
    manufacturer,
    description,
    horsePower,
    modelName,
    modelYear,
    purchasePrice,
    fuelType,
  } = req.body;

  const updateSql = `
  UPDATE vehicles
    SET manufacturer = $2,
        description = $3,
        horse_power = $4,
        model_name = $5,
        model_year = $6,
        purchase_price = $7,
        fuel_type = $8
  WHERE LOWER(vin) = LOWER($1)
  RETURNING *;
  `;

  const values = [
    pathVin,
    manufacturer,
    description ?? null,
    horsePower,
    modelName,
    modelYear,
    purchasePrice,
    fuelType,
  ];

  try {
    const result = await pool.query(updateSql, values);
    if (result.rows.length === 0){ //no vehicle matched with that vin
      return res.status(404).json({error: "Vehicle not found"})
    }

    const vehicle = rowToVehicle(result.rows[0]);
    res.json(vehicle);

  } catch (error) {
    console.error("Error updating vehicle:", err);
    res.status(500).json({error: "Internal Server Error"});
  }
})


app.delete("/vehicle/:vin", async (req, res)=>{
  const { vin } = req.params.vin;
  const deleteSql = `
  DELETE FROM vehicles
    WHERE LOWER(vin) = LOWER($1)
    RETURNING id;
  `

  try {
    const result = await pool.query(deleteSql, [vin]);

    if (result.rows.length === 0){
      return res.status(404).json({error: "Vehicle not found"});
    }

    res.status(204).send();
    
  } catch (error) {
    console.error("Error deleting vehicle:", err);
    res.status(500).json({error: "Internal Server Error"});
  }
});

export { app, pool };
if (process.env.NODE_ENV !== "test") {
app.listen(port, hostname, function () {
  console.log(`http://${hostname}:${port}`);
});
}