# Database Design Specification: Hotel Reservation & Management System (HRMS)

**Target RDBMS:** MySQL 8.4 LTS  
**Storage Engine:** InnoDB (Strict ACID Compliance)  
**Character Set:** `utf8mb4`  
**Collation:** `utf8mb4_unicode_ci`  
**Driver:** `mysql2` (Connection Pool with Prepared Statements)  
**Normalization Level:** Third Normal Form (3NF)  

---

## 1. Normalization & Integrity Justification

The relational database schema is normalized up to **Third Normal Form (3NF)** to eliminate redundancy, avoid update/delete anomalies, and ensure relational integrity:

1. **First Normal Form (1NF):**
   - All attributes contain only atomic (indivisible) values.
   - Repeating groups are eliminated (e.g., room amenities are normalized into a dedicated `amenities` table and an associative `room_type_amenities` junction table rather than comma-separated strings).
   - Each table possesses a designated Primary Key (`id`).

2. **Second Normal Form (2NF):**
   - The database is in 1NF.
   - All non-key attributes are fully functionally dependent on the entire primary key (no partial functional dependencies). In junction tables like `room_type_amenities`, composite key dependencies are strictly isolated.

3. **Third Normal Form (3NF):**
   - The database is in 2NF.
   - No transitive dependencies exist. Non-prime attributes depend only on the primary key, not on other non-key attributes. For example, room prices and capacities are governed by `room_types`, and `rooms` references `room_type_id`, ensuring room type pricing updates do not require multi-row updates across historical room records.

---

## 2. Entity & Table Specifications

### 2.1 Table: `users` (System Administrators & Staff)
Stores authentication credentials, user roles, and profile information for system operators.

| Column | Data Type | Nullable | Key / Constraints | Default | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | `INT UNSIGNED` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | - | Unique user identifier. |
| `username` | `VARCHAR(50)` | No | `UNIQUE` | - | Login username. |
| `password_hash` | `VARCHAR(255)` | No | - | - | Bcrypt hashed password. |
| `full_name` | `VARCHAR(100)` | No | - | - | User's full real name. |
| `email` | `VARCHAR(100)` | No | `UNIQUE` | - | Contact email address. |
| `phone` | `VARCHAR(20)` | Yes | - | `NULL` | Contact phone number. |
| `role` | `ENUM('admin', 'receptionist', 'manager')` | No | - | `'receptionist'` | Access role. |
| `status` | `ENUM('active', 'inactive')` | No | - | `'active'` | Account activity state. |
| `last_login_at` | `DATETIME` | Yes | - | `NULL` | Timestamp of last login. |
| `created_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP` | Account creation timestamp. |
| `updated_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last profile update. |

---

### 2.2 Table: `room_types` (Room Categories Master)
Defines room classifications, standard night tariffs, and maximum human capacity.

| Column | Data Type | Nullable | Key / Constraints | Default | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | `INT UNSIGNED` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | - | Category identifier. |
| `name` | `VARCHAR(50)` | No | `UNIQUE` | - | Category title (e.g., Deluxe, Suite). |
| `description` | `TEXT` | Yes | - | `NULL` | Detailed description of features. |
| `base_price_per_night`| `DECIMAL(10,2)` | No | `CHECK (base_price_per_night >= 0)` | - | Standard rate per night. |
| `max_occupancy_adults`| `TINYINT UNSIGNED` | No | `CHECK (max_occupancy_adults >= 1)` | `2` | Max adult capacity. |
| `max_occupancy_children`| `TINYINT UNSIGNED`| No | `CHECK (max_occupancy_children >= 0)` | `1` | Max child capacity. |
| `created_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP` | Record creation. |
| `updated_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Record update. |

---

### 2.3 Table: `amenities` (Amenities Catalog)
Catalog of hotel facilities and room accessories.

| Column | Data Type | Nullable | Key / Constraints | Default | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | `INT UNSIGNED` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | - | Amenity identifier. |
| `name` | `VARCHAR(50)` | No | `UNIQUE` | - | Name (e.g. High-Speed Wi-Fi). |
| `icon_class` | `VARCHAR(50)` | Yes | - | `'bi-check-circle'` | Bootstrap icon class string. |
| `description` | `VARCHAR(255)` | Yes | - | `NULL` | Short amenity description. |

