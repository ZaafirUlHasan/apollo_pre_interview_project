# Vehicle Inventory API

A small RESTful service for managing an inventory of vehicles.
Implements CRUD endpoints and validation rules.

## Overview

This API provides endpoints to:

- List all vehicles
- Create a new vehicle
- Retrieve a vehicle by VIN
- Update a vehicle
- Delete a vehicle

All responses are JSON.
All validation errors return structured JSON with appropriate status codes (400 / 422 / 404).

The project is implemented with Node.js, Express, and PostgreSQL.

## Requirements / Dependencies

- Node.js (v18+ recommended)
- PostgreSQL

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/vehicle_inventory
PORT=3000
HOSTNAME=localhost
```

### 3. Initialize the database

Create the database:

```bash
createdb vehicle_inventory
```

Apply the schema:

```bash
psql -d vehicle_inventory -f db.sql
```

## Running the Server

```bash
npm start
```

The server will listen at: http://localhost:3000 by default.

## Running Tests

Tests use Jest + Supertest and run entirely from the Unix command line.

```bash
npm test
```

**Notes:**

- Running tests will delete the database and recreate it.
- Each test begins with an empty vehicles table for isolation and determinism.

## Data Model

A Vehicle object has the following JSON shape:

```json
{
  "vin": "ABCDEFG000001",
  "manufacturer": "Honda",
  "description": "Optional string",
  "horsePower": 185,
  "modelName": "Accord",
  "modelYear": 2020,
  "purchasePrice": 23000.00,
  "fuelType": "gasoline"
}
```

- The database schema uses `snake_case` columns and an auto-incrementing id.
- VIN is unique (case-insensitive) and acts as the primary identifier for API operations.

## Validation Rules

### 400 – Bad Request

Returned when the request body cannot be parsed as JSON.

**Example:**

`POST /vehicle`
Body: `not a json`
-> 400

```json
{
  "error": "Request body must be valid JSON"
}
```

### 422 – Unprocessable Entity

This error is returned when the request body JSON is syntactically valid but not a valid Vehicle object. Possible errors include:

- Missing required fields
- Wrong types (string vs number)
- Invalid numeric ranges
- VIN uniqueness violation

**Example:**

```json
{
  "error": "Validation failed",
  "details": {
    "vin": ["Required string field missing or empty"],
    "horsePower": ["Required number field missing"]
  }
}
```

### 404 – Not Found

Used when a requested VIN does not exist.

## API Endpoints

### GET /health

Simple service uptime check.

**Response**

```json
{ "status": "ok" }
```

### GET /vehicle

Returns a list of all vehicles.

**Response**

```json
[
  {
    "id": 1,
    "vin": "...",
    "manufacturer": "...",
    ...
  }
]
```

### POST /vehicle

Creates a new vehicle record.

- **Request Body**: valid Vehicle JSON
- **Success**: 201 Created + created object
- **Errors**:
  - 400 malformed JSON
  - 422 validation failure
  - 422 VIN already exists (case-insensitive)

### GET /vehicle/:vin

Fetch a vehicle by VIN.

- **Success**: 200 OK + vehicle JSON
- **Not found**: 404 Not Found

VIN lookup is case-insensitive.

### PUT /vehicle/:vin

Updates an existing vehicle.

**Rules:**

- Body must contain a full, valid Vehicle object
- VIN in body must match VIN in URL (case-insensitive)
- VIN itself cannot be changed

- **Success**: 200 OK + updated record
- **Errors**:
  - 422 validation failure
  - 404 vehicle not found

### DELETE /vehicle/:vin

Deletes a vehicle.

- **Success**: 204 No Content
- **Not found**: 404 Not Found

Case-insensitive VIN matching.
