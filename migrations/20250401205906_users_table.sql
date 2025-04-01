-- Add migration script here
CREATE TABLE IF NOT EXISTS users (
    first_name VARCHAR(50) NOT NULL,
    Last_name VARCHAR(50) NOT NULL,
    email VARCHAr(255) NOT NULL,
    password TEXT NOT NULL, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
)