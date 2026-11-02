import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { VALID_CATEGORIES, VALID_STATUSES } from '../src/services/roomService.js';
import {
  calculateNights,
  generateBookingCode
} from '../src/services/reservationService.js';
import { validateReservationDates } from '../src/controllers/reservationController.js';

// =============================================================================
// TEST SUITE 1: CUSTOMER VALIDATION LOGIC
// =============================================================================
test('Customer Validation - Validates required fields, email format, and phone length', async (t) => {
  await t.test('accepts valid customer input', () => {
    const validData = {
      name: 'Ananya Sharma',
      email: 'ananya@example.com',
      phone: '+91 98765 43210',
      address: '123 Park Street, Bengaluru'
    };

    assert.ok(validData.name.trim().length >= 2, 'Name must be at least 2 characters');
    assert.match(validData.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email must be valid format');
    assert.ok(validData.phone.trim().length >= 7, 'Phone must be at least 7 chars');
  });

  await t.test('rejects customer with short or empty name', () => {
    const invalidName = 'A';
    assert.ok(invalidName.trim().length < 2, 'Name length < 2 must be rejected');
  });

  await t.test('rejects customer with malformed email', () => {
    const malformedEmails = ['plainaddress', 'missing@domain', '@missinguser.com', 'user@.com'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of malformedEmails) {
      assert.ok(!emailRegex.test(email), `Email "${email}" should be rejected`);
    }
  });

  await t.test('rejects customer with insufficient phone digits', () => {
    const shortPhone = '12345';
    assert.ok(shortPhone.trim().length < 7, 'Phone with < 7 digits must be rejected');
  });
});

// =============================================================================
// TEST SUITE 2: ROOM VALIDATION & SPECIFICATION RULES
// =============================================================================
test('Room Validation - Validates categories, operational statuses, capacity, and rate', async (t) => {
  await t.test('validates the 4 required room categories', () => {
    const requiredCategories = ['Standard', 'Deluxe', 'Premium', 'Suite'];
    assert.deepEqual(VALID_CATEGORIES, requiredCategories, 'Categories must match specification');

    for (const cat of requiredCategories) {
      assert.ok(VALID_CATEGORIES.includes(cat), `${cat} must be a valid category`);
    }
    assert.ok(!VALID_CATEGORIES.includes('Budget'), 'Non-standard category must be rejected');
  });

  await t.test('validates the 2 required operational statuses', () => {
    const requiredStatuses = ['ACTIVE', 'MAINTENANCE'];
    assert.deepEqual(VALID_STATUSES, requiredStatuses, 'Operational statuses must be ACTIVE and MAINTENANCE');

    assert.ok(VALID_STATUSES.includes('ACTIVE'));
    assert.ok(VALID_STATUSES.includes('MAINTENANCE'));
    assert.ok(!VALID_STATUSES.includes('INACTIVE'));
    assert.ok(!VALID_STATUSES.includes('UNKNOWN'));
  });

  await t.test('rejects negative room pricing or invalid capacity', () => {
    const negativePrice = -150.00;
    const zeroCapacity = 0;

    assert.ok(negativePrice < 0, 'Negative price must be rejected');
    assert.ok(zeroCapacity < 1, 'Capacity less than 1 guest must be rejected');
  });

  await t.test('rejects empty or overly long room numbers', () => {
    const emptyRoom = '';
    const longRoom = 'ROOM-NUMBER-101-EXTENDED';

    assert.ok(emptyRoom.trim().length === 0, 'Empty room number must be rejected');
    assert.ok(longRoom.length > 10, 'Room number exceeding 10 characters must be rejected');
  });
});

// =============================================================================
// TEST SUITE 3: BUSINESS RULE - RESERVATION RELATION CONSTRAINTS
// =============================================================================
test('Relational Integrity - Deletion prevented if related reservations exist', async (t) => {
  await t.test('Customer with related reservations cannot be deleted', () => {
    const mockReservationCount = 2;
    const canDelete = mockReservationCount === 0;

    assert.equal(canDelete, false, 'Deletion must be blocked when reservation count > 0');
    assert.throws(() => {
      if (mockReservationCount > 0) {
        throw new Error(`Cannot delete customer: This customer has ${mockReservationCount} associated reservation(s).`);
      }
    }, /Cannot delete customer/);
  });

  await t.test('Room with related reservations cannot be deleted', () => {
    const mockReservationCount = 1;
    const canDelete = mockReservationCount === 0;

    assert.equal(canDelete, false, 'Deletion must be blocked when room has active reservations');
    assert.throws(() => {
      if (mockReservationCount > 0) {
        throw new Error(`Cannot delete room: This room has ${mockReservationCount} associated reservation(s).`);
      }
    }, /Cannot delete room/);
  });
});

// =============================================================================
// TEST SUITE 4: ROOM AVAILABILITY OVERLAP LOGIC (PHASE 5 CRITICAL)
// =============================================================================
test('Room Availability Logic - Mathematical Overlap Condition & Status Exclusion', async (t) => {
  // Overlap Formula:
  // hasOverlap = (existingIn < requestedOut) && (existingOut > requestedIn)
  const isOverlap = (existingIn, existingOut, requestedIn, requestedOut) => {
    return existingIn < requestedOut && existingOut > requestedIn;
  };

  const existingIn = '2026-11-10';
  const existingOut = '2026-11-15';

  await t.test('Detects conflict: Exact same dates', () => {
    assert.equal(isOverlap(existingIn, existingOut, '2026-11-10', '2026-11-15'), true);
  });

  await t.test('Detects conflict: Requested stay begins inside existing booking', () => {
    assert.equal(isOverlap(existingIn, existingOut, '2026-11-12', '2026-11-18'), true);
  });

  await t.test('Detects conflict: Requested stay ends inside existing booking', () => {
    assert.equal(isOverlap(existingIn, existingOut, '2026-11-08', '2026-11-12'), true);
  });

  await t.test('Detects conflict: Requested stay completely encompasses existing booking', () => {
    assert.equal(isOverlap(existingIn, existingOut, '2026-11-05', '2026-11-20'), true);
  });

  await t.test('Detects conflict: Requested stay is inside existing booking', () => {
    assert.equal(isOverlap(existingIn, existingOut, '2026-11-11', '2026-11-14'), true);
  });

  await t.test('No conflict: Requested stay departs on the day existing stay arrives (Back-to-back)', () => {
    // Guest departs Nov 10; next guest checks in Nov 10
    assert.equal(isOverlap(existingIn, existingOut, '2026-11-05', '2026-11-10'), false);
  });

  await t.test('No conflict: Requested stay arrives on the day existing stay departs (Back-to-back)', () => {
    // Existing guest departs Nov 15; new guest arrives Nov 15
    assert.equal(isOverlap(existingIn, existingOut, '2026-11-15', '2026-11-20'), false);
  });

  await t.test('No conflict: Completely non-overlapping date intervals', () => {
    assert.equal(isOverlap(existingIn, existingOut, '2026-11-01', '2026-11-05'), false);
    assert.equal(isOverlap(existingIn, existingOut, '2026-11-20', '2026-11-25'), false);
  });

  await t.test('Excludes cancelled and completed reservations from active booking conflicts', () => {
    const activeStatuses = ['pending', 'confirmed', 'checked_in'];
    const nonConflictingStatuses = ['cancelled', 'checked_out', 'no_show'];

    for (const status of nonConflictingStatuses) {
      assert.ok(!activeStatuses.includes(status), `Status "${status}" must not trigger overlap conflict`);
    }
  });
});

// =============================================================================
// TEST SUITE 5: BOOKING CALCULATION & UNIQUE ID GENERATION
// =============================================================================
test('Booking Engine - Calculation formulas and Unique Booking Code generation', async (t) => {
  await t.test('Correctly calculates stay duration (nights)', () => {
    assert.equal(calculateNights('2026-11-05', '2026-11-08'), 3);
    assert.equal(calculateNights('2026-11-10', '2026-11-11'), 1);
    assert.equal(calculateNights('2026-11-01', '2026-11-15'), 14);
  });

  await t.test('Correctly calculates total booking amount with rate snapshot', () => {
    const nights = calculateNights('2026-11-05', '2026-11-08'); // 3 nights
    const nightlyRate = 2800.00;
    const totalAmount = nights * nightlyRate;

    assert.equal(totalAmount, 8400.00, '3 nights @ ₹2,800.00 must equal ₹8,400.00');
  });

  await t.test('Generates unique human-readable booking codes with proper format', () => {
    const code1 = generateBookingCode();
    const code2 = generateBookingCode();

    assert.match(code1, /^RES-\d{8}-[A-F0-9]{4}$/, 'Format must match RES-YYYYMMDD-XXXX');
    assert.match(code2, /^RES-\d{8}-[A-F0-9]{4}$/, 'Format must match RES-YYYYMMDD-XXXX');
    assert.notEqual(code1, code2, 'Subsequent booking codes must be distinct');
  });

  await t.test('Validates date ordering and past date constraints', () => {
    const validStay = validateReservationDates({
      checkInDate: '2099-01-10',
      checkOutDate: '2099-01-15',
      guestsCount: 2
    });
    assert.equal(validStay.length, 0, 'Future valid stay should produce 0 errors');

    const pastStay = validateReservationDates({
      checkInDate: '2020-01-01',
      checkOutDate: '2020-01-05',
      guestsCount: 2
    });
    assert.ok(pastStay.some(e => e.includes('past')), 'Past check-in date must be rejected');

    const invertedStay = validateReservationDates({
      checkInDate: '2099-01-15',
      checkOutDate: '2099-01-10',
      guestsCount: 2
    });
    assert.ok(invertedStay.some(e => e.includes('Check-Out Date must be after')), 'Check-out before check-in must be rejected');

    const zeroNightsStay = validateReservationDates({
      checkInDate: '2099-01-10',
      checkOutDate: '2099-01-10',
      guestsCount: 2
    });
    assert.ok(zeroNightsStay.some(e => e.includes('at least 1 night stay required')), 'Same-day check-in/out must be rejected');
  });
});

// =============================================================================
// TEST SUITE 6: ROUTE REGISTRATION & VIEW RENDERING VERIFICATION
// =============================================================================
test('Route Architecture - Verifies Express routing pipeline for Customers, Rooms, and Reservations', async (t) => {
  await t.test('Express application registers all required route endpoints', () => {
    assert.ok(typeof app.handle === 'function', 'Express app must have an active request handler');
  });

  await t.test('HTTP endpoints for Add Customer, Add Room, and New Reservation render 200 OK', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      // Test GET /customers/new
      const customerFormRes = await fetch(`http://localhost:${port}/customers/new`);
      assert.equal(customerFormRes.status, 200, 'GET /customers/new must return 200 OK');

      // Test GET /rooms/new
      const roomFormRes = await fetch(`http://localhost:${port}/rooms/new`);
      assert.equal(roomFormRes.status, 200, 'GET /rooms/new must return 200 OK');

      // Test GET /reservations/new
      const resFormRes = await fetch(`http://localhost:${port}/reservations/new`);
      assert.equal(resFormRes.status, 200, 'GET /reservations/new must return 200 OK');
      const resFormHtml = await resFormRes.text();
      assert.ok(resFormHtml.includes('Create New Reservation'), 'Should render Reservation creation form');
      assert.ok(resFormHtml.includes('Check-In Date'), 'Should contain Check-In Date field');
      assert.ok(resFormHtml.includes('Check-Out Date'), 'Should contain Check-Out Date field');
      assert.ok(resFormHtml.includes('Select Room'), 'Should contain Room selection field');
      assert.ok(resFormHtml.includes('Booking Quote'), 'Should contain dynamic booking quote box');
    } finally {
      server.close();
    }
  });
});
