# Entity-Relationship (ER) Diagram Specification: HRMS

**Academic Level:** MCA Capstone Standard  
**Notation:** Crow's Foot Relational Notation  
**Diagram Format:** Mermaid.js `erDiagram`  
**RDBMS Target:** MySQL 8.4 LTS (InnoDB Relational Engine)  

---

## 1. High-Level Relational Model Overview

The database architecture for the **Hotel Reservation & Management System (HRMS)** consists of **11 normalized relational entities** designed to model hospitality transactions, guest histories, room availability state, and multi-line item billing.

### Primary Relationship Cardinalities:
- **Room Type to Rooms:** `1 : N` (One room classification encompasses many physical rooms).
- **Room Type to Amenities:** `M : N` (Resolved via `room_type_amenities` junction entity).
- **Customer to Reservations:** `1 : N` (One registered guest can make multiple lifetime reservations).
- **Room to Reservations:** `1 : N` (One physical room hosts multiple non-overlapping reservations over time).
- **Reservation to Invoice:** `1 : 1` (Each reservation maps deterministically to exactly one billing invoice).
- **Invoice to Invoice Items:** `1 : N` (An invoice contains one or more itemized charges).
- **Invoice to Payments:** `1 : N` (An invoice can be settled via multiple partial or full payment transactions).
- **User to Reservations / Payments / Logs:** `1 : N` (Administrative users create bookings, record payments, and generate audit logs).

---