---

### 2.4 Table: `room_type_amenities` (Junction Table: M:N)
Resolves many-to-many relationship between room categories and their bundled amenities.

| Column | Data Type | Nullable | Key / Constraints | Default | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `room_type_id` | `INT UNSIGNED` | No | `PRIMARY KEY (composite)`, `FK -> room_types(id) ON DELETE CASCADE` | - | Room type reference. |
| `amenity_id` | `INT UNSIGNED` | No | `PRIMARY KEY (composite)`, `FK -> amenities(id) ON DELETE CASCADE` | - | Amenity reference. |

---

### 2.5 Table: `rooms` (Physical Room Inventory)
Represents physical hotel rooms on specific floors.

| Column | Data Type | Nullable | Key / Constraints | Default | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | `INT UNSIGNED` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | - | Room identifier. |
| `room_number` | `VARCHAR(10)` | No | `UNIQUE` | - | Physical room label (e.g., "101", "304"). |
| `room_type_id` | `INT UNSIGNED` | No | `FK -> room_types(id) ON DELETE RESTRICT` | - | Associated room classification. |
| `floor_number` | `SMALLINT` | No | - | `1` | Physical floor location. |
| `status` | `ENUM('available', 'occupied', 'reserved', 'maintenance', 'cleaning')` | No | - | `'available'` | Current operational status. |
| `cleanliness_status` | `ENUM('clean', 'dirty', 'in_progress')` | No | - | `'clean'` | Housekeeping condition. |
| `remarks` | `TEXT` | Yes | - | `NULL` | Maintenance or front-desk notes. |
| `created_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP` | Record creation. |
| `updated_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Record update. |

---

### 2.6 Table: `customers` (Guest Master Registry)
Stores comprehensive guest profiles, contact numbers, and official identification records.

| Column | Data Type | Nullable | Key / Constraints | Default | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | `INT UNSIGNED` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | - | Guest identifier. |
| `first_name` | `VARCHAR(50)` | No | - | - | Guest first name. |
| `last_name` | `VARCHAR(50)` | No | - | - | Guest last name. |
| `email` | `VARCHAR(100)` | No | `UNIQUE` | - | Primary email. |
| `phone` | `VARCHAR(20)` | No | `UNIQUE` | - | Contact phone number. |
| `id_proof_type` | `ENUM('passport', 'national_id', 'driving_license', 'aadhaar', 'voter_id')` | No | - | `'national_id'` | Type of government ID. |
| `id_proof_number` | `VARCHAR(100)` | No | - | - | Government ID reference number. |
| `address_line` | `VARCHAR(255)` | Yes | - | `NULL` | Street address. |
| `city` | `VARCHAR(100)` | Yes | - | `NULL` | City of residence. |
| `state` | `VARCHAR(100)` | Yes | - | `NULL` | State / Province. |
| `country` | `VARCHAR(100)` | No | - | `'India'` | Country of nationality. |
| `postal_code` | `VARCHAR(20)` | Yes | - | `NULL` | Postal code / PIN. |
| `created_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP` | Registration date. |
| `updated_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last profile change. |

---

### 2.7 Table: `reservations` (Booking Transactions)
Captures room bookings, date intervals, guest headcounts, and booking lifecycle state.

