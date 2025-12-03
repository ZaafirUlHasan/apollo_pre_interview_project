import request from "supertest";
import { app, pool } from "../src/server.js";
import dotenv from "dotenv";

dotenv.config();

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query("DELETE FROM vehicles");
});

describe("Vehicle API", () => {
  test("POST /vehicle with valid payload creates a vehicle", async () => {
    const payload = {
      vin: "ABCDEFGH000001",
      manufacturer: "Honda",
      description: "Silver sedan",
      horsePower: 185,
      modelName: "Accord",
      modelYear: 2020,
      purchasePrice: 23000,
      fuelType: "gasoline",
    };

    const res = await request(app)
      .post("/vehicle")
      .send(payload)
      .set("Content-Type", "application/json");

    expect(res.statusCode).toBe(201);
    expect(res.body.vin).toBe(payload.vin);
    expect(res.body.id).toBeDefined();
    expect(res.body.horsePower).toBe(payload.horsePower);
  });

  test("POST /vehicle with invalid JSON returns 400", async () => {
    const res = await request(app)
      .post("/vehicle")
      .set("Content-Type", "application/json")
      .send("not a json object");

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "Request body must be valid JSON",
    });
  });

  test("POST /vehicle with missing required fields returns 422", async () => {
    const res = await request(app)
      .post("/vehicle")
      .send({ foo: "bar" })
      .set("Content-Type", "application/json");

    expect(res.statusCode).toBe(422);
    expect(res.body.error).toBe("Validation failed");
    expect(res.body.details).toBeDefined();
    expect(res.body.details.vin).toBeDefined();
  });

  test("GET /vehicle/:vin returns a vehicle that was created", async () => {
    const payload = {
      vin: "ABCDEFG000002",
      manufacturer: "VW",
      description: "Golf",
      horsePower: 150,
      modelName: "Golf",
      modelYear: 2019,
      purchasePrice: 18000,
      fuelType: "gasoline",
    };

    //first create
    await request(app)
      .post("/vehicle")
      .send(payload)
      .set("Content-Type", "application/json");

    //then fetch
    const res = await request(app).get(`/vehicle/${payload.vin}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.vin).toBe(payload.vin);
    expect(res.body.modelName).toBe(payload.modelName);
  });

  test("GET /vehicle/:vin returns 404 for unknown VIN", async () => {
    const res = await request(app).get("/vehicle/NON_EXISTENT_VIN");
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Vehicle not found" });
  });

    test("PUT /vehicle/:vin updates an existing vehicle", async () => {
    const original = {
      vin: "ABCDEFG000003",
      manufacturer: "Acura",
      description: "Original desc",
      horsePower: 200,
      modelName: "Legend",
      modelYear: 1995,
      purchasePrice: 5000,
      fuelType: "gasoline",
    };

    //first create
    const createRes = await request(app)
      .post("/vehicle")
      .send(original)
      .set("Content-Type", "application/json");

    expect(createRes.statusCode).toBe(201);

    const updated = {
      ...original,
      description: "Updated desc",
      horsePower: 210,
      modelYear: 1996,
    };

    //then update
    const updateRes = await request(app)
      .put(`/vehicle/${original.vin}`)
      .send(updated)
      .set("Content-Type", "application/json");

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.vin).toBe(original.vin);
    expect(updateRes.body.description).toBe("Updated desc");
    expect(updateRes.body.horsePower).toBe(210);
    expect(updateRes.body.modelYear).toBe(1996);
  });

  test("DELETE /vehicle/:vin removes a vehicle and returns 204", async () => {
    const payload = {
      vin: "ABCDEFG000004",
      manufacturer: "Land Rover",
      description: "Discovery",
      horsePower: 250,
      modelName: "Discovery",
      modelYear: 2018,
      purchasePrice: 42000,
      fuelType: "diesel",
    };

    //first create
    const createRes = await request(app)
      .post("/vehicle")
      .send(payload)
      .set("Content-Type", "application/json");

    expect(createRes.statusCode).toBe(201);

    //then delete
    const deleteRes = await request(app).delete(`/vehicle/${payload.vin}`);

    expect(deleteRes.statusCode).toBe(204);
    expect(deleteRes.text).toBe("");

    const getRes = await request(app).get(`/vehicle/${payload.vin}`);
    expect(getRes.statusCode).toBe(404);
    expect(getRes.body).toEqual({ error: "Vehicle not found" });
  });

});