## 2. Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ RESERVATIONS : "creates / manages"
    USERS ||--o{ PAYMENTS : "records"
    USERS ||--o{ ACTIVITY_LOGS : "triggers"

    ROOM_TYPES ||--|{ ROOMS : "classifies"
    ROOM_TYPES ||--o{ ROOM_TYPE_AMENITIES : "features"
    AMENITIES ||--o{ ROOM_TYPE_AMENITIES : "assigned to"

    CUSTOMERS ||--o{ RESERVATIONS : "books"
    ROOMS ||--o{ RESERVATIONS : "allocated to"

    RESERVATIONS ||--|| INVOICES : "generates"
    INVOICES ||--|{ INVOICE_ITEMS : "contains"
    INVOICES ||--o{ PAYMENTS : "settled by"

    USERS {
        int_unsigned id PK
        varchar_50 username UK
        varchar_255 password_hash
        varchar_100 full_name
        varchar_100 email UK
        varchar_20 phone
        enum role
        enum status
        datetime last_login_at
        timestamp created_at
        timestamp updated_at
    }

    ROOM_TYPES {
        int_unsigned id PK
        varchar_50 name UK
        text description
        decimal_10_2 base_price_per_night
        tinyint_unsigned max_occupancy_adults
        tinyint_unsigned max_occupancy_children
        timestamp created_at
        timestamp updated_at
    }

    AMENITIES {
        int_unsigned id PK
        varchar_50 name UK
        varchar_50 icon_class
        varchar_255 description
    }

    ROOM_TYPE_AMENITIES {
        int_unsigned room_type_id PK, FK
        int_unsigned amenity_id PK, FK
    }

    ROOMS {
        int_unsigned id PK
        varchar_10 room_number UK
        int_unsigned room_type_id FK
        smallint floor_number
        enum status
        enum cleanliness_status
        text remarks
        timestamp created_at
        timestamp updated_at
    }

    CUSTOMERS {
        int_unsigned id PK
        varchar_50 first_name
        varchar_50 last_name
        varchar_100 email UK
        varchar_20 phone UK
        enum id_proof_type
        varchar_100 id_proof_number
        varchar_255 address_line
        varchar_100 city
        varchar_100 state
        varchar_100 country
        varchar_20 postal_code
        timestamp created_at
        timestamp updated_at
    }

    RESERVATIONS {
        int_unsigned id PK
        varchar_20 booking_reference UK
        int_unsigned customer_id FK
        int_unsigned room_id FK
        date check_in_date
        date check_out_date
        datetime actual_check_in
        datetime actual_check_out
        tinyint_unsigned adults_count
        tinyint_unsigned children_count
        int_unsigned total_nights
        decimal_10_2 room_rate_per_night
        decimal_10_2 estimated_total
        enum status
        text special_requests
        int_unsigned created_by FK
        timestamp created_at
        timestamp updated_at
    }

    INVOICES {
        int_unsigned id PK
        varchar_30 invoice_number UK
        int_unsigned reservation_id UK, FK
        date issue_date
        decimal_10_2 subtotal_amount
        decimal_5_2 tax_rate
        decimal_10_2 tax_amount
        decimal_10_2 discount_amount
        decimal_10_2 additional_charges
        decimal_10_2 total_amount
        decimal_10_2 paid_amount
        decimal_10_2 balance_amount
        enum payment_status
        text notes
        timestamp created_at
        timestamp updated_at
    }

    INVOICE_ITEMS {
        int_unsigned id PK
        int_unsigned invoice_id FK
        enum item_type
        varchar_255 description
        smallint_unsigned quantity
        decimal_10_2 unit_price
        decimal_10_2 total_price
        timestamp created_at
    }

    PAYMENTS {
        int_unsigned id PK
        varchar_30 payment_reference UK
        int_unsigned invoice_id FK
        decimal_10_2 amount
        enum payment_method
        datetime payment_date
        varchar_100 transaction_id
        enum payment_status
        int_unsigned recorded_by FK
        text notes
        timestamp created_at
    }

    ACTIVITY_LOGS {
        int_unsigned id PK
        int_unsigned user_id FK
        varchar_100 action
        varchar_50 entity_type
        int_unsigned entity_id
        text details
        varchar_45 ip_address
        timestamp created_at
    }
```

---

## 3. Entity-Relationship Cardinality Table

| Entity A (Parent) | Cardinality | Entity B (Child) | Foreign Key Attribute | Relationship Semantics | Cascading Rule |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `room_types` | `1 : N` | `rooms` | `rooms.room_type_id` | Each room belongs to exactly one category; a category has many rooms. | `ON DELETE RESTRICT` |
| `room_types` | `1 : N` | `room_type_amenities`| `room_type_amenities.room_type_id` | Associates categories with multiple amenities. | `ON DELETE CASCADE` |
| `amenities` | `1 : N` | `room_type_amenities`| `room_type_amenities.amenity_id` | Associates individual amenities with categories. | `ON DELETE CASCADE` |
| `customers` | `1 : N` | `reservations` | `reservations.customer_id` | A customer books one or more reservations over time. | `ON DELETE RESTRICT` |
| `rooms` | `1 : N` | `reservations` | `reservations.room_id` | A room is booked across distinct non-overlapping intervals. | `ON DELETE RESTRICT` |
| `users` | `1 : N` | `reservations` | `reservations.created_by` | Tracks which staff member keyed in the reservation. | `ON DELETE SET NULL` |
| `reservations` | `1 : 1` | `invoices` | `invoices.reservation_id` | Each reservation generates exactly one billing folio. | `ON DELETE RESTRICT` |
| `invoices` | `1 : N` | `invoice_items` | `invoice_items.invoice_id` | An invoice has line-item details (room charges, laundry, etc.). | `ON DELETE CASCADE` |
| `invoices` | `1 : N` | `payments` | `payments.invoice_id` | An invoice can be paid in full or across partial payments. | `ON DELETE RESTRICT` |
| `users` | `1 : N` | `payments` | `payments.recorded_by` | Tracks the cashier who accepted the settlement. | `ON DELETE SET NULL` |
| `users` | `1 : N` | `activity_logs` | `activity_logs.user_id` | Tracks operator actions across the entire application. | `ON DELETE SET NULL` |

---

## 4. Relational Schema Representation (Database Notation)

Below is the formal relational schema specification indicating Primary Keys (`PK`) and Foreign Keys (`FK`):

```
USERS (
    id [PK], username, password_hash, full_name, email, phone, role, status, 
    last_login_at, created_at, updated_at
)

ROOM_TYPES (
    id [PK], name, description, base_price_per_night, max_occupancy_adults, 
    max_occupancy_children, created_at, updated_at
)

AMENITIES (
    id [PK], name, icon_class, description
)

ROOM_TYPE_AMENITIES (
    room_type_id [PK, FK -> ROOM_TYPES.id], 
    amenity_id [PK, FK -> AMENITIES.id]
)

ROOMS (
    id [PK], room_number, room_type_id [FK -> ROOM_TYPES.id], floor_number, 
    status, cleanliness_status, remarks, created_at, updated_at
)

CUSTOMERS (
    id [PK], first_name, last_name, email, phone, id_proof_type, id_proof_number, 
    address_line, city, state, country, postal_code, created_at, updated_at
)

RESERVATIONS (
    id [PK], booking_reference, customer_id [FK -> CUSTOMERS.id], 
    room_id [FK -> ROOMS.id], check_in_date, check_out_date, actual_check_in, 
    actual_check_out, adults_count, children_count, total_nights, 
    room_rate_per_night, estimated_total, status, special_requests, 
    created_by [FK -> USERS.id], created_at, updated_at
)

INVOICES (
    id [PK], invoice_number, reservation_id [FK -> RESERVATIONS.id, UNIQUE], 
    issue_date, subtotal_amount, tax_rate, tax_amount, discount_amount, 
    additional_charges, total_amount, paid_amount, balance_amount, 
    payment_status, notes, created_at, updated_at
)

INVOICE_ITEMS (
    id [PK], invoice_id [FK -> INVOICES.id], item_type, description, 
    quantity, unit_price, total_price, created_at
)

PAYMENTS (
    id [PK], payment_reference, invoice_id [FK -> INVOICES.id], amount, 
    payment_method, payment_date, transaction_id, payment_status, 
    recorded_by [FK -> USERS.id], notes, created_at
)

ACTIVITY_LOGS (
    id [PK], user_id [FK -> USERS.id], action, entity_type, entity_id, 
    details, ip_address, created_at
)
```

---

## 5. Relational Business Constraints & Integrity Rules

1. **Chronological Validity Constraint:**
   $$\text{check\_out\_date} > \text{check\_in\_date}$$
   Enforced via SQL `CHECK` constraint: `CONSTRAINT chk_res_dates CHECK (check_out_date > check_in_date)`.

2. **Temporal Overlap Prevention (Zero Double-Booking Guarantee):**
   A room $R$ cannot be allocated to a new reservation with interval $[A_{in}, A_{out}]$ if there exists any active reservation with interval $[B_{in}, B_{out}]$ for room $R$ where:
   $$(B_{in} < A_{out}) \land (B_{out} > A_{in}) \land (\text{status} \in \{\text{'confirmed'}, \text{'checked\_in'}, \text{'pending'}\})$$

3. **Financial Conservation Law (Invoice Calculation):**
   $$\text{subtotal} = \sum (\text{invoice\_items.total\_price})$$
   $$\text{tax\_amount} = \frac{\text{subtotal} \times \text{tax\_rate}}{100}$$
   $$\text{total\_amount} = \text{subtotal} + \text{tax\_amount} + \text{additional\_charges} - \text{discount\_amount}$$
   $$\text{paid\_amount} = \sum (\text{payments.amount where status = 'completed'})$$
   $$\text{balance\_amount} = \text{total\_amount} - \text{paid\_amount}$$

4. **Financial Settlement State Consistency:**
   - If $\text{paid\_amount} = 0 \implies \text{payment\_status} = \text{'unpaid'}$
   - If $0 < \text{paid\_amount} < \text{total\_amount} \implies \text{payment\_status} = \text{'partially\_paid'}$
   - If $\text{paid\_amount} \ge \text{total\_amount} \implies \text{payment\_status} = \text{'paid'}$