| Column | Data Type | Nullable | Key / Constraints | Default | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | `INT UNSIGNED` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | - | Reservation identifier. |
| `booking_reference`| `VARCHAR(20)` | No | `UNIQUE` | - | Human-readable code (e.g. `RES-20261101-0001`). |
| `customer_id` | `INT UNSIGNED` | No | `FK -> customers(id) ON DELETE RESTRICT` | - | Booked guest reference. |
| `room_id` | `INT UNSIGNED` | No | `FK -> rooms(id) ON DELETE RESTRICT` | - | Allocated room. |
| `check_in_date` | `DATE` | No | - | - | Scheduled arrival date. |
| `check_out_date` | `DATE` | No | `CHECK (check_out_date > check_in_date)` | - | Scheduled departure date. |
| `actual_check_in` | `DATETIME` | Yes | - | `NULL` | Front-desk check-in timestamp. |
| `actual_check_out` | `DATETIME` | Yes | - | `NULL` | Front-desk check-out timestamp. |
| `adults_count` | `TINYINT UNSIGNED` | No | `CHECK (adults_count >= 1)` | `1` | Number of adults. |
| `children_count` | `TINYINT UNSIGNED` | No | `CHECK (children_count >= 0)` | `0` | Number of children. |
| `total_nights` | `INT UNSIGNED` | No | `CHECK (total_nights >= 1)` | - | Calculated night count. |
| `room_rate_per_night`| `DECIMAL(10,2)`| No | `CHECK (room_rate_per_night >= 0)` | - | Locked-in tariff at time of booking. |
| `estimated_total` | `DECIMAL(10,2)`| No | `CHECK (estimated_total >= 0)` | - | Base tariff * nights. |
| `status` | `ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')` | No | - | `'pending'` | Lifecycle state. |
| `special_requests`| `TEXT` | Yes | - | `NULL` | Guest requests (early check-in, etc.). |
| `created_by` | `INT UNSIGNED` | Yes | `FK -> users(id) ON DELETE SET NULL` | `NULL` | Operator who booked. |
| `created_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP` | Booking timestamp. |
| `updated_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Last status change. |

---

### 2.8 Table: `invoices` (Billing & Invoicing Master)
Financial billing document summarizing room charges, incidental services, taxes, discounts, and payments.

| Column | Data Type | Nullable | Key / Constraints | Default | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | `INT UNSIGNED` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | - | Invoice identifier. |
| `invoice_number` | `VARCHAR(30)` | No | `UNIQUE` | - | Formal reference (e.g. `INV-2026-0001`). |
| `reservation_id` | `INT UNSIGNED` | No | `UNIQUE`, `FK -> reservations(id) ON DELETE RESTRICT` | - | 1:1 binding to reservation. |
| `issue_date` | `DATE` | No | - | `(CURRENT_DATE)` | Date issued. |
| `subtotal_amount`| `DECIMAL(10,2)`| No | `CHECK (subtotal_amount >= 0)` | `0.00` | Sum of itemized charges before tax. |
| `tax_rate` | `DECIMAL(5,2)` | No | `CHECK (tax_rate >= 0)` | `12.00` | Tax percentage (e.g. 12.00%). |
| `tax_amount` | `DECIMAL(10,2)`| No | `CHECK (tax_amount >= 0)` | `0.00` | Calculated tax value. |
| `discount_amount`| `DECIMAL(10,2)`| No | `CHECK (discount_amount >= 0)` | `0.00` | Promotional or manager discount. |
| `additional_charges`| `DECIMAL(10,2)`| No| `CHECK (additional_charges >= 0)` | `0.00`| Incidentals & service fees. |
| `total_amount` | `DECIMAL(10,2)`| No | `CHECK (total_amount >= 0)` | `0.00` | Final payable amount. |
| `paid_amount` | `DECIMAL(10,2)`| No | `CHECK (paid_amount >= 0)` | `0.00` | Total payments logged to date. |
| `balance_amount` | `DECIMAL(10,2)`| No | - | `0.00` | Outstanding balance (`total - paid`). |
| `payment_status` | `ENUM('unpaid', 'partially_paid', 'paid', 'refunded')` | No | - | `'unpaid'` | Settlement status. |
| `notes` | `TEXT` | Yes | - | `NULL` | Billing/checkout remarks. |
| `created_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP` | Invoice creation. |
| `updated_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Invoice update. |

---

### 2.9 Table: `invoice_items` (Itemized Bill Breakdown)
Detailed line items appearing on the customer's invoice.

