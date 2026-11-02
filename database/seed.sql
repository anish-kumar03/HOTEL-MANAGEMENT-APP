-- =============================================================================
-- HOTEL RESERVATION & MANAGEMENT SYSTEM (HRMS)
-- Database Sample Data Seed Script for MySQL 8.4 LTS
-- Target Database: hotel_reservation_db
-- =============================================================================

USE `hotel_reservation_db`;

-- Temporarily disable foreign keys for safe, idempotent re-seeding
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `reservation_status_history`;
TRUNCATE TABLE `payments`;
TRUNCATE TABLE `reservations`;
TRUNCATE TABLE `rooms`;
TRUNCATE TABLE `customers`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Insert 10 Customers
-- -----------------------------------------------------------------------------
INSERT INTO `customers` (`id`, `name`, `email`, `phone`, `address`) VALUES
(1, 'Aarav Sharma', 'aarav.sharma@example.com', '+91 98765 43210', '124 MG Road, Indiranagar, Bengaluru, Karnataka 560038'),
(2, 'Priya Patel', 'priya.patel@example.com', '+91 98234 56789', '45 CG Road, Navrangpura, Ahmedabad, Gujarat 380009'),
(3, 'Rohan Verma', 'rohan.verma@example.com', '+91 91234 56780', '78 Park Street, Kolkata, West Bengal 700016'),
(4, 'Ananya Iyer', 'ananya.iyer@example.com', '+91 99887 76655', '12 Anna Salai, T. Nagar, Chennai, Tamil Nadu 600017'),
(5, 'Vikram Malhotra', 'vikram.malhotra@example.com', '+91 98111 22334', '56 Connaught Place, New Delhi 110001'),
(6, 'Sneha Kulkarni', 'sneha.kulkarni@example.com', '+91 97654 32109', '89 FC Road, Shivajinagar, Pune, Maharashtra 411004'),
(7, 'Aditya Nair', 'aditya.nair@example.com', '+91 94470 12345', '23 Marine Drive, Ernakulam, Kochi, Kerala 682011'),
(8, 'Pooja Reddy', 'pooja.reddy@example.com', '+91 98490 98765', '101 Jubilee Hills, Hyderabad, Telangana 500033'),
(9, 'Kabir Mehta', 'kabir.mehta@example.com', '+91 98200 11223', '34 Bandra West, Mumbai, Maharashtra 400050'),
(10, 'Ishita Sengupta', 'ishita.sengupta@example.com', '+91 98300 44556', '15 Salt Lake City, Sector 5, Kolkata, West Bengal 700091');

-- -----------------------------------------------------------------------------
-- 2. Insert 15 Hotel Rooms (Across 4 Categories)
-- Categories: Standard Single, Deluxe Double, Executive Suite, Presidential Suite
-- -----------------------------------------------------------------------------
INSERT INTO `rooms` (`id`, `room_number`, `category`, `capacity`, `price_per_night`, `status`) VALUES
-- 1st Floor: Standard Single & Deluxe Double
(1,  '101', 'Standard Single', 1, 1500.00, 'available'),
(2,  '102', 'Standard Single', 1, 1500.00, 'available'),
(3,  '103', 'Standard Single', 1, 1500.00, 'cleaning'),
(4,  '104', 'Deluxe Double',   2, 2800.00, 'occupied'),
(5,  '105', 'Deluxe Double',   2, 2800.00, 'available'),

-- 2nd Floor: Deluxe Double & Executive Suite
(6,  '201', 'Deluxe Double',   2, 2800.00, 'reserved'),
(7,  '202', 'Deluxe Double',   2, 2800.00, 'available'),
(8,  '203', 'Deluxe Double',   2, 2800.00, 'available'),
(9,  '204', 'Executive Suite', 3, 5000.00, 'occupied'),
(10, '205', 'Executive Suite', 3, 5000.00, 'available'),

-- 3rd Floor: Executive Suite & Presidential Suite
(11, '301', 'Executive Suite', 3, 5000.00, 'available'),
(12, '302', 'Executive Suite', 3, 5000.00, 'maintenance'),
(13, '303', 'Presidential Suite', 4, 9500.00, 'available'),
(14, '304', 'Presidential Suite', 4, 9500.00, 'reserved'),
(15, '305', 'Presidential Suite', 4, 9500.00, 'available');

