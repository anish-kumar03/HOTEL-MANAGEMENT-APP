# Hotel Reservation & Management System (HRMS) — Comprehensive Test Cases & Validation Matrix

> **Academic Project:** Master of Computer Applications (MCA) Capstone  
> **Test Framework:** Node.js Native Test Runner (`node:test`, `node:assert/strict`)  
> **Total Test Execution Count:** 77 Automated Tests + E2E Database Suite (100% Passed)

---

## 📋 Table of Contents
1. [Test Execution Summary](#1-test-execution-summary)
2. [Module 1: Customer Management Test Cases](#2-module-1-customer-management-test-cases)
3. [Module 2: Room Inventory Management Test Cases](#3-module-2-room-inventory-management-test-cases)
4. [Module 3: Room Availability & Overlap Test Cases](#4-module-3-room-availability--overlap-test-cases)
5. [Module 4: Reservation & Booking Engine Test Cases](#5-module-4-reservation--booking-engine-test-cases)
6. [Module 5: Payment, Billing & Invoicing Test Cases](#6-module-5-payment-billing--invoicing-test-cases)
7. [Module 6: Administrator Authentication & Security Test Cases](#7-module-6-administrator-authentication--security-test-cases)
8. [Module 7: Dashboard & Analytics Test Cases](#8-module-7-dashboard--analytics-test-cases)
9. [Module 8: The 7 Specialized Reports Test Cases](#9-module-8-the-7-specialized-reports-test-cases)

---

## 1. Test Execution Summary

```text
======================================================================
TEST RUNNER SUMMARY: NODE.JS v24.x & MYSQL 8.4 LTS
======================================================================
ℹ Total Tests Registered: 77
ℹ Total Suites:          10
✔ Total Passed:          77 (100%)
✖ Total Failed:          0 (0%)
⏱ Duration:              8.39 seconds
======================================================================
```

---

## 2. Module 1: Customer Management Test Cases

| Test ID | Scenario | Input Data | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-CUST-01** | Add customer with valid data | Name: "Rahul Sharma", Email: "rahul@example.com", Phone: "+91 9876543210" | Customer inserted into MySQL, auto-increment ID generated | ID returned, inserted | **PASS** |
| **TC-CUST-02** | Rejection of short or empty name | Name: "A", Email: "valid@test.com", Phone: "9876543210" | Validation error: "Name must be at least 2 characters long" | Error thrown and displayed | **PASS** |
| **TC-CUST-03** | Rejection of malformed email | Name: "Ravi Kumar", Email: "invalid-email-address", Phone: "9876543210" | Validation error: "A valid email address is required" | Error thrown and displayed | **PASS** |
| **TC-CUST-04** | Rejection of insufficient phone digits | Name: "Ravi Kumar", Email: "ravi@test.com", Phone: "12345" | Validation error: "Valid phone number (at least 7 digits) required" | Error thrown and displayed | **PASS** |
| **TC-CUST-05** | Duplicate email rejection | Email: "existing@hotel.com" | MySQL UNIQUE constraint violation caught, user alert shown | Handled gracefully | **PASS** |
| **TC-CUST-06** | Search customer by keyword | Query: "Sharma" | Parameterized query matches against name, email, or phone | Filtered results returned | **PASS** |
| **TC-CUST-07** | Delete customer without reservations | Customer ID with 0 reservations | Record deleted from `customers` table | Record removed | **PASS** |
| **TC-CUST-08** | Prevention of customer deletion with reservations | Customer ID with active/past bookings | Deletion rejected with relational integrity error | Deletion blocked | **PASS** |

---

## 3. Module 2: Room Inventory Management Test Cases

| Test ID | Scenario | Input Data | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-ROOM-01** | Add room with valid attributes | Room: "501", Category: "Deluxe", Capacity: 2, Price: 3500.00, Status: "ACTIVE" | Room saved to `rooms` table | Inserted successfully | **PASS** |
| **TC-ROOM-02** | Validate 4 allowed room categories | Category: "Standard", "Deluxe", "Premium", "Suite" | All 4 accepted; other strings rejected | Validated correctly | **PASS** |
| **TC-ROOM-03** | Validate 2 operational statuses | Status: "ACTIVE", "MAINTENANCE" | Both accepted; invalid strings rejected | Validated correctly | **PASS** |
| **TC-ROOM-04** | Reject negative room price | Price: -500.00 | Validation error: "Price must be a positive number" | Rejected with error | **PASS** |
| **TC-ROOM-05** | Reject zero or negative capacity | Capacity: 0 | Validation error: "Capacity must be at least 1 guest" | Rejected with error | **PASS** |
| **TC-ROOM-06** | Prevent duplicate room numbers | Room Number: "101" (already in database) | UNIQUE constraint violation caught, user alerted | Duplicate blocked | **PASS** |
| **TC-ROOM-07** | Prevent room deletion with booking history | Room ID with existing reservations | Deletion blocked: "Room has associated reservations" | Deletion rejected | **PASS** |

---

## 4. Module 3: Room Availability & Overlap Test Cases

Existing Booking: **2026-11-10 (Check-in)** to **2026-11-15 (Check-out)**

| Test ID | Scenario | Requested Dates | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-AVAL-01** | Exact identical date interval | `2026-11-10` to `2026-11-15` | **Conflict Detected** (Overlap true) | **PASS** |
| **TC-AVAL-02** | Requested stay begins inside existing | `2026-11-12` to `2026-11-18` | **Conflict Detected** (Overlap true) | **PASS** |
| **TC-AVAL-03** | Requested stay ends inside existing | `2026-11-08` to `2026-11-12` | **Conflict Detected** (Overlap true) | **PASS** |
| **TC-AVAL-04** | Requested stay completely encompasses existing | `2026-11-05` to `2026-11-20` | **Conflict Detected** (Overlap true) | **PASS** |
| **TC-AVAL-05** | Requested stay completely within existing | `2026-11-11` to `2026-11-14` | **Conflict Detected** (Overlap true) | **PASS** |
| **TC-AVAL-06** | Back-to-back departure on arrival day | `2026-11-05` to `2026-11-10` | **No Conflict** (Allowed back-to-back turnover) | **PASS** |
| **TC-AVAL-07** | Back-to-back arrival on departure day | `2026-11-15` to `2026-11-20` | **No Conflict** (Allowed back-to-back turnover) | **PASS** |
| **TC-AVAL-08** | Completely disjoint date intervals | `2026-11-20` to `2026-11-25` | **No Conflict** (Allowed) | **PASS** |
| **TC-AVAL-09** | Exclude cancelled & checked-out bookings | Overlapping dates with `cancelled` booking | **No Conflict** (Cancelled status ignored) | **PASS** |

---

## 5. Module 4: Reservation & Booking Engine Test Cases

| Test ID | Scenario | Input Data | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-RES-01** | Stay duration calculation | Check-in: `2026-11-05`, Check-out: `2026-11-08` | Nights = 3 | Exact 3 nights computed | **PASS** |
| **TC-RES-02** | Total booking tariff calculation | Nights = 3, Nightly Rate = ₹2,800.00 | Total Amount = ₹8,400.00 | Computed ₹8,400.00 | **PASS** |
| **TC-RES-03** | Unique Booking ID generation | Two consecutive calls | Matches `^RES-\d{8}-[A-F0-9]{4}$`, codes distinct | Distinct codes returned | **PASS** |
| **TC-RES-04** | Date ordering validation | Check-out before Check-in | Rejection: "Check-Out Date must be after Check-In Date" | Rejected with error | **PASS** |
| **TC-RES-05** | Past date rejection | Check-in: `2020-01-01` | Rejection: "Check-In Date cannot be in the past" | Rejected with error | **PASS** |
| **TC-RES-06** | Guest capacity check | 4 guests in a 2-capacity Standard room | Rejection: "Guests count exceeds room capacity" | Rejected with error | **PASS** |
| **TC-RES-07** | Maintenance room lock | Attempt booking a MAINTENANCE status room | Rejection: "Room is currently under maintenance" | Booking blocked | **PASS** |
| **TC-RES-08** | Front-desk Check-In execution | Confirmed booking arrives | Status transitions from `confirmed` to `checked_in` | Status updated in DB | **PASS** |
| **TC-RES-09** | Front-desk Check-Out execution | Checked-in guest departs | Status transitions from `checked_in` to `checked_out` | Status updated in DB | **PASS** |
| **TC-RES-10** | Reservation cancellation | Active booking | Status transitions to `cancelled`, remarks logged | History logged in DB | **PASS** |

---

## 6. Module 5: Payment, Billing & Invoicing Test Cases

| Test ID | Scenario | Input Data | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-PAY-01** | Accepted payment methods | CASH, UPI, CARD | All 3 valid instruments accepted | Validated | **PASS** |
| **TC-PAY-02** | Room charges calculation | Nights = 4, Rate = ₹3,500.00 | Room Charges = ₹14,000.00 | Computed ₹14,000.00 | **PASS** |
| **TC-PAY-03** | Additional service charges integration | Room = ₹14,000.00, Laundry = ₹450.00 | Final Amount = ₹14,450.00 | Computed ₹14,450.00 | **PASS** |
| **TC-PAY-04** | Partial payment tracking | Bill = ₹14,450.00, Paid = ₹5,000.00 | Remaining Balance = ₹9,450.00 (Status: PARTIALLY_PAID) | Computed accurately | **PASS** |
| **TC-PAY-05** | Overpayment prevention guard | Remaining Balance = ₹9,450.00, Attempt = ₹10,000.00 | Rejection: "Payment cannot exceed remaining balance" | Overpayment rejected | **PASS** |
| **TC-PAY-06** | Zero or negative payment rejection | Amount = ₹0.00 or -₹500.00 | Rejection: "Payment must be greater than zero" | Rejected with error | **PASS** |
| **TC-PAY-07** | Successful full settlement | Remaining Balance = ₹9,450.00, Paid = ₹9,450.00 | Remaining Balance = ₹0.00, Status = "PAID" | Bill marked as PAID | **PASS** |
| **TC-PAY-08** | Payment voucher reference generation | Generated via crypto | Matches `^PAY-\d{8}-[A-F0-9]{4}$` | Correct format | **PASS** |
| **TC-PAY-09** | Zero card/CVV persistence | Card payment submission | Stored strictly as instrument metadata and ref ID; no raw card data stored | Audited clean | **PASS** |

---

## 7. Module 6: Administrator Authentication & Security Test Cases

| Test ID | Scenario | Input Data | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-AUTH-01** | Bcrypt password hashing | Plain: "SecretAdmin@2026" | Generates 10-round salted hash starting with `$2b$10$` | Valid hash generated | **PASS** |
| **TC-AUTH-02** | Correct password match | Plain matches hash | `bcrypt.compare` returns `true` | Evaluated true | **PASS** |
| **TC-AUTH-03** | Incorrect password mismatch | Plain does not match hash | `bcrypt.compare` returns `false` | Evaluated false | **PASS** |
| **TC-AUTH-04** | Password minimum length | Passwords < 6 chars | Throws: "Password must be at least 6 characters" | Thrown and handled | **PASS** |
| **TC-AUTH-05** | Empty login credentials rejection | Username: "", Password: "" | HTTP 400 with missing fields error | HTTP 400 returned | **PASS** |
| **TC-AUTH-06** | Nonexistent admin rejection | Username: "invalid_user" | HTTP 401 with "Invalid username or password" | HTTP 401 returned | **PASS** |
| **TC-AUTH-07** | Wrong password rejection | Password: "wrong_password" | HTTP 401 with "Invalid username or password" | HTTP 401 returned | **PASS** |
| **TC-AUTH-08** | Valid login session creation | Correct admin credentials | HTTP 302 redirect to `/`, `Set-Cookie` with `hrms_session_id`, `HttpOnly`, `SameSite=Lax` | Cookie issued | **PASS** |
| **TC-AUTH-09** | Unauthenticated HTML route access | GET `/` without cookie | HTTP 302 redirect to `/login?error=unauthorized` | Redirected | **PASS** |
| **TC-AUTH-10** | Unauthenticated API route access | GET `/api/dashboard/stats` without cookie | HTTP 401 Unauthorized JSON `{ success: false }` | HTTP 401 returned | **PASS** |
| **TC-AUTH-11** | Authenticated route access | GET `/` with valid session cookie | HTTP 200 OK rendering Executive Dashboard | HTTP 200 returned | **PASS** |
| **TC-AUTH-12** | Session expiration & tampering | Bogus signature cookie | Rejected with HTTP 302 redirect to `/login` | Redirected | **PASS** |
| **TC-AUTH-13** | Logout session termination | POST `/logout` with session cookie | Session destroyed, cookie cleared, HTTP 302 redirect to `/login?logout=success` | Session destroyed | **PASS** |

---

## 8. Module 7: Dashboard & Analytics Test Cases

| Test ID | Scenario | Metric / Chart | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-DASH-01** | Total physical room count | `totalRooms` | Corresponds to `COUNT(*) FROM rooms` | Exact integer | **PASS** |
| **TC-DASH-02** | Available rooms today | `availableRoomsToday` | Active rooms with no active booking for today | Verified | **PASS** |
| **TC-DASH-03** | Currently occupied rooms | `currentlyOccupiedRooms` | Rooms with active `checked_in` booking | Verified | **PASS** |
| **TC-DASH-04** | Monthly collected revenue | `monthlyRevenue` | `SUM(amount)` of SUCCESS payments in current month | Verified | **PASS** |
| **TC-DASH-05** | Outstanding payment balance | `pendingPaymentAmount` | Total billed minus total settled across active stays | Verified | **PASS** |
| **TC-DASH-06** | Monthly Revenue Chart dataset | `charts.monthlyRevenue` | 6-month time-series array of labels and amounts | Chart rendered | **PASS** |
| **TC-DASH-07** | Room Category Distribution Chart | `charts.roomCategories` | Category counts for Standard, Deluxe, Premium, Suite | Chart rendered | **PASS** |
| **TC-DASH-08** | Monthly Bookings Trend Chart | `charts.monthlyReservations` | Monthly counts of confirmed and checked-in bookings | Chart rendered | **PASS** |

---

## 9. Module 8: The 7 Specialized Reports Test Cases

| Test ID | Report Name | Route | Verified Features | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-REP-01** | Daily Reservation Report | `/reports/daily-reservations` | Single day / date range filter, status badges, guest names, daily tariff totals | **PASS** |
| **TC-REP-02** | Monthly Reservation Report | `/reports/monthly-reservations` | Year selector, monthly booking counts, average length of stay (ALOS), gross revenue | **PASS** |
| **TC-REP-03** | Customer Booking Report | `/reports/customer-bookings` | Search filter, guest lifetime reservations count, total spend, average spend | **PASS** |
| **TC-REP-04** | Room Availability Report | `/reports/room-availability` | Target date audit, available vs. occupied status, category distribution | **PASS** |
| **TC-REP-05** | Monthly Revenue Report | `/reports/monthly-revenue` | Year selector, Cash vs. UPI vs. Card breakdown, average transaction value | **PASS** |
| **TC-REP-06** | Payment History Report | `/reports/payment-history` | Method & status filters, search voucher ID, chronological settlement ledger | **PASS** |
| **TC-REP-07** | Cancelled Reservation Report | `/reports/cancelled-reservations` | Audit of cancelled bookings, cancellation reason, lost tariff revenue quantification | **PASS** |

