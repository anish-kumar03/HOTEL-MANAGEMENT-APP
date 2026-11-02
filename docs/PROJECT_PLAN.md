# Project Plan: Hotel Reservation & Management System (HRMS)

**Degree Program:** Master of Computer Applications (MCA)  
**Project Category:** Enterprise Web Application Development  
**Academic Year:** 2026  
**Document Version:** 1.0.0  
**Architectural Baseline:** MVC Pattern (Node.js, Express.js, EJS, MySQL 8.4 LTS)

---

## 1. Executive Summary & Abstract

The **Hotel Reservation & Management System (HRMS)** is an integrated, web-based enterprise application engineered to streamline daily hotel administrative and hospitality operations. Designed to replace error-prone manual ledgers and fragmented record-keeping systems, HRMS provides a unified, role-based platform for room inventory tracking, guest record administration, reservation scheduling with conflict avoidance, check-in/check-out lifecycle management, automated billing/invoicing, and financial/occupancy reporting.

The system is constructed strictly adhering to the classical **Model-View-Controller (MVC)** architectural pattern using **Node.js** and **Express.js** on the server side, **EJS (Embedded JavaScript)** with **Bootstrap 5** on the presentation layer, and **MySQL 8.4 LTS** with the `mysql2` driver as the relational data store.

---

## 2. Problem Statement & Motivation

Hospitality operations in small to mid-scale properties frequently suffer from:
1. **Double-Booking & Scheduling Collisions:** Reliance on manual logbooks or spreadsheets causes overlapping reservations for identical room inventories.
2. **Disconnected Billing & Payment Tracking:** Manual invoice calculations result in tax discrepancies, missing amenity charges, and lack of audit trails for partial payments.
3. **Fragmented Guest Data:** Lack of centralized guest histories limits repeat-guest recognition and slows the check-in process.
4. **Lack of Operational Intelligence:** Compiling occupancy metrics and daily revenue requires manual ledger reconciliation, preventing real-time operational decision-making.

HRMS addresses these issues by enforcing relational data integrity, atomic transactions for reservation bookings, automated invoice calculation, and real-time analytical reporting.

---

## 3. Project Objectives

- **Centralized Administration:** Provide a comprehensive administrative dashboard delivering real-time Key Performance Indicators (KPIs) such as total occupancy, pending check-ins, today's check-outs, and revenue metrics.
- **Conflict-Free Reservation Engine:** Enforce deterministic room availability validation using date-range overlapping algorithms to guarantee zero double-bookings.
- **Full Operational Lifecycle:** Model guest interactions seamlessly across states: `Pending` -> `Confirmed` -> `Checked-In` -> `Checked-Out` -> `Billed`.
- **Accurate Financial Processing:** Automate itemized invoice generation with tax calculations, miscellaneous service charges, payment logging, and balance tracking.
- **Reporting & Business Insights:** Provide exportable/printable reports for reservation patterns, room utilization rates, and revenue trends over user-defined date ranges.
- **Academic Rigor:** Meet highest MCA academic standards through 3rd Normal Form (3NF) database schema design, parameterized SQL execution for SQL injection prevention, strict server-side validation, and decoupled MVC architecture.

---

## 4. Stakeholder & User Persona Analysis

| Role | Primary Responsibilities | System Access / Permissions |
| :--- | :--- | :--- |
| **System Administrator** | System health, staff user management, system audit logs, global configuration, full data management. | Full unrestricted access (CRUD on all modules, user creation, financial audits). |
| **Hotel Manager** | Revenue oversight, room pricing, occupancy reporting, overrides, promotional discounts. | Reports, reservations, room rates, financial dashboards, customer management. |
| **Front Desk Receptionist** | Daily guest check-in/check-out, walk-in reservations, availability checks, payments, invoice printing. | Customer CRUD, Room availability search, Reservation lifecycle, Payment logging, Invoice viewing. |

---

## 5. Scope Definition

### 5.1 In-Scope Features
1. **Authentication & Access Control:**
   - Secure administrator authentication using session cookies (`express-session`).
   - Password hashing via `bcryptjs`.
   - Route protection middleware preventing unauthorized access.
2. **Dashboard & Analytics:**
   - Real-time counter metrics: Total Rooms, Occupied Rooms, Available Rooms, Maintenance Rooms.
   - Quick operational queues: Today's scheduled arrivals and departures.
   - 30-day revenue and booking trend visualization.