-- -----------------------------------------------------------------------------
-- 3. Insert Date-Relative Sample Reservations
-- Uses CURRENT_DATE, DATE_SUB, and DATE_ADD to keep demonstration data evergreen.
-- -----------------------------------------------------------------------------
INSERT INTO `reservations` 
(`id`, `booking_code`, `customer_id`, `room_id`, `check_in_date`, `check_out_date`, `nightly_rate`, `total_amount`, `status`, `special_requests`) 
VALUES
-- Res 1: Past completed stay (Checked-out 2 days ago)
(
  1, 
  'RES-2026-0001', 
  1, 
  3, 
  DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), 
  DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), 
  1500.00, 
  4500.00, 
  'checked_out', 
  'Quiet room on lower floor requested.'
),
-- Res 2: Currently occupied stay (Checked in yesterday, checking out in 2 days)
(
  2, 
  'RES-2026-0002', 
  2, 
  4, 
  DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), 
  DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), 
  2800.00, 
  8400.00, 
  'checked_in', 
  'Late check-out request.'
),
-- Res 3: Today arriving reservation (Confirmed for today, checking out in 3 days)
(
  3, 
  'RES-2026-0003', 
  3, 
  6, 
  CURRENT_DATE, 
  DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), 
  2800.00, 
  8400.00, 
  'confirmed', 
  'Airport pickup requested at 2 PM.'
),
-- Res 4: Executive Suite occupied (Checked in 2 days ago, checking out tomorrow)
(
  4, 
  'RES-2026-0004', 
  5, 
  9, 
  DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), 
  DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), 
  5000.00, 
  15000.00, 
  'checked_in', 
  'High-speed Ethernet required for business.'
),
-- Res 5: Future upcoming VIP booking (Checking in in 4 days, checking out in 7 days)
(
  5, 
  'RES-2026-0005', 
  9, 
  14, 
  DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), 
  DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), 
  9500.00, 
  28500.00, 
  'confirmed', 
  'Presidential suite flower bouquet arrangement.'
),
-- Res 6: Future tentative booking (Checking in in 10 days, pending confirmation)
(
  6, 
  'RES-2026-0006', 
  4, 
  5, 
  DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY), 
  DATE_ADD(CURRENT_DATE, INTERVAL 12 DAY), 
  2800.00, 
  5600.00, 
  'pending', 
  'Awaiting corporate travel desk approval.'
),
-- Res 7: Cancelled reservation
(
  7, 
  'RES-2026-0007', 
  6, 
  7, 
  DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), 
  CURRENT_DATE, 
  2800.00, 
  8400.00, 
  'cancelled', 
  'Cancelled due to emergency flight reschedule.'
);

-- -----------------------------------------------------------------------------
-- 4. Insert Sample Payments
-- -----------------------------------------------------------------------------
INSERT INTO `payments` 
(`id`, `payment_reference`, `reservation_id`, `amount`, `payment_method`, `payment_status`, `payment_date`, `transaction_id`, `notes`) 
VALUES
-- Payment for Res 1 (Full payment settled)
(1, 'PAY-2026-0001', 1, 4500.00, 'credit_card', 'completed', DATE_SUB(NOW(), INTERVAL 2 DAY), 'TXN_CC_9823419082', 'Settled in full at checkout.'),

-- Payment for Res 2 (Advance partial payment via UPI)
(2, 'PAY-2026-0002', 2, 5000.00, 'upi', 'completed', DATE_SUB(NOW(), INTERVAL 1 DAY), 'UPI/20261101/98127391', 'Advance paid at check-in via GPay.'),

-- Payment for Res 3 (Advance deposit via Net Banking)
(3, 'PAY-2026-0003', 3, 8400.00, 'bank_transfer', 'completed', DATE_SUB(NOW(), INTERVAL 3 DAY), 'NEFT_HDFC_887192301', 'Full booking tariff pre-paid.'),

-- Payment for Res 4 (Partial cash payment upon arrival)
(4, 'PAY-2026-0004', 4, 10000.00, 'cash', 'completed', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, 'Cash deposit received at front desk.'),

-- Payment for Res 5 (Advance guarantee via Credit Card)
(5, 'PAY-2026-0005', 5, 10000.00, 'credit_card', 'completed', DATE_SUB(NOW(), INTERVAL 1 DAY), 'TXN_AMEX_119283746', 'Advance booking token deposit.');

-- -----------------------------------------------------------------------------
-- 5. Insert Sample Reservation Status History
-- -----------------------------------------------------------------------------
INSERT INTO `reservation_status_history` 
(`id`, `reservation_id`, `previous_status`, `new_status`, `change_timestamp`, `remarks`) 
VALUES
-- Lifecycle for Res 1: pending -> confirmed -> checked_in -> checked_out
(1, 1, NULL,         'pending',     DATE_SUB(NOW(), INTERVAL 10 DAY), 'Booking created online.'),
(2, 1, 'pending',    'confirmed',   DATE_SUB(NOW(), INTERVAL 8 DAY),  'Deposit verified, booking confirmed.'),
(3, 1, 'confirmed',  'checked_in',  DATE_SUB(NOW(), INTERVAL 5 DAY),  'Guest arrived and received keys.'),
(4, 1, 'checked_in', 'checked_out', DATE_SUB(NOW(), INTERVAL 2 DAY),  'Bill settled, keys returned.'),

-- Lifecycle for Res 2: pending -> confirmed -> checked_in
(5, 2, NULL,         'pending',     DATE_SUB(NOW(), INTERVAL 4 DAY),  'Front-desk reservation created.'),
(6, 2, 'pending',    'confirmed',   DATE_SUB(NOW(), INTERVAL 3 DAY),  'Advance received.'),
(7, 2, 'confirmed',  'checked_in',  DATE_SUB(NOW(), INTERVAL 1 DAY),  'Checked in room 104.'),

-- Lifecycle for Res 3: pending -> confirmed
(8, 3, NULL,         'pending',     DATE_SUB(NOW(), INTERVAL 5 DAY),  'Booking request received.'),
(9, 3, 'pending',    'confirmed',   DATE_SUB(NOW(), INTERVAL 3 DAY),  'Bank transfer verified, confirmed.'),

-- Lifecycle for Res 7: pending -> confirmed -> cancelled
(10, 7, NULL,        'pending',     DATE_SUB(NOW(), INTERVAL 7 DAY),  'Reservation entered.'),
(11, 7, 'pending',   'confirmed',   DATE_SUB(NOW(), INTERVAL 6 DAY),  'Confirmed.'),
(12, 7, 'confirmed', 'cancelled',   DATE_SUB(NOW(), INTERVAL 4 DAY),  'Cancelled by guest due to flight cancellation.');

