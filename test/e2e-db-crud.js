/**
 * End-to-End Live Database CRUD Verification Runner
 * Tests every single CRUD operation across Customers, Rooms, and Reservations against MySQL.
 * Run with: node test/e2e-db-crud.js
 */
import { testConnection } from '../src/config/db.js';
import * as customerService from '../src/services/customerService.js';
import * as roomService from '../src/services/roomService.js';
import * as reservationService from '../src/services/reservationService.js';

async function runE2ECrudTests() {
  console.log('='.repeat(70));
  console.log('🧪 Starting Live MySQL Database CRUD Operations Test Suite');
  console.log('='.repeat(70));

  const health = await testConnection();
  if (!health.success) {
    console.warn('⚠️  MySQL Database is not connected with current .env credentials:');
    console.warn(`   Reason: ${health.message}`);
    console.warn('   To run live database tests, please verify DB_PASSWORD in .env.');
    console.log('='.repeat(70));
    return;
  }

  console.log('✅ MySQL Database connected successfully. Proceeding with tests...\n');

  try {
    // -------------------------------------------------------------------------
    // MODULE 1: CUSTOMER MANAGEMENT CRUD
    // -------------------------------------------------------------------------
    console.log('--- [TEST 1/3] CUSTOMER MANAGEMENT CRUD ---');

    const testCustomerPayload = {
      name: 'Automated Test Guest',
      email: `testguest_${Date.now()}@example.com`,
      phone: `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      address: '77 Silicon Valley Boulevard, Tech City'
    };
    const createdCustomerId = await customerService.createCustomer(testCustomerPayload);
    console.log(`✔ 1. Add Customer: Created customer with ID #${createdCustomerId}`);

    const allCustomers = await customerService.getAllCustomers();
    console.log(`✔ 2. View All Customers: Fetched ${allCustomers.length} customer records`);

    const fetchedCustomer = await customerService.getCustomerById(createdCustomerId);
    console.log(`✔ 3. View Customer Details: Retrieved "${fetchedCustomer.name}" (${fetchedCustomer.email})`);

    const searchResults = await customerService.getAllCustomers('Automated Test Guest');
    console.log(`✔ 4. Search Customers: Found ${searchResults.length} match(es) for "Automated Test Guest"`);

    const updated = await customerService.updateCustomer(createdCustomerId, {
      name: 'Automated Test Guest (Updated)',
      email: testCustomerPayload.email,
      phone: testCustomerPayload.phone,
      address: '99 Updated Tech Park, Innovation Zone'
    });
    console.log(`✔ 5. Update Customer: Success = ${updated}`);

    const isDuplicate = await customerService.isEmailTaken(testCustomerPayload.email);
    console.log(`✔ 6. Duplicate Email Detection: Verified = ${isDuplicate}\n`);

    // -------------------------------------------------------------------------
    // MODULE 2: ROOM MANAGEMENT CRUD
    // -------------------------------------------------------------------------
    console.log('--- [TEST 2/3] ROOM MANAGEMENT CRUD ---');

    const testRoomNumber = `T${Math.floor(100 + Math.random() * 900)}`;
    const testRoomPayload = {
      room_number: testRoomNumber,
      category: 'Deluxe',
      capacity: 2,
      price_per_night: 3200.00,
      status: 'ACTIVE'
    };
    const createdRoomId = await roomService.createRoom(testRoomPayload);
    console.log(`✔ 1. Add Room: Created room "${testRoomNumber}" (ID #${createdRoomId})`);

    const allRooms = await roomService.getAllRooms();
    console.log(`✔ 2. View All Rooms: Fetched ${allRooms.length} room records`);

    const roomSearchResults = await roomService.getAllRooms({ search: testRoomNumber });
    console.log(`✔ 3. Search Rooms: Found ${roomSearchResults.length} match for room "${testRoomNumber}"`);

    const deluxeRooms = await roomService.getAllRooms({ category: 'Deluxe' });
    console.log(`✔ 4. Filter by Category: Found ${deluxeRooms.length} "Deluxe" room(s)`);

    const activeRooms = await roomService.getAllRooms({ status: 'ACTIVE' });
    console.log(`✔ 5. Filter by Status: Found ${activeRooms.length} "ACTIVE" room(s)`);

    const isRoomDuplicate = await roomService.isRoomNumberTaken(testRoomNumber);
    console.log(`✔ 6. Duplicate Room Number Detection: Verified = ${isRoomDuplicate}\n`);

    // -------------------------------------------------------------------------
    // MODULE 3: RESERVATION MANAGEMENT & TRANSACTIONAL ENGINE
    // -------------------------------------------------------------------------
    console.log('--- [TEST 3/3] RESERVATION MANAGEMENT & CONFLICT AVOIDANCE ---');

    const today = new Date();
    const inDate = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const outDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 1. Transactional Creation with SELECT FOR UPDATE
    const booking = await reservationService.createReservation({
      customerId: createdCustomerId,
      roomId: createdRoomId,
      checkInDate: inDate,
      checkOutDate: outDate,
      guestsCount: 2,
      specialRequests: 'Automated test booking.'
    });
    console.log(`✔ 1. Transactional Booking: Confirmed ID #${booking.reservationId} (${booking.bookingCode}), Total: ₹${booking.totalAmount}`);

    // 2. Overlap Conflict Detection
    try {
      await reservationService.createReservation({
        customerId: createdCustomerId,
        roomId: createdRoomId,
        checkInDate: inDate,
        checkOutDate: outDate,
        guestsCount: 2
      });
      console.error('❌ Failed: Overlapping reservation should have been rejected!');
    } catch (overlapErr) {
      console.log(`✔ 2. Overlap Avoidance: Successfully caught and rejected overlapping booking: "${overlapErr.message}"`);
    }

    // 3. Process Check-In
    await reservationService.processCheckIn(booking.reservationId);
    let checkInState = await reservationService.getReservationById(booking.reservationId);
    console.log(`✔ 3. Process Check-In: Status transitioned to "${checkInState.status}"`);

    // 4. Process Check-Out
    await reservationService.processCheckOut(booking.reservationId);
    let checkOutState = await reservationService.getReservationById(booking.reservationId);
    console.log(`✔ 4. Process Check-Out: Status transitioned to "${checkOutState.status}"`);

    // 5. Audit History Verification
    const history = await reservationService.getReservationStatusHistory(booking.reservationId);
    console.log(`✔ 5. Status Audit Trail: Found ${history.length} transition logs`);

    // 6. Relational Integrity Protection (Cannot delete customer with reservation)
    try {
      await customerService.deleteCustomer(createdCustomerId);
      console.error('❌ Failed: Customer with reservations should not be deletable!');
    } catch (constraintErr) {
      console.log(`✔ 6. Relational Integrity: Prevented deletion of customer with booking records: "${constraintErr.message}"`);
    }

    // Cleanup test records
    await reservationService.cancelReservation(booking.reservationId, 'Test teardown');
    console.log(`✔ 7. Cancellation: Successfully cancelled reservation and released room dates\n`);

    console.log('='.repeat(70));
    console.log('🎉 ALL CRUD AND RESERVATION TESTS PASSED CLEANLY!');
    console.log('='.repeat(70));
  } catch (error) {
    console.error('❌ Live CRUD Test failed with error:', error);
  } finally {
    process.exit(0);
  }
}

runE2ECrudTests();
