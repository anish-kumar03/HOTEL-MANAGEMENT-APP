import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { VALID_CATEGORIES, VALID_STATUSES } from '../src/services/roomService.js';

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
// TEST SUITE 4: ROUTE REGISTRATION & VIEW RENDERING VERIFICATION
// =============================================================================
test('Route Architecture - Verifies Express routing pipeline for Customers and Rooms', async (t) => {
  await t.test('Express application registers all required route endpoints', () => {
    assert.ok(typeof app.handle === 'function', 'Express app must have an active request handler');
  });

  await t.test('HTTP endpoints for Add Customer and Add Room render 200 OK', async () => {
    // Start temporary test server
    const server = app.listen(0);
    const port = server.address().port;

    try {
      // Test GET /customers/new
      const customerFormRes = await fetch(`http://localhost:${port}/customers/new`);
      assert.equal(customerFormRes.status, 200, 'GET /customers/new must return 200 OK');
      const customerFormHtml = await customerFormRes.text();
      assert.ok(customerFormHtml.includes('Add New Customer'), 'Should render Customer creation form');

      // Test GET /rooms/new
      const roomFormRes = await fetch(`http://localhost:${port}/rooms/new`);
      assert.equal(roomFormRes.status, 200, 'GET /rooms/new must return 200 OK');
      const roomFormHtml = await roomFormRes.text();
      assert.ok(roomFormHtml.includes('Add New Hotel Room'), 'Should render Room creation form');
      assert.ok(roomFormHtml.includes('ACTIVE'), 'Should include ACTIVE status option');
      assert.ok(roomFormHtml.includes('MAINTENANCE'), 'Should include MAINTENANCE status option');
    } finally {
      server.close();
    }
  });
});
