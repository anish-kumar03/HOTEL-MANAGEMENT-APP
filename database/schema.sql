-- =============================================================================
-- HOTEL RESERVATION & MANAGEMENT SYSTEM (HRMS)
-- Database Schema Definition for MySQL 8.4 LTS
-- Target Database: hotel_reservation_db
-- =============================================================================

-- Create the database if it doesn't already exist (Non-destructive)
CREATE DATABASE IF NOT EXISTS `hotel_reservation_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `hotel_reservation_db`;

-- Temporarily disable foreign key checks for clean, safe table recreation
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `reservation_status_history`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `reservations`;
DROP TABLE IF EXISTS `rooms`;
DROP TABLE IF EXISTS `customers`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Table: customers
-- Stores customer profiles: full name, unique email, unique phone, and address.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customers_email` (`email`),
  UNIQUE KEY `uq_customers_phone` (`phone`),
  KEY `idx_customers_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table: rooms
-- Stores physical room inventory: room number, category, capacity, nightly rate, and status.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `room_number` VARCHAR(10) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `capacity` TINYINT UNSIGNED NOT NULL DEFAULT 2,
  `price_per_night` DECIMAL(10,2) NOT NULL,
  `status` ENUM('ACTIVE', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rooms_number` (`room_number`),
  KEY `idx_rooms_status` (`status`),
  KEY `idx_rooms_category` (`category`),
  CONSTRAINT `chk_rooms_capacity` CHECK (`capacity` >= 1),
  CONSTRAINT `chk_rooms_price` CHECK (`price_per_night` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table: reservations
-- Stores booking transactions: unique code, customer & room links, dates, rates, and status.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reservations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_code` VARCHAR(20) NOT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `room_id` INT UNSIGNED NOT NULL,
  `check_in_date` DATE NOT NULL,
  `check_out_date` DATE NOT NULL,
  `nightly_rate` DECIMAL(10,2) NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show') NOT NULL DEFAULT 'pending',
  `special_requests` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reservations_code` (`booking_code`),
  KEY `idx_reservations_customer` (`customer_id`),
  KEY `idx_reservations_room` (`room_id`),
  KEY `idx_reservations_dates` (`check_in_date`, `check_out_date`),
  KEY `idx_reservations_room_dates` (`room_id`, `check_in_date`, `check_out_date`, `status`),
  KEY `idx_reservations_status` (`status`),
  CONSTRAINT `fk_res_customer` FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_res_room` FOREIGN KEY (`room_id`)
    REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_res_dates` CHECK (`check_out_date` > `check_in_date`),
  CONSTRAINT `chk_res_nightly_rate` CHECK (`nightly_rate` >= 0.00),
  CONSTRAINT `chk_res_total_amount` CHECK (`total_amount` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table: payments
-- Stores billing settlement logs: reservation link, amount, payment instrument, and date.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_reference` VARCHAR(30) NOT NULL,
  `reservation_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('cash', 'credit_card', 'debit_card', 'upi', 'bank_transfer') NOT NULL,
  `payment_status` ENUM('completed', 'pending', 'failed', 'refunded') NOT NULL DEFAULT 'completed',
  `payment_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_reference` (`payment_reference`),
  KEY `idx_payments_reservation` (`reservation_id`),
  KEY `idx_payments_date` (`payment_date`),
  KEY `idx_payments_status` (`payment_status`),
  CONSTRAINT `fk_payments_reservation` FOREIGN KEY (`reservation_id`)
    REFERENCES `reservations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_payments_amount` CHECK (`amount` > 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Table: reservation_status_history
-- Stores audit log of reservation status transitions and change timestamps.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reservation_status_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reservation_id` INT UNSIGNED NOT NULL,
  `previous_status` VARCHAR(30) DEFAULT NULL,
  `new_status` VARCHAR(30) NOT NULL,
  `change_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rsh_reservation` (`reservation_id`),
  KEY `idx_rsh_timestamp` (`change_timestamp`),
  CONSTRAINT `fk_rsh_reservation` FOREIGN KEY (`reservation_id`)
    REFERENCES `reservations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