3. **Master Room Management:**
   - Room Types management (Standard, Deluxe, Executive, Suite) with base prices and occupancy limits.
   - Amenities catalog (Wi-Fi, AC, Jacuzzi, Breakfast, TV) mapped to room types.
   - Individual Room inventory management (Room number, floor, status: `available`, `occupied`, `reserved`, `maintenance`, `cleaning`).
4. **Customer / Guest Registry:**
   - Complete demographic profile, contact details, identity proof documentation (Passport, National ID, Aadhaar, Driving License).
   - Historical stay logs and reservation history per customer.
5. **Availability Engine & Booking System:**
   - Date-interval query system (`check_in_date` to `check_out_date`) filtering available rooms.
   - Multi-step booking workflow with immediate room locking.
   - Reservation status state-machine (`pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled`, `no_show`).
6. **Front-Desk Check-In & Check-Out:**
   - Quick check-in verification, ID validation, key assignment.
   - Check-out workflow triggering automated room cleaning status updates and final bill reconciliation.
7. **Billing, Invoicing & Payments:**
   - Itemized invoice creation: Room charges per night + extra charges (room service, damages, laundry) + taxes - discounts.
   - Payment processing module supporting multi-modal payments (`Cash`, `Card`, `UPI`, `Bank Transfer`).
   - Partial payment handling with balance tracking.
   - Printable HTML invoice templates with professional print stylesheet.
8. **Reports & Exports:**
   - Reservation Report (filtered by date range, room type, status).
   - Revenue & Financial Report (grouped by date, payment mode, with gross, tax, net breakdown).
   - Printable and tabular formats suitable for academic review.

### 5.2 Out-of-Scope (Deliberately Excluded for Scope Control)
- Integration with external payment gateways (e.g. Stripe, Razorpay) requiring live merchant credentials and webhooks.
- Multi-property / multi-tenant hotel chain management (focused on single hotel property).
- Public-facing consumer booking portal (focused on admin/staff management system as required by specification).
- IoT smart door lock hardware integrations.
- SMS/Email dispatch gateways (placeholder notification services designed instead).

---

## 6. Functional Requirements Specification

```
[FR-01] Authentication & Session Management
  ├── FR-01.1: System shall allow administrators to authenticate using username and password.
  ├── FR-01.2: Passwords shall be hashed using bcrypt (salt rounds >= 10).
  ├── FR-01.3: System shall invalidate sessions on logout and reject expired session cookies.
  └── FR-01.4: Protected routes shall redirect unauthenticated users to the login screen with flash feedback.

[FR-02] Admin Dashboard
  ├── FR-02.1: Display summary cards: Total Rooms, Available Today, Occupied Today, Total Guests, Monthly Revenue.
  ├── FR-02.2: Display dynamic tabular lists for "Today's Expected Check-Ins" and "Today's Expected Check-Outs".
  └── FR-02.3: Provide quick-action buttons for New Reservation, Check-in, and Add Room.

[FR-03] Customer Management
  ├── FR-03.1: Admin can create, view, search, edit, and archive customer profiles.
  ├── FR-03.2: Enforce uniqueness on customer email and phone number.
  ├── FR-03.3: Capture identity proof type and government ID number.
  └── FR-03.4: Display complete reservation and billing history on the customer profile page.

[FR-04] Room & Room Type Management
  ├── FR-04.1: Manage Room Types with custom pricing, capacity constraints, and descriptions.
  ├── FR-04.2: Manage physical rooms with unique room numbers and floor assignments.
  ├── FR-04.3: Toggle room operational states: available, occupied, reserved, maintenance, cleaning.
  └── FR-04.4: Associate room types with specific amenities.

[FR-05] Availability Checking Engine
  ├── FR-05.1: Given Check-In Date, Check-Out Date, and Guest Count, query rooms with no overlapping bookings.
  ├── FR-05.2: Overlap condition: (res.check_in_date < search_check_out AND res.check_out_date > search_check_in).
  └── FR-05.3: Filter rooms by room type, floor, or maximum occupancy.

[FR-06] Reservation Management
  ├── FR-06.1: Create reservation linking verified customer, assigned room, and dates.
  ├── FR-06.2: Generate unique human-readable booking reference (e.g. RES-YYYYMMDD-XXXX).
  ├── FR-06.3: Calculate estimated room charges based on night count and room type base rate.
  ├── FR-06.4: Support cancellation with automated room inventory release.
  └── FR-06.5: Prevent overlapping bookings at the database and application levels.

[FR-07] Front Desk Check-In & Check-Out
  ├── FR-07.1: Check-in converts reservation status to 'checked_in' and room status to 'occupied'.
  ├── FR-07.2: Record actual check-in timestamp.
  ├── FR-07.3: Check-out validates balance settlement (warning if balance > 0).
  ├── FR-07.4: Check-out converts reservation to 'checked_out' and room status to 'cleaning'.
  └── FR-07.5: Record actual check-out timestamp.

[FR-08] Billing & Invoicing
  ├── FR-08.1: Automatically generate an invoice upon reservation confirmation or check-out.
  ├── FR-08.2: Support line items: Room nights, extra guest fees, room service, laundry, taxes.
  ├── FR-08.3: Calculate subtotal, applicable taxes (e.g. 12% / 18% GST/VAT), discount, and grand total.
  └── FR-08.4: Render a clean, printable HTML invoice with print styling (`@media print`).

[FR-09] Payment Management
  ├── FR-09.1: Record payments against specific invoices.
  ├── FR-09.2: Support payment modes: Cash, Credit Card, Debit Card, UPI, Bank Transfer.
  ├── FR-09.3: Update invoice balance and status ('unpaid', 'partially_paid', 'paid') atomically.
  └── FR-09.4: Generate unique payment receipts (e.g. PAY-YYYYMMDD-XXXX).

[FR-10] Reports & Analytics
  ├── FR-10.1: Reservation Report: Filter by date range, status, room type; aggregate booking volume.
  ├── FR-10.2: Revenue Report: Filter by date range, payment method; calculate total billed vs total collected.
  ├── FR-10.3: Room Occupancy Report: Calculate percentage occupancy over selected timeframes.
  └── FR-10.4: Provide print-friendly and CSV export views for all reports.
```