| Column | Data Type | Nullable | Key / Constraints | Default | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | `INT UNSIGNED` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | - | Item identifier. |
| `invoice_id` | `INT UNSIGNED` | No | `FK -> invoices(id) ON DELETE CASCADE` | - | Associated invoice. |
| `item_type` | `ENUM('room_charge', 'extra_bed', 'room_service', 'laundry', 'late_checkout', 'damage_fee', 'other')` | No | - | `'room_charge'` | Category of charge. |
| `description` | `VARCHAR(255)` | No | - | - | Item description (e.g. "Deluxe Room - 3 Nights"). |
| `quantity` | `SMALLINT UNSIGNED`| No | `CHECK (quantity >= 1)` | `1` | Unit count / night count. |
| `unit_price` | `DECIMAL(10,2)` | No | `CHECK (unit_price >= 0)` | - | Price per single unit. |
| `total_price` | `DECIMAL(10,2)` | No | `CHECK (total_price >= 0)` | - | Calculated `quantity * unit_price`. |
| `created_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP` | Timestamp logged. |

---

### 2.10 Table: `payments` (Payment Ledger)
Records individual financial settlements against invoices.

| Column | Data Type | Nullable | Key / Constraints | Default | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | `INT UNSIGNED` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | - | Payment transaction ID. |
| `payment_reference`| `VARCHAR(30)` | No | `UNIQUE` | - | Payment receipt voucher (e.g. `PAY-20261101-0001`). |
| `invoice_id` | `INT UNSIGNED` | No | `FK -> invoices(id) ON DELETE RESTRICT` | - | Settled invoice reference. |
| `amount` | `DECIMAL(10,2)` | No | `CHECK (amount > 0)` | - | Paid amount. |
| `payment_method` | `ENUM('cash', 'credit_card', 'debit_card', 'upi', 'bank_transfer', 'cheque')` | No | - | `'cash'` | Settlement instrument. |
| `payment_date` | `DATETIME` | No | - | `CURRENT_TIMESTAMP` | Transaction timestamp. |
| `transaction_id` | `VARCHAR(100)` | Yes | - | `NULL` | Bank / UPI / Card authorization code. |
| `payment_status` | `ENUM('completed', 'failed', 'refunded')` | No | - | `'completed'` | Status of transaction. |
| `recorded_by` | `INT UNSIGNED` | Yes | `FK -> users(id) ON DELETE SET NULL` | `NULL` | Cashier / front-desk operator. |
| `notes` | `TEXT` | Yes | - | `NULL` | Receipt remarks. |
| `created_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP` | Record creation. |

---

### 2.11 Table: `activity_logs` (Audit Trail)
Tracks administrative actions for accountability and academic security review.

| Column | Data Type | Nullable | Key / Constraints | Default | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | `INT UNSIGNED` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | - | Log identifier. |
| `user_id` | `INT UNSIGNED` | Yes | `FK -> users(id) ON DELETE SET NULL` | `NULL` | Action performer. |
| `action` | `VARCHAR(100)` | No | - | - | Action name (e.g. 'CHECK_IN_PROCESSED'). |
| `entity_type` | `VARCHAR(50)` | No | - | - | Target entity ('reservation', 'room', etc.). |
| `entity_id` | `INT UNSIGNED` | Yes | - | `NULL` | Target record ID. |
| `details` | `TEXT` | Yes | - | `NULL` | Change description or parameters. |
| `ip_address` | `VARCHAR(45)` | Yes | - | `NULL` | Client IP address. |
| `created_at` | `TIMESTAMP` | No | - | `CURRENT_TIMESTAMP` | Occurrence timestamp. |

---

## 3. Indexing & Query Optimization Strategy

To maintain sub-50ms query execution across large reservation and customer datasets, the following B-Tree indexes are explicitly defined:

1. **Reservation Overlap Index:**
   `CREATE INDEX idx_reservations_room_dates ON reservations (room_id, check_in_date, check_out_date, status);`  
   *Justification:* The core availability query evaluates overlapping dates for active reservations. This composite index allows index-only scanning.

2. **Customer Contact Search:**
   `CREATE INDEX idx_customers_phone ON customers (phone);`  
   `CREATE INDEX idx_customers_email ON customers (email);`  
   `CREATE INDEX idx_customers_name ON customers (last_name, first_name);`  
   *Justification:* Front-desk operators search existing guests by phone, email, or surname during reservation creation.

3. **Room Status Filtering:**
   `CREATE INDEX idx_rooms_status ON rooms (status);`  
   `CREATE INDEX idx_rooms_type ON rooms (room_type_id);`  
   *Justification:* Speeds up dashboard room counter calculations and category-specific availability filtering.

