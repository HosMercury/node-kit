/* Replace with your SQL commands */
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,  
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    condition VARCHAR(255) NOT NULL,
    final_condition VARCHAR(255) NOT NULL,
    serial_tracking BOOLEAN NOT NULL DEFAULT FALSE,  -- Correct BOOLEAN and default value
    mfg_serial VARCHAR(255) NOT NULL,
    warranty INT
);