---

## 7. Non-Functional Requirements (NFRs)

| Metric | Target / Specification | Implementation Strategy |
| :--- | :--- | :--- |
| **Performance** | Page render response time < 250ms for normal queries. | Connection pooling via `mysql2/promise` (`connectionLimit: 10`), indexed foreign keys and date columns. |
| **Security** | Zero SQL Injection vulnerabilities; secure session management. | Parameterized SQL queries throughout; `bcryptjs` password hashing; `httpOnly` secure cookies. |
| **Data Integrity** | Strict relational consistency; ACID compliance on transactions. | InnoDB storage engine; foreign key constraints with `RESTRICT` on financial records; explicit SQL transactions (`START TRANSACTION`, `COMMIT`, `ROLLBACK`). |
| **Reliability** | Graceful degradation and zero unhandled promise rejections. | Centralized Express error handler middleware; structured logging; environment-driven stack trace masking. |
| **Maintainability** | Clean Code & MVC separation. | Strict separation: Routes -> Controllers -> Services/Models -> EJS Views. |
| **Usability** | Responsive across desktop and tablet viewports. | Bootstrap 5 grid layout, standard icon sets (Bootstrap Icons), consistent form validation styling. |

---

## 8. Requirements Traceability Matrix (RTM)

| Req ID | Requirement Description | Database Entity / Tables | Controller / Route Handler | Primary View / UI Component |
| :--- | :--- | :--- | :--- | :--- |
| **FR-01** | Admin Authentication | `admins` / `users` | `AuthController` (`/login`, `/logout`) | `views/auth/login.ejs` |
| **FR-02** | Dashboard & Metrics | All tables via analytical queries | `DashboardController` (`/dashboard`) | `views/dashboard/index.ejs` |
| **FR-03** | Customer Management | `customers` | `CustomerController` (`/customers/*`) | `views/customers/*.ejs` |
| **FR-04** | Room & Type Management | `rooms`, `room_types`, `amenities` | `RoomController` (`/rooms/*`, `/room-types/*`) | `views/rooms/*.ejs` |
| **FR-05** | Availability Search | `rooms`, `reservations` | `AvailabilityController` (`/availability`) | `views/availability/index.ejs` |
| **FR-06** | Reservations | `reservations`, `customers`, `rooms` | `ReservationController` (`/reservations/*`) | `views/reservations/*.ejs` |
| **FR-07** | Check-in / Check-out | `reservations`, `rooms` | `CheckInOutController` (`/checkin-checkout/*`) | `views/checkin-checkout/*.ejs` |
| **FR-08** | Invoicing & Billing | `invoices`, `invoice_items` | `BillingController` (`/invoices/*`) | `views/billing/invoice-view.ejs` |
| **FR-09** | Payment Processing | `payments`, `invoices` | `PaymentController` (`/payments/*`) | `views/billing/payment-modal.ejs` |
| **FR-10** | Reports & Analytics | Aggregations across all tables | `ReportController` (`/reports/*`) | `views/reports/*.ejs` |