4. **Financial Invoices & Payment Ledger:**
   `CREATE INDEX idx_invoices_status ON invoices (payment_status);`  
   `CREATE INDEX idx_invoices_issue_date ON invoices (issue_date);`  
   `CREATE INDEX idx_payments_date ON payments (payment_date);`  
   *Justification:* Required for fast date-range revenue aggregation in daily/monthly financial reports.

---

## 4. Complete Production-Ready MySQL 8.4 DDL Script

```sql
-- =============================================================================
-- HOTEL RESERVATION & MANAGEMENT SYSTEM (HRMS)
-- Database Definition Script for MySQL 8.4 LTS
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `hotel_management_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `hotel_management_db`;

-- Drop existing tables in reverse dependency order if resetting
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `invoice_items`;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `reservations`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `rooms`;
DROP TABLE IF EXISTS `room_type_amenities`;
DROP TABLE IF EXISTS `amenities`;
DROP TABLE IF EXISTS `room_types`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Table: users
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role` ENUM('admin', 'receptionist', 'manager') NOT NULL DEFAULT 'receptionist',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table: room_types
-- -----------------------------------------------------------------------------
CREATE TABLE `room_types` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `base_price_per_night` DECIMAL(10,2) NOT NULL,
  `max_occupancy_adults` TINYINT UNSIGNED NOT NULL DEFAULT 2,
  `max_occupancy_children` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_room_types_name` (`name`),
  CONSTRAINT `chk_room_types_price` CHECK (`base_price_per_night` >= 0),
  CONSTRAINT `chk_room_types_adults` CHECK (`max_occupancy_adults` >= 1),
  CONSTRAINT `chk_room_types_children` CHECK (`max_occupancy_children` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table: amenities
-- -----------------------------------------------------------------------------
CREATE TABLE `amenities` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `icon_class` VARCHAR(50) DEFAULT 'bi-check-circle',
  `description` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_amenities_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table: room_type_amenities
-- -----------------------------------------------------------------------------
CREATE TABLE `room_type_amenities` (
  `room_type_id` INT UNSIGNED NOT NULL,
  `amenity_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`room_type_id`, `amenity_id`),
  CONSTRAINT `fk_rta_room_type` FOREIGN KEY (`room_type_id`)
    REFERENCES `room_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rta_amenity` FOREIGN KEY (`amenity_id`)
    REFERENCES `amenities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Table: rooms
-- -----------------------------------------------------------------------------
CREATE TABLE `rooms` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `room_number` VARCHAR(10) NOT NULL,
  `room_type_id` INT UNSIGNED NOT NULL,
  `floor_number` SMALLINT NOT NULL DEFAULT 1,
  `status` ENUM('available', 'occupied', 'reserved', 'maintenance', 'cleaning') NOT NULL DEFAULT 'available',
  `cleanliness_status` ENUM('clean', 'dirty', 'in_progress') NOT NULL DEFAULT 'clean',
  `remarks` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rooms_room_number` (`room_number`),
  KEY `idx_rooms_status` (`status`),
  KEY `idx_rooms_type` (`room_type_id`),
  CONSTRAINT `fk_rooms_room_type` FOREIGN KEY (`room_type_id`)
    REFERENCES `room_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Table: customers
-- -----------------------------------------------------------------------------
CREATE TABLE `customers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `id_proof_type` ENUM('passport', 'national_id', 'driving_license', 'aadhaar', 'voter_id') NOT NULL DEFAULT 'national_id',
  `id_proof_number` VARCHAR(100) NOT NULL,
  `address_line` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT NULL,
  `country` VARCHAR(100) NOT NULL DEFAULT 'India',
  `postal_code` VARCHAR(20) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customers_email` (`email`),
  UNIQUE KEY `uq_customers_phone` (`phone`),
  KEY `idx_customers_name` (`last_name`, `first_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Table: reservations
-- -----------------------------------------------------------------------------
CREATE TABLE `reservations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_reference` VARCHAR(20) NOT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `room_id` INT UNSIGNED NOT NULL,
  `check_in_date` DATE NOT NULL,
  `check_out_date` DATE NOT NULL,
  `actual_check_in` DATETIME DEFAULT NULL,
  `actual_check_out` DATETIME DEFAULT NULL,
  `adults_count` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `children_count` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `total_nights` INT UNSIGNED NOT NULL,
  `room_rate_per_night` DECIMAL(10,2) NOT NULL,
  `estimated_total` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show') NOT NULL DEFAULT 'pending',
  `special_requests` TEXT DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reservations_reference` (`booking_reference`),
  KEY `idx_reservations_customer` (`customer_id`),
  KEY `idx_reservations_room_dates` (`room_id`, `check_in_date`, `check_out_date`, `status`),
  KEY `idx_reservations_dates` (`check_in_date`, `check_out_date`),
  KEY `idx_reservations_status` (`status`),
  CONSTRAINT `fk_reservations_customer` FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_reservations_room` FOREIGN KEY (`room_id`)
    REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_reservations_user` FOREIGN KEY (`created_by`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_res_dates` CHECK (`check_out_date` > `check_in_date`),
  CONSTRAINT `chk_res_adults` CHECK (`adults_count` >= 1),
  CONSTRAINT `chk_res_rate` CHECK (`room_rate_per_night` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Table: invoices
-- -----------------------------------------------------------------------------
CREATE TABLE `invoices` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_number` VARCHAR(30) NOT NULL,
  `reservation_id` INT UNSIGNED NOT NULL,
  `issue_date` DATE NOT NULL,
  `subtotal_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax_rate` DECIMAL(5,2) NOT NULL DEFAULT 12.00,
  `tax_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `additional_charges` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `balance_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('unpaid', 'partially_paid', 'paid', 'refunded') NOT NULL DEFAULT 'unpaid',
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoices_number` (`invoice_number`),
  UNIQUE KEY `uq_invoices_reservation` (`reservation_id`),
  KEY `idx_invoices_status` (`payment_status`),
  KEY `idx_invoices_issue_date` (`issue_date`),
  CONSTRAINT `fk_invoices_reservation` FOREIGN KEY (`reservation_id`)
    REFERENCES `reservations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_inv_subtotal` CHECK (`subtotal_amount` >= 0),
  CONSTRAINT `chk_inv_tax` CHECK (`tax_amount` >= 0),
  CONSTRAINT `chk_inv_total` CHECK (`total_amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Table: invoice_items
-- -----------------------------------------------------------------------------
CREATE TABLE `invoice_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_id` INT UNSIGNED NOT NULL,
  `item_type` ENUM('room_charge', 'extra_bed', 'room_service', 'laundry', 'late_checkout', 'damage_fee', 'other') NOT NULL DEFAULT 'room_charge',
  `description` VARCHAR(255) NOT NULL,
  `quantity` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `total_price` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invoice_items_invoice` (`invoice_id`),
  CONSTRAINT `fk_items_invoice` FOREIGN KEY (`invoice_id`)
    REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_item_quantity` CHECK (`quantity` >= 1),
  CONSTRAINT `chk_item_unit_price` CHECK (`unit_price` >= 0),
  CONSTRAINT `chk_item_total_price` CHECK (`total_price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Table: payments
-- -----------------------------------------------------------------------------
CREATE TABLE `payments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_reference` VARCHAR(30) NOT NULL,
  `invoice_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('cash', 'credit_card', 'debit_card', 'upi', 'bank_transfer', 'cheque') NOT NULL DEFAULT 'cash',
  `payment_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `payment_status` ENUM('completed', 'failed', 'refunded') NOT NULL DEFAULT 'completed',
  `recorded_by` INT UNSIGNED DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_reference` (`payment_reference`),
  KEY `idx_payments_invoice` (`invoice_id`),
  KEY `idx_payments_date` (`payment_date`),
  CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`)
    REFERENCES `invoices` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payments_user` FOREIGN KEY (`recorded_by`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_pay_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Table: activity_logs
-- -----------------------------------------------------------------------------
CREATE TABLE `activity_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT UNSIGNED DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_logs_user` (`user_id`),
  KEY `idx_logs_action` (`action`),
  KEY `idx_logs_created_at` (`created_at`),
  CONSTRAINT `fk_logs_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

