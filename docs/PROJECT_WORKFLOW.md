# Hotel Reservation & Management System (HRMS) — System Workflows & Lifecycle Architecture

> **Academic Level:** Master of Computer Applications (MCA) Final Year Project  
> **Architecture:** Model-View-Controller (MVC) using Node.js, Express.js, EJS, and MySQL 8.4 LTS

---

## 📋 Table of Contents
1. [Authentication & Session Lifecycle](#1-authentication--session-lifecycle)
2. [Customer Management Workflow](#2-customer-management-workflow)
3. [Room Inventory Management Workflow](#3-room-inventory-management-workflow)
4. [Reservation & Overlap Prevention Engine](#4-reservation--overlap-prevention-engine)
5. [Guest Front-Desk Check-In & Check-Out](#5-guest-front-desk-check-in--check-out)
6. [Payment Settlement & Itemized Billing](#6-payment-settlement--itemized-billing)
7. [Executive Dashboard & Reporting Pipeline](#7-executive-dashboard--reporting-pipeline)

---

## 1. Authentication & Session Lifecycle

Administrative access to the application is protected by session-based authentication using **bcrypt (10 salt rounds)** and signed, HTTP-only cookies.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as System Administrator
    participant Browser as Web Client
    participant AuthRouter as Express Router (/login)
    participant AuthCtrl as authController
    participant AuthSvc as authService
    participant DB as MySQL (admin_users)
    participant Session as express-session Store

    Admin->>Browser: Enters username & password
    Browser->>AuthRouter: POST /login { username, password }
    AuthRouter->>AuthCtrl: processLogin(req, res)
    AuthCtrl->>AuthSvc: authenticate(username, password)
    AuthSvc->>DB: SELECT admin_id, password_hash FROM admin_users WHERE username = ?
    DB-->>AuthSvc: Return user record
    AuthSvc->>AuthSvc: bcrypt.compare(candidate, storedHash)
    
    alt Password Matches
        AuthSvc-->>AuthCtrl: { success: true, user }
        AuthCtrl->>Session: req.session.regenerate()
        AuthCtrl->>Session: req.session.adminUser = user
        Session-->>AuthCtrl: Session persisted
        AuthCtrl->>Browser: Set-Cookie: hrms_session_id; HttpOnly; SameSite=Lax (302 -> /)
        Browser->>Admin: Displays Executive Dashboard
    else Invalid Credentials
        AuthSvc-->>AuthCtrl: { success: false, message: 'Invalid username or password' }
        AuthCtrl->>Browser: Render auth/login (HTTP 401 with alert)
        Browser->>Admin: Displays error alert
    end
```

---

## 2. Customer Management Workflow

Manages guest profiles with unique phone and email validations. Relational integrity prevents deletion of customers with reservation history.

```mermaid
flowchart TD
    Start([Admin navigates to /customers]) --> ViewList[Display Customer Directory]
    ViewList --> ActionChoice{Admin Action}

    ActionChoice -->|Search| SearchInput[Submit query: name, email, or phone]
    SearchInput --> QueryDB[Execute parameterized LIKE query]
    QueryDB --> ViewList

    ActionChoice -->|Add Customer| AddForm[Render /customers/new]
    AddForm --> ValidateAdd{Server-side validation}
    ValidateAdd -->|Pass| CheckUniqueAdd{Check duplicate email/phone}
    CheckUniqueAdd -->|Unique| InsertCust[(INSERT INTO customers)]
    CheckUniqueAdd -->|Duplicate| AddErr[Display duplicate error banner]
    ValidateAdd -->|Fail| AddErr
    InsertCust --> SuccessRedirect[Redirect to /customers with flash banner]

    ActionChoice -->|Edit Customer| EditForm[Render /customers/:id/edit]
    EditForm --> ValidateEdit{Valid input & unique}
    ValidateEdit -->|Pass| UpdateCust[(UPDATE customers)]
    ValidateEdit -->|Fail| EditErr[Display validation error]
    UpdateCust --> SuccessRedirect

    ActionChoice -->|Delete Customer| ConfirmModal[Open Delete Confirmation Modal]
    ConfirmModal --> CheckResCount{Existing reservations > 0?}
    CheckResCount -->|Yes| BlockDelete[Reject deletion with integrity error]
    CheckResCount -->|No| DeleteCust[(DELETE FROM customers WHERE id = ?)]
    DeleteCust --> SuccessRedirect
```

---

## 3. Room Inventory Management Workflow

Maintains hotel room classifications (**Standard**, **Deluxe**, **Premium**, **Suite**) and operational status (**ACTIVE**, **MAINTENANCE**).

```mermaid
flowchart TD
    RoomsHome([Admin navigates to /rooms]) --> DualView{View Mode Toggle}
    DualView -->|Visual Grid| GridView[Render Room Cards with category badges & rates]
    DualView -->|Data Table| TableView[Render Filterable Structured Table]

    RoomsHome --> FilterChoice{Filter by Category or Status}
    FilterChoice --> FilterQuery[(SELECT FROM rooms WHERE category = ? AND status = ?)]
    FilterQuery --> DualView

    RoomsHome --> AddRoomAction[Add Room: /rooms/new]
    AddRoomAction --> RoomVal{Valid number, capacity >= 1, rate >= 0}
    RoomVal -->|Pass| CheckDupRoom{Room number exists?}
    CheckDupRoom -->|No| InsertRoom[(INSERT INTO rooms)]
    CheckDupRoom -->|Yes| DupRoomErr[Reject: Room Number already exists]
    InsertRoom --> RoomsRedirect[Redirect /rooms with success banner]

    RoomsHome --> DeleteRoomAction[Delete Room]
    DeleteRoomAction --> CheckRoomRes{Active/Historical reservations exist?}
    CheckRoomRes -->|Yes| BlockRoomDel[Reject: Room has associated reservations]
    CheckRoomRes -->|No| ExecRoomDel[(DELETE FROM rooms WHERE id = ?)]
    ExecRoomDel --> RoomsRedirect
```

---

## 4. Reservation & Overlap Prevention Engine

The core scheduling engine eliminates double-booking using **InnoDB Row-Level Locking (`SELECT ... FOR UPDATE`)** inside an ACID database transaction.

### Mathematical Overlap Condition
A conflict occurs if an existing reservation satisfies:
$$\text{existing\_check\_in} < \text{requested\_check\_out} \quad \text{AND} \quad \text{existing\_check\_out} > \text{requested\_check\_in}$$

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Hotel Front Desk
    participant Router as Reservation Router
    participant Service as reservationService
    participant DB as MySQL Database

    Admin->>Router: POST /reservations { customerId, roomId, checkIn, checkOut, guests }
    Router->>Service: createReservation(payload)
    Service->>DB: BEGIN TRANSACTION
    Service->>DB: SELECT * FROM customers WHERE id = ?
    Service->>DB: SELECT * FROM rooms WHERE id = ? FOR UPDATE (Row Locked)
    
    Service->>Service: Validate room.status == 'ACTIVE' & guests <= room.capacity
    Service->>DB: SELECT * FROM reservations WHERE room_id = ? AND status IN ('pending', 'confirmed', 'checked_in') AND check_in_date < checkOut AND check_out_date > checkIn
    
    alt Overlap Detected (Conflict Found)
        DB-->>Service: Return conflicting booking
        Service->>DB: ROLLBACK
        Service-->>Router: Throw Overlap Error
        Router-->>Admin: Re-render form with room conflict alert
    else Room Available (Zero Conflict)
        Service->>Service: nights = DATEDIFF(checkOut, checkIn)
        Service->>Service: total = nights * nightly_rate
        Service->>Service: bookingCode = generateBookingCode()
        Service->>DB: INSERT INTO reservations (booking_code, customer_id, room_id, check_in_date, check_out_date, nightly_rate, total_amount, status)
        Service->>DB: INSERT INTO reservation_status_history (reservation_id, new_status, remarks)
        Service->>DB: COMMIT (Locks Released)
        Service-->>Router: Return reservation summary
        Router-->>Admin: Redirect to /reservations/:id (Booking Confirmed)
    end
```

---

## 5. Guest Front-Desk Check-In & Check-Out

Tracks operational status transitions across the booking lifecycle:
$$\text{pending} \longrightarrow \text{confirmed} \longrightarrow \text{checked\_in} \longrightarrow \text{checked\_out}$$

```mermaid
stateDiagram-v2
    [*] --> Pending: Online / Incomplete Booking
    Pending --> Confirmed: Token Deposit Received
    [*] --> Confirmed: Standard Front-Desk Booking
    
    Confirmed --> CheckedIn: Guest Arrives & Verifies ID (/checkin)
    CheckedIn --> CheckedOut: Guest Departs & Folio Settled (/checkout)
    
    Pending --> Cancelled: Cancelled by Admin/Guest (/cancel)
    Confirmed --> Cancelled: Cancelled before Arrival (/cancel)
    
    CheckedOut --> [*]
    Cancelled --> [*]
```

---

## 6. Payment Settlement & Itemized Billing

Financial integrity is enforced strictly on the server:
$$\text{Room Charges} = \text{Nights} \times \text{Nightly Rate}$$
$$\text{Final Amount} = \text{Room Charges} + \text{Additional Services}$$
$$\text{Remaining Balance} = \text{Final Amount} - \sum \text{Successful Payments}$$

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Front Desk Cashier
    participant Router as /payments/new
    participant Service as billingService
    participant DB as MySQL (ACID Transaction)

    Admin->>Router: POST /payments { reservationId, amount, paymentMethod }
    Router->>Service: recordPayment(payload)
    Service->>DB: BEGIN TRANSACTION
    Service->>DB: SELECT * FROM reservations WHERE id = ? FOR UPDATE
    Service->>DB: SELECT * FROM reservation_services WHERE reservation_id = ? FOR UPDATE
    Service->>DB: SELECT * FROM payments WHERE reservation_id = ? AND payment_status = 'SUCCESS' FOR UPDATE
    
    Service->>Service: Calculate remainingBalance = finalAmount - paidAmount
    
    alt amount > remainingBalance
        Service->>DB: ROLLBACK
        Service-->>Router: Throw Overpayment Error
        Router-->>Admin: Display: "Payment cannot exceed remaining balance"
    else amount <= remainingBalance
        Service->>Service: Generate paymentReference = PAY-YYYYMMDD-XXXX
        Service->>DB: INSERT INTO payments (payment_reference, reservation_id, amount, payment_method, payment_status)
        alt remainingBalance - amount == 0
            Service->>DB: INSERT INTO reservation_status_history (remarks: 'Bill fully settled')
        end
        Service->>DB: COMMIT
        Service-->>Router: Return payment summary
        Router-->>Admin: Redirect to /payments/:id/receipt (Print-ready)
    end
```

---

## 7. Executive Dashboard & Reporting Pipeline

Real-time telemetry and 7 analytical reporting modules queried directly from persistent MySQL data using aggregate functions (`COUNT`, `SUM`, `AVG`, `GROUP BY`).

```mermaid
flowchart LR
    subgraph Data Sources
        C[customers table]
        R[rooms table]
        RES[reservations table]
        P[payments table]
    end

    subgraph Aggregation Pipeline
        Agg1[Occupancy & Availability Calculator]
        Agg2[Financial Revenue & Balance Reconciler]
        Agg3[Category & Monthly Time Series Aggregator]
    end

    subgraph Presentation
        DashCards[Executive Metric Cards]
        Telemetry[Operational Status Strip]
        Charts[Chart.js Canvases]
        Reports[7 Specialized PDF/Print Reports]
    end

    C & R & RES --> Agg1 --> DashCards & Telemetry
    RES & P --> Agg2 --> DashCards & Telemetry
    R & RES & P --> Agg3 --> Charts & Reports
```
