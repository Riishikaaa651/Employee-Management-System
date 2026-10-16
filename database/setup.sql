-- One-time MySQL setup for the Employee Management System.
-- Run as an administrative user, e.g.:
--   mysql -u root -p < database/setup.sql
--
-- Replace CHANGE_ME_STRONG_PASSWORD below with your own password before running,
-- and put the same value in DB_PASSWORD in your .env file.
-- Tables are NOT created here: Flyway creates and versions them automatically when
-- the backend starts (see backend/src/main/resources/db/migration).

CREATE DATABASE IF NOT EXISTS employee_management
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'ems_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';

-- Least privilege: the application user can only touch its own schema.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
    ON employee_management.* TO 'ems_app'@'localhost';

FLUSH PRIVILEGES;
