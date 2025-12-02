-- Assumes an existing database, e.g. vehicle_inventory:
-- createdb vehicle_inventory
-- psql -d vehicle_inventory -f db/db.sql


CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    vin TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    description TEXT,
    horse_power INTEGER NOT NULL CHECK (horse_power > 0),
    model_name TEXT NOT NULL,
    model_year INTEGER NOT NULL CHECK (model_year > 1850),
    purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
    fuel_type TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_vin_lower ON vehicles (LOWER(vin));
