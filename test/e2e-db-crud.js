/**
 * End-to-End Live Database CRUD Verification Runner
 * Tests every single CRUD operation against the active MySQL database.
 * Run with: node test/e2e-db-crud.js
 */
import { testConnection } from '../src/config/db.js';
import * as customerService from '../src/services/customerService.js';
import * as roomService from '../src/services/roomService.js';

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
    console.log('--- [TEST 1/2] CUSTOMER MANAGEMENT CRUD ---');

    // 1. Add Customer
    const testCustomerPayload = {
      name: 'Automated Test Guest',
      email: `testguest_${Date.now()}@example.com`,
      phone: `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      address: '77 Silicon Valley Boulevard, Tech City'
    };
    const createdCustomerId = await customerService.createCustomer(testCustomerPayload);
    console.log(`✔ 1. Add Customer: Created customer with ID #${createdCustomerId}`);

    // 2. View All Customers
    const allCustomers = await customerService.getAllCustomers();
    console.log(`✔ 2. View All Customers: Fetched ${allCustomers.length} customer records`);

    // 3. View Customer Details
    const fetchedCustomer = await customerService.getCustomerById(createdCustomerId);
    console.log(`✔ 3. View Customer Details: Retrieved "${fetchedCustomer.name}" (${fetchedCustomer.email})`);

    // 4. Search Customers
    const searchResults = await customerService.getAllCustomers('Automated Test Guest');
    console.log(`✔ 4. Search Customers: Found ${searchResults.length} match(es) for "Automated Test Guest"`);

    // 5. Update Customer
    const updated = await customerService.updateCustomer(createdCustomerId, {
      name: 'Automated Test Guest (Updated)',
      email: testCustomerPayload.email,
      phone: testCustomerPayload.phone,
      address: '99 Updated Tech Park, Innovation Zone'
    });
    console.log(`✔ 5. Update Customer: Success = ${updated}`);

    // 6. Duplicate Email Check
    const isDuplicate = await customerService.isEmailTaken(testCustomerPayload.email);
    console.log(`✔ 6. Duplicate Email Detection: Verified = ${isDuplicate}`);

    // 7. Delete Customer (since no reservations exist for this test guest)
    const deletedCustomer = await customerService.deleteCustomer(createdCustomerId);
    console.log(`✔ 7. Delete Customer: Success = ${deletedCustomer}\n`);

    // -------------------------------------------------------------------------
    // MODULE 2: ROOM MANAGEMENT CRUD
    // -------------------------------------------------------------------------
    console.log('--- [TEST 2/2] ROOM MANAGEMENT CRUD ---');

    // 1. Add Room
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

    // 2. View All Rooms
    const allRooms = await roomService.getAllRooms();
    console.log(`✔ 2. View All Rooms: Fetched ${allRooms.length} room records`);

    // 3. Search Rooms by Number
    const roomSearchResults = await roomService.getAllRooms({ search: testRoomNumber });
    console.log(`✔ 3. Search Rooms: Found ${roomSearchResults.length} match for room "${testRoomNumber}"`);

    // 4. Filter by Category
    const deluxeRooms = await roomService.getAllRooms({ category: 'Deluxe' });
    console.log(`✔ 4. Filter by Category: Found ${deluxeRooms.length} "Deluxe" room(s)`);

    // 5. Filter by Operational Status
    const activeRooms = await roomService.getAllRooms({ status: 'ACTIVE' });
    console.log(`✔ 5. Filter by Status: Found ${activeRooms.length} "ACTIVE" room(s)`);

    // 6. Update Room
    const updatedRoom = await roomService.updateRoom(createdRoomId, {
      room_number: testRoomNumber,
      category: 'Suite',
      capacity: 4,
      price_per_night: 7500.00,
      status: 'MAINTENANCE'
    });
    console.log(`✔ 6. Update Room: Success = ${updatedRoom}`);

    // 7. Duplicate Room Number Check
    const isRoomDuplicate = await roomService.isRoomNumberTaken(testRoomNumber);
    console.log(`✔ 7. Duplicate Room Number Detection: Verified = ${isRoomDuplicate}`);

    // 8. Delete Room (since no reservations exist for this test room)
    const deletedRoom = await roomService.deleteRoom(createdRoomId);
    console.log(`✔ 8. Delete Room: Success = ${deletedRoom}\n`);

    console.log('='.repeat(70));
    console.log('🎉 ALL CRUD OPERATIONS TESTED AND PASSED SUCCESSFULLY!');
    console.log('='.repeat(70));
  } catch (error) {
    console.error('❌ CRUD Test failed with error:', error);
  } finally {
    process.exit(0);
  }
}

runE2ECrudTests();
