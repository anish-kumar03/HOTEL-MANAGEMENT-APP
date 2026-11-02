-- =============================================================================
-- HOTEL RESERVATION & MANAGEMENT SYSTEM (HRMS)
-- MySQL 8.4 LTS Stored Database Programming Module
-- Target Database: hotel_reservation_db
-- =============================================================================
-- This script demonstrates advanced MySQL stored-program concepts:
-- 1. Stored Functions (fn_calculate_nights, fn_calculate_booking_amount)
-- 2. Stored Views (vw_reservation_details, vw_payment_summary)
-- 3. Stored Procedures with Input/Output Parameters:
--    - sp_get_available_rooms
--    - sp_get_monthly_revenue
--    - sp_generate_reservation_report
-- 4. Database Trigger for Automated Status Audit (trg_reservations_status_change)
-- 5. Explicit Cursors with NOT FOUND Handlers (sp_identify_overdue_checkouts)
-- 6. ACID Transactions & SQL Exception Handling (sp_create_reservation_transactional)
-- =============================================================================

USE `hotel_reservation_db`;

-- =============================================================================
-- SECTION 1: STORED FUNCTIONS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Function 1: fn_calculate_nights
-- Calculates billable nights between check-in and check-out dates.
-- Returns 0 if dates are invalid or check-out is on/before check-in.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS `fn_calculate_nights`;
DELIMITER //
CREATE FUNCTION `fn_calculate_nights`(
  p_check_in DATE,
  p_check_out DATE
)
RETURNS INT
DETERMINISTIC
NO SQL
COMMENT 'Computes elapsed nights between two calendar dates'
BEGIN
  -- Input guard: return 0 for NULL or inverted date boundaries
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in THEN
    RETURN 0;
  END IF;

  RETURN DATEDIFF(p_check_out, p_check_in);
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- Function 2: fn_calculate_booking_amount
-- Calculates gross booking tariff given stay duration (nights) and nightly rate.
-- Returns 0.00 for non-positive nights or negative rates.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS `fn_calculate_booking_amount`;
DELIMITER //
CREATE FUNCTION `fn_calculate_booking_amount`(
  p_nights INT,
  p_nightly_rate DECIMAL(10,2)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
NO SQL
COMMENT 'Multiplies stay duration by nightly tariff snapshot'
BEGIN
  IF p_nights IS NULL OR p_nights <= 0 OR p_nightly_rate IS NULL OR p_nightly_rate < 0.00 THEN
    RETURN 0.00;
  END IF;

  RETURN ROUND(p_nights * p_nightly_rate, 2);
END //
DELIMITER ;


-- =============================================================================
-- SECTION 2: DATABASE VIEWS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- View 1: vw_reservation_details
-- Denormalized operational view joining reservations, customers, and rooms.
-- Computes duration in nights and displays customer contact details.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `vw_reservation_details` AS
SELECT 
  res.id AS reservation_id,
  res.booking_code,
  res.customer_id,
  c.name AS customer_name,
  c.email AS customer_email,
  c.phone AS customer_phone,
  c.address AS customer_address,
  res.room_id,
  r.room_number,
  r.category AS room_category,
  r.capacity AS room_capacity,
  r.price_per_night AS current_room_price,
  res.check_in_date,
  res.check_out_date,
  fn_calculate_nights(res.check_in_date, res.check_out_date) AS nights,
  res.guests_count,
  res.nightly_rate AS booked_nightly_rate,
  res.total_amount AS total_room_charges,
  res.status AS reservation_status,
  res.special_requests,
  DATE_FORMAT(res.created_at, '%Y-%m-%d %H:%i') AS booked_at,
  DATE_FORMAT(res.updated_at, '%Y-%m-%d %H:%i') AS last_updated_at
FROM reservations res
JOIN customers c ON res.customer_id = c.id
JOIN rooms r ON res.room_id = r.id;


-- -----------------------------------------------------------------------------
-- View 2: vw_payment_summary
-- Financial audit view aggregating room charges, additional service charges,
-- total settlements, remaining balance, and payment settlement status.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `vw_payment_summary` AS
SELECT 
  res.id AS reservation_id,
  res.booking_code,
  c.name AS customer_name,
  c.phone AS customer_phone,
  r.room_number,
  r.category AS room_category,
  res.status AS reservation_status,
  res.total_amount AS room_charges,
  COALESCE((
    SELECT SUM(rs.amount) 
    FROM reservation_services rs 
    WHERE rs.reservation_id = res.id
  ), 0.00) AS additional_charges,
  ROUND(
    res.total_amount + COALESCE((
      SELECT SUM(rs.amount) 
      FROM reservation_services rs 
      WHERE rs.reservation_id = res.id
    ), 0.00), 2
  ) AS gross_bill_amount,
  COALESCE((
    SELECT SUM(p.amount) 
    FROM payments p 
    WHERE p.reservation_id = res.id AND p.payment_status = 'SUCCESS'
  ), 0.00) AS total_paid,
  ROUND(
    (res.total_amount + COALESCE((
      SELECT SUM(rs.amount) 
      FROM reservation_services rs 
      WHERE rs.reservation_id = res.id
    ), 0.00)) - 
    COALESCE((
      SELECT SUM(p.amount) 
      FROM payments p 
      WHERE p.reservation_id = res.id AND p.payment_status = 'SUCCESS'
    ), 0.00), 2
  ) AS remaining_balance,
  CASE 
    WHEN COALESCE((
      SELECT SUM(p.amount) 
      FROM payments p 
      WHERE p.reservation_id = res.id AND p.payment_status = 'SUCCESS'
    ), 0.00) >= (res.total_amount + COALESCE((
      SELECT SUM(rs.amount) 
      FROM reservation_services rs 
      WHERE rs.reservation_id = res.id
    ), 0.00)) AND (res.total_amount > 0 OR COALESCE((
      SELECT SUM(rs.amount) 
      FROM reservation_services rs 
      WHERE rs.reservation_id = res.id
    ), 0.00) > 0)
    THEN 'PAID'
    WHEN COALESCE((
      SELECT SUM(p.amount) 
      FROM payments p 
      WHERE p.reservation_id = res.id AND p.payment_status = 'SUCCESS'
    ), 0.00) > 0.00 
    THEN 'PARTIALLY_PAID'
    ELSE 'UNPAID'
  END AS billing_status
FROM reservations res
JOIN customers c ON res.customer_id = c.id
JOIN rooms r ON res.room_id = r.id;


-- =============================================================================
-- SECTION 3: STORED PROCEDURES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Procedure 1: sp_get_available_rooms
-- Discovers all ACTIVE rooms meeting capacity criteria that do NOT have any
-- active overlapping bookings (pending, confirmed, checked_in) for the date window.
-- Mathematical Overlap condition:
--   existing_check_in < requested_check_out AND existing_check_out > requested_check_in
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_get_available_rooms`;
DELIMITER //
CREATE PROCEDURE `sp_get_available_rooms`(
  IN p_check_in DATE,
  IN p_check_out DATE,
  IN p_guests INT
)
COMMENT 'Returns available active rooms with zero date overlaps for requested window'
BEGIN
  -- Input boundary validation with SQLSTATE signal
  IF p_check_in IS NULL OR p_check_out IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Validation Error: Check-in and check-out dates are mandatory.';
  END IF;

  IF p_check_out <= p_check_in THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Validation Error: Check-out date must be strictly after check-in date.';
  END IF;

  -- Default guest count to 1 if null or negative
  IF p_guests IS NULL OR p_guests <= 0 THEN
    SET p_guests = 1;
  END IF;

  SELECT 
    r.id,
    r.room_number,
    r.category,
    r.capacity,
    r.price_per_night,
    r.status,
    fn_calculate_nights(p_check_in, p_check_out) AS requested_nights,
    fn_calculate_booking_amount(fn_calculate_nights(p_check_in, p_check_out), r.price_per_night) AS estimated_total_amount
  FROM rooms r
  WHERE r.status = 'ACTIVE'
    AND r.capacity >= p_guests
    AND r.id NOT IN (
      SELECT res.room_id
      FROM reservations res
      WHERE res.status IN ('pending', 'confirmed', 'checked_in')
        AND res.check_in_date < p_check_out
        AND res.check_out_date > p_check_in
    )
  ORDER BY r.price_per_night ASC, r.room_number ASC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- Procedure 2: sp_get_monthly_revenue
-- Aggregates monthly collections for a given calendar year across CASH, UPI,
-- and CARD instruments. Defaults to current year if NULL is provided.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_get_monthly_revenue`;
DELIMITER //
CREATE PROCEDURE `sp_get_monthly_revenue`(
  IN p_year INT
)
COMMENT 'Aggregates monthly revenue collections by instrument channel'
BEGIN
  -- Default to current year if parameter is omitted or NULL
  IF p_year IS NULL OR p_year <= 1900 THEN
    SET p_year = YEAR(CURRENT_DATE());
  END IF;

  SELECT 
    MONTH(p.payment_date) AS month_number,
    DATE_FORMAT(p.payment_date, '%M') AS month_name,
    DATE_FORMAT(p.payment_date, '%b %Y') AS month_label,
    COUNT(p.id) AS successful_transactions_count,
    COALESCE(SUM(CASE WHEN p.payment_method = 'CASH' THEN p.amount ELSE 0 END), 0.00) AS cash_revenue,
    COALESCE(SUM(CASE WHEN p.payment_method = 'UPI' THEN p.amount ELSE 0 END), 0.00) AS upi_revenue,
    COALESCE(SUM(CASE WHEN p.payment_method = 'CARD' THEN p.amount ELSE 0 END), 0.00) AS card_revenue,
    COALESCE(SUM(p.amount), 0.00) AS total_revenue_collected,
    ROUND(COALESCE(AVG(p.amount), 0.00), 2) AS average_transaction_value
  FROM payments p
  WHERE YEAR(p.payment_date) = p_year
    AND p.payment_status = 'SUCCESS'
  GROUP BY MONTH(p.payment_date), month_name, month_label
  ORDER BY month_number ASC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- Procedure 3: sp_generate_reservation_report
-- Generates an operational roster of reservations filtered by date interval
-- and booking status. Supports wildcard/all filtering when status is 'ALL' or NULL.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_generate_reservation_report`;
DELIMITER //
CREATE PROCEDURE `sp_generate_reservation_report`(
  IN p_start_date DATE,
  IN p_end_date DATE,
  IN p_status VARCHAR(30)
)
COMMENT 'Generates filtered reservation operational audit roster'
BEGIN
  -- Apply fallback defaults if null
  IF p_start_date IS NULL THEN
    SET p_start_date = DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY);
  END IF;

  IF p_end_date IS NULL THEN
    SET p_end_date = DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY);
  END IF;

  IF p_status IS NULL OR TRIM(p_status) = '' OR UPPER(TRIM(p_status)) = 'ALL' THEN
    SET p_status = NULL;
  ELSE
    SET p_status = LOWER(TRIM(p_status));
  END IF;

  SELECT 
    res.id AS reservation_id,
    res.booking_code,
    c.name AS guest_name,
    c.phone AS guest_phone,
    r.room_number,
    r.category AS room_category,
    DATE_FORMAT(res.check_in_date, '%Y-%m-%d') AS check_in_date,
    DATE_FORMAT(res.check_out_date, '%Y-%m-%d') AS check_out_date,
    DATEDIFF(res.check_out_date, res.check_in_date) AS nights,
    res.guests_count,
    res.nightly_rate,
    res.total_amount,
    res.status AS reservation_status,
    DATE_FORMAT(res.created_at, '%Y-%m-%d %H:%i') AS booked_on
  FROM reservations res
  JOIN customers c ON res.customer_id = c.id
  JOIN rooms r ON res.room_id = r.id
  WHERE res.check_in_date >= p_start_date
    AND res.check_in_date <= p_end_date
    AND (p_status IS NULL OR res.status = p_status)
  ORDER BY res.check_in_date DESC, res.id DESC;
END //
DELIMITER ;


-- =============================================================================
-- SECTION 4: DATABASE TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Trigger: trg_reservations_status_change
-- Fires AFTER UPDATE on `reservations` table.
-- Automatically logs status transitions into `reservation_status_history`.
-- Ensures complete non-repudiation audit trail even during direct SQL console updates.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_reservations_status_change`;
DELIMITER //
CREATE TRIGGER `trg_reservations_status_change`
AFTER UPDATE ON `reservations`
FOR EACH ROW
BEGIN
  -- Detect when status has transitioned
  IF OLD.status != NEW.status THEN
    INSERT INTO `reservation_status_history`
      (
        `reservation_id`,
        `previous_status`,
        `new_status`,
        `change_timestamp`,
        `remarks`
      )
    VALUES
      (
        NEW.id,
        OLD.status,
        NEW.status,
        NOW(),
        CONCAT('Automatic Audit Trigger: Status updated from "', OLD.status, '" to "', NEW.status, '".')
      );
  END IF;
END //
DELIMITER ;


-- =============================================================================
-- SECTION 5: CURSORS WITH EXCEPTION & NOT FOUND HANDLING
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Procedure 4: sp_identify_overdue_checkouts
-- Demonstrates an EXPLICIT CURSOR with a CONTINUE HANDLER FOR NOT FOUND.
-- Scans all checked_in guests whose check_out_date has passed (< CURDATE()).
-- Iterates row-by-row, calculates days overdue and outstanding balance,
-- and inserts flagged records into a temporary table for reporting.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_identify_overdue_checkouts`;
DELIMITER //
CREATE PROCEDURE `sp_identify_overdue_checkouts`()
COMMENT 'Demonstrates explicit cursor traversal identifying overdue guest departures'
BEGIN
  -- 1. Declare local working variables
  DECLARE v_done INT DEFAULT 0;
  DECLARE v_res_id INT;
  DECLARE v_booking_code VARCHAR(30);
  DECLARE v_guest_name VARCHAR(100);
  DECLARE v_guest_phone VARCHAR(20);
  DECLARE v_room_number VARCHAR(10);
  DECLARE v_check_out DATE;
  DECLARE v_days_overdue INT;
  DECLARE v_total_billed DECIMAL(10,2);
  DECLARE v_total_paid DECIMAL(10,2);
  DECLARE v_unpaid_balance DECIMAL(10,2);

  -- 2. Declare the Explicit Cursor
  DECLARE cur_overdue CURSOR FOR
    SELECT 
      res.id,
      res.booking_code,
      c.name,
      c.phone,
      r.room_number,
      res.check_out_date,
      DATEDIFF(CURRENT_DATE(), res.check_out_date) AS days_overdue
    FROM reservations res
    JOIN customers c ON res.customer_id = c.id
    JOIN rooms r ON res.room_id = r.id
    WHERE res.status = 'checked_in'
      AND res.check_out_date < CURRENT_DATE()
    ORDER BY res.check_out_date ASC;

  -- 3. Declare NOT FOUND condition handler for cursor termination
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  -- 4. Create in-memory temporary table to hold cursor-processed records
  CREATE TEMPORARY TABLE IF NOT EXISTS `tmp_overdue_checkouts` (
    `reservation_id` INT,
    `booking_code` VARCHAR(30),
    `guest_name` VARCHAR(100),
    `guest_phone` VARCHAR(20),
    `room_number` VARCHAR(10),
    `scheduled_check_out` DATE,
    `days_overdue` INT,
    `unpaid_balance` DECIMAL(10,2),
    `recommended_action` VARCHAR(150)
  );

  -- Clear any existing rows from previous session execution
  TRUNCATE TABLE `tmp_overdue_checkouts`;

  -- 5. Open cursor and begin row-by-row processing
  OPEN cur_overdue;

  read_loop: LOOP
    FETCH cur_overdue INTO 
      v_res_id, 
      v_booking_code, 
      v_guest_name, 
      v_guest_phone, 
      v_room_number, 
      v_check_out, 
      v_days_overdue;

    -- Exit loop when cursor finishes all rows
    IF v_done = 1 THEN
      LEAVE read_loop;
    END IF;

    -- Compute current balance for this specific reservation
    SELECT 
      COALESCE(gross_bill_amount, 0.00), 
      COALESCE(total_paid, 0.00), 
      COALESCE(remaining_balance, 0.00)
    INTO v_total_billed, v_total_paid, v_unpaid_balance
    FROM vw_payment_summary
    WHERE reservation_id = v_res_id;

    -- Insert formatted audit entry into temporary table
    INSERT INTO `tmp_overdue_checkouts` (
      `reservation_id`,
      `booking_code`,
      `guest_name`,
      `guest_phone`,
      `room_number`,
      `scheduled_check_out`,
      `days_overdue`,
      `unpaid_balance`,
      `recommended_action`
    ) VALUES (
      v_res_id,
      v_booking_code,
      v_guest_name,
      v_guest_phone,
      v_room_number,
      v_check_out,
      v_days_overdue,
      COALESCE(v_unpaid_balance, 0.00),
      CASE 
        WHEN v_days_overdue >= 3 THEN 'URGENT: Initiate security escalation & management review'
        WHEN v_unpaid_balance > 0 THEN 'Dispatch front-desk attendant for immediate settlement'
        ELSE 'Contact guest for key collection & check-out finalization'
      END
    );
  END LOOP;

  -- 6. Close the cursor
  CLOSE cur_overdue;

  -- 7. Return the processed result set
  SELECT * FROM `tmp_overdue_checkouts` ORDER BY `days_overdue` DESC;
END //
DELIMITER ;


-- =============================================================================
-- SECTION 6: TRANSACTIONS & EXCEPTION HANDLING
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Procedure 5: sp_create_reservation_transactional
-- Demonstrates START TRANSACTION, COMMIT, ROLLBACK, row-level locking (FOR UPDATE),
-- and EXIT HANDLER FOR SQLEXCEPTION.
-- Atomically books a room:
--   1. Validates input parameters.
--   2. Locks room row with SELECT ... FOR UPDATE.
--   3. Checks date overlap conflict.
--   4. Computes financial totals via fn_calculate_nights and fn_calculate_booking_amount.
--   5. Inserts reservation and initial status history.
--   6. Commits transaction or triggers automatic ROLLBACK on SQL error.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_create_reservation_transactional`;
DELIMITER //
CREATE PROCEDURE `sp_create_reservation_transactional`(
  IN p_customer_id INT,
  IN p_room_id INT,
  IN p_check_in DATE,
  IN p_check_out DATE,
  IN p_guests INT,
  IN p_special_requests TEXT,
  OUT p_booking_code VARCHAR(30),
  OUT p_status_message VARCHAR(255)
)
COMMENT 'ACID transactional room booking with row lock and exception rollback'
proc_main: BEGIN
  -- 1. Declare local working variables
  DECLARE v_nights INT;
  DECLARE v_nightly_rate DECIMAL(10,2);
  DECLARE v_total_amount DECIMAL(10,2);
  DECLARE v_capacity INT;
  DECLARE v_room_status VARCHAR(20);
  DECLARE v_room_number VARCHAR(10);
  DECLARE v_customer_exists INT DEFAULT 0;
  DECLARE v_conflict_count INT DEFAULT 0;
  DECLARE v_generated_code VARCHAR(30);
  DECLARE v_new_reservation_id INT;

  -- Diagnostics error capturing variables
  DECLARE v_sqlstate CHAR(5) DEFAULT '00000';
  DECLARE v_errmsg TEXT DEFAULT '';

  -- 2. Declare SQL Exception Handler to automatically ROLLBACK on database errors
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1
      v_sqlstate = RETURNED_SQLSTATE,
      v_errmsg = MESSAGE_TEXT;
    
    -- Rollback all changes
    ROLLBACK;

    SET p_booking_code = NULL;
    SET p_status_message = CONCAT('Transaction Aborted & Rolled Back: [', v_sqlstate, '] ', v_errmsg);
  END;

  -- 3. Input Validation Guards (before starting transaction)
  IF p_customer_id IS NULL OR p_room_id IS NULL THEN
    SET p_booking_code = NULL;
    SET p_status_message = 'Validation Failed: Customer ID and Room ID are required.';
    LEAVE proc_main;
  END IF;

  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in THEN
    SET p_booking_code = NULL;
    SET p_status_message = 'Validation Failed: Check-out date must be strictly after check-in date.';
    LEAVE proc_main;
  END IF;

  IF p_check_in < CURRENT_DATE() THEN
    SET p_booking_code = NULL;
    SET p_status_message = 'Validation Failed: Check-in date cannot be in the past.';
    LEAVE proc_main;
  END IF;

  IF p_guests IS NULL OR p_guests <= 0 THEN
    SET p_guests = 1;
  END IF;

  -- 4. BEGIN ATOMIC ACID TRANSACTION
  START TRANSACTION;

  -- 4.1 Verify Customer existence
  SELECT COUNT(*) INTO v_customer_exists 
  FROM customers 
  WHERE id = p_customer_id;

  IF v_customer_exists = 0 THEN
    ROLLBACK;
    SET p_booking_code = NULL;
    SET p_status_message = CONCAT('Customer ID #', p_customer_id, ' does not exist.');
    LEAVE proc_main;
  END IF;

  -- 4.2 Lock the target room row exclusively using SELECT ... FOR UPDATE
  SELECT 
    room_number, capacity, price_per_night, status 
  INTO 
    v_room_number, v_capacity, v_nightly_rate, v_room_status
  FROM rooms 
  WHERE id = p_room_id 
  FOR UPDATE;

  -- Verify room was found
  IF v_room_number IS NULL THEN
    ROLLBACK;
    SET p_booking_code = NULL;
    SET p_status_message = CONCAT('Room ID #', p_room_id, ' does not exist.');
    LEAVE proc_main;
  END IF;

  -- Check room operational readiness
  IF v_room_status != 'ACTIVE' THEN
    ROLLBACK;
    SET p_booking_code = NULL;
    SET p_status_message = CONCAT('Room ', v_room_number, ' is currently under MAINTENANCE and cannot be reserved.');
    LEAVE proc_main;
  END IF;

  -- Check room capacity limit
  IF p_guests > v_capacity THEN
    ROLLBACK;
    SET p_booking_code = NULL;
    SET p_status_message = CONCAT('Guest count (', p_guests, ') exceeds maximum capacity for Room ', v_room_number, ' (Max: ', v_capacity, ').');
    LEAVE proc_main;
  END IF;

  -- 4.3 Evaluate date overlap conflict under the active row lock
  SELECT COUNT(*) INTO v_conflict_count
  FROM reservations
  WHERE room_id = p_room_id
    AND status IN ('pending', 'confirmed', 'checked_in')
    AND check_in_date < p_check_out
    AND check_out_date > p_check_in;

  IF v_conflict_count > 0 THEN
    ROLLBACK;
    SET p_booking_code = NULL;
    SET p_status_message = CONCAT('Conflict: Room ', v_room_number, ' is already reserved for overlapping dates.');
    LEAVE proc_main;
  END IF;

  -- 4.4 Compute stay duration and financial amount using our stored functions
  SET v_nights = fn_calculate_nights(p_check_in, p_check_out);
  SET v_total_amount = fn_calculate_booking_amount(v_nights, v_nightly_rate);

  -- 4.5 Generate unique booking code
  SET v_generated_code = CONCAT(
    'RES-',
    DATE_FORMAT(CURRENT_DATE(), '%Y%m%d'),
    '-',
    HEX(FLOOR(1000 + (RAND() * 8999)))
  );

  -- 4.6 Insert reservation record
  INSERT INTO reservations (
    booking_code,
    customer_id,
    room_id,
    check_in_date,
    check_out_date,
    guests_count,
    nightly_rate,
    total_amount,
    status,
    special_requests
  ) VALUES (
    v_generated_code,
    p_customer_id,
    p_room_id,
    p_check_in,
    p_check_out,
    p_guests,
    v_nightly_rate,
    v_total_amount,
    'confirmed',
    p_special_requests
  );

  SET v_new_reservation_id = LAST_INSERT_ID();

  -- 4.7 Log initial booking status transition in audit table
  INSERT INTO reservation_status_history (
    reservation_id,
    previous_status,
    new_status,
    change_timestamp,
    remarks
  ) VALUES (
    v_new_reservation_id,
    NULL,
    'confirmed',
    NOW(),
    'Initial reservation created via stored transactional procedure.'
  );

  -- 4.8 COMMIT TRANSACTION & RELEASE ALL LOCKS
  COMMIT;

  SET p_booking_code = v_generated_code;
  SET p_status_message = CONCAT('Success: Reservation booked for ', v_nights, ' night(s) in Room ', v_room_number, ' (Total: ₹', v_total_amount, ').');
END //
DELIMITER ;


-- =============================================================================
-- SECTION 7: MYSQL WORKBENCH EXECUTION & VERIFICATION EXAMPLES
-- =============================================================================
/*
-- -----------------------------------------------------------------------------
-- EXAMPLE 1: Test Stored Functions
-- -----------------------------------------------------------------------------
SELECT 
  fn_calculate_nights('2026-12-01', '2026-12-05') AS test_nights,
  fn_calculate_booking_amount(4, 3500.00) AS test_tariff;

-- -----------------------------------------------------------------------------
-- EXAMPLE 2: Query Stored Views
-- -----------------------------------------------------------------------------
-- View full reservation details
SELECT * FROM vw_reservation_details LIMIT 5;

-- View billing and payment folios
SELECT * FROM vw_payment_summary WHERE billing_status = 'PARTIALLY_PAID';

-- -----------------------------------------------------------------------------
-- EXAMPLE 3: Find Available Rooms via Stored Procedure
-- -----------------------------------------------------------------------------
CALL sp_get_available_rooms('2026-11-20', '2026-11-25', 2);

-- -----------------------------------------------------------------------------
-- EXAMPLE 4: Query Monthly Revenue Breakdown
-- -----------------------------------------------------------------------------
CALL sp_get_monthly_revenue(2026);

-- -----------------------------------------------------------------------------
-- EXAMPLE 5: Generate Filtered Reservation Report
-- -----------------------------------------------------------------------------
CALL sp_generate_reservation_report('2026-10-01', '2026-12-31', 'confirmed');

-- -----------------------------------------------------------------------------
-- EXAMPLE 6: Identify Overdue Guest Check-Outs (Cursor traversal)
-- -----------------------------------------------------------------------------
CALL sp_identify_overdue_checkouts();

-- -----------------------------------------------------------------------------
-- EXAMPLE 7: Transactional Room Booking (START TRANSACTION & COMMIT)
-- -----------------------------------------------------------------------------
SET @out_code = '';
SET @out_msg = '';

CALL sp_create_reservation_transactional(
  1,                          -- Customer ID
  2,                          -- Room ID
  '2026-12-10',               -- Check-In Date
  '2026-12-14',               -- Check-Out Date
  2,                          -- Number of Guests
  'Ground floor requested.',  -- Special Requests
  @out_code,
  @out_msg
);

SELECT @out_code AS generated_booking_code, @out_msg AS transaction_status;

-- -----------------------------------------------------------------------------
-- EXAMPLE 8: Test Trigger (trg_reservations_status_change)
-- -----------------------------------------------------------------------------
-- Update a reservation status and observe automated insertion in history
UPDATE reservations SET status = 'checked_in' WHERE id = 1;
SELECT * FROM reservation_status_history WHERE reservation_id = 1 ORDER BY id DESC LIMIT 2;
*/

