# Parking System Manual Testing Guide with Postman

This guide provides step-by-step instructions for testing all the key functionalities of the parking system using Postman.

## Setup in Postman

1. Create a new Postman Collection called "Parking System Tests"
2. Set up environment variables:
   - `base_url`: `http://localhost:3000/api`
   - `token1`: Empty (will be filled after login)
   - `token2`: Empty (will be filled after login)
   - `parking_lot_id`: Empty (will be filled after getting nearby lots)
   - `reservation_id1`: Empty (will be filled after creating reservation)
   - `reservation_id2`: Empty (will be filled after creating reservation)

## Test 1: User Authentication

### Test 1.1: Register User 1 (if not already created)
- **Request**: `POST {{base_url}}/auth/register`
- **Body**:
  ```json
  {
    "name": "Test User 1",
    "email": "user1@example.com",
    "password": "password123"
  }
  ```
- **Expected Response**: User created successfully with 201 status

### Test 1.2: Register User 2 (if not already created)
- **Request**: `POST {{base_url}}/auth/register`
- **Body**:
  ```json
  {
    "name": "Test User 2",
    "email": "user2@example.com",
    "password": "password123"
  }
  ```
- **Expected Response**: User created successfully with 201 status

### Test 1.3: Login User 1
- **Request**: `POST {{base_url}}/auth/login`
- **Body**:
  ```json
  {
    "email": "user1@example.com",
    "password": "password123"
  }
  ```
- **Expected Response**: Token returned
- **Post Test**: Set `token1` environment variable with the token from response

### Test 1.4: Login User 2
- **Request**: `POST {{base_url}}/auth/login`
- **Body**:
  ```json
  {
    "email": "user2@example.com",
    "password": "password123"
  }
  ```
- **Expected Response**: Token returned
- **Post Test**: Set `token2` environment variable with the token from response

## Test 2: Parking Lots

### Test 2.1: Get Nearby Parking Lots
- **Request**: `GET {{base_url}}/parking-lots/nearby?lat=13.0827&lng=80.2707&radius=10`
- **Headers**: `Authorization: Bearer {{token1}}`
- **Expected Response**: List of parking lots with availability information
- **Post Test**: Set `parking_lot_id` environment variable with the ID of the first parking lot

### Test 2.2: Get Specific Parking Lot
- **Request**: `GET {{base_url}}/parking-lots/{{parking_lot_id}}`
- **Headers**: `Authorization: Bearer {{token1}}`
- **Expected Response**: Detailed information about the parking lot including current availability

## Test 3: Availability Checking

### Test 3.1: Check Current Availability
- **Request**: `GET {{base_url}}/parking-lots/{{parking_lot_id}}/availability?vehicle_type=car`
- **Headers**: `Authorization: Bearer {{token1}}`
- **Expected Response**: Availability information for cars at the current time

### Test 3.2: Check Future Availability
- Create a date 2 hours from now in ISO format (e.g., `2023-06-15T14:00:00.000Z`)
- **Request**: `GET {{base_url}}/parking-lots/{{parking_lot_id}}/availability?vehicle_type=car&start_time=2023-06-15T14:00:00.000Z`
- **Headers**: `Authorization: Bearer {{token1}}`
- **Expected Response**: Projected availability for cars at the future time

## Test 4: Reservations

### Test 4.1: Create Immediate Reservation (User 1)
- **Request**: `POST {{base_url}}/reservations`
- **Headers**: `Authorization: Bearer {{token1}}`
- **Body**:
  ```json
  {
    "parking_lot_id": "{{parking_lot_id}}",
    "vehicle_type": "car",
    "vehicle_number": "TN07AB1234",
    "reserve_now": true
  }
  ```
- **Expected Response**: New reservation with status "active"
- **Post Test**: Set `reservation_id1` environment variable with the ID of the created reservation

### Test 4.2: Create Future Reservation (User 2)
- Create a date 1 hour from now in ISO format (e.g., `2023-06-15T13:00:00.000Z`)
- **Request**: `POST {{base_url}}/reservations`
- **Headers**: `Authorization: Bearer {{token2}}`
- **Body**:
  ```json
  {
    "parking_lot_id": "{{parking_lot_id}}",
    "vehicle_type": "bike",
    "vehicle_number": "TN07CD5678",
    "start_time": "2023-06-15T13:00:00.000Z"
  }
  ```
- **Expected Response**: New reservation with status "pending"
- **Post Test**: Set `reservation_id2` environment variable with the ID of the created reservation

### Test 4.3: Check Availability After Reservations
- **Request**: `GET {{base_url}}/parking-lots/{{parking_lot_id}}/availability?vehicle_type=car`
- **Headers**: `Authorization: Bearer {{token1}}`
- **Expected Response**: Reduced availability for cars

### Test 4.4: Get User 1 Reservations
- **Request**: `GET {{base_url}}/reservations`
- **Headers**: `Authorization: Bearer {{token1}}`
- **Expected Response**: List containing the active car reservation

### Test 4.5: Get User 2 Reservations
- **Request**: `GET {{base_url}}/reservations`
- **Headers**: `Authorization: Bearer {{token2}}`
- **Expected Response**: List containing the pending bike reservation

## Test 5: Reservation Lifecycle

### Test 5.1: Start Pending Reservation (User 2)
- **Request**: `POST {{base_url}}/reservations/{{reservation_id2}}/start`
- **Headers**: `Authorization: Bearer {{token2}}`
- **Expected Response**: Updated reservation with status "active"

### Test 5.2: Check Availability After Starting Reservation
- **Request**: `GET {{base_url}}/parking-lots/{{parking_lot_id}}/availability?vehicle_type=bike`
- **Headers**: `Authorization: Bearer {{token2}}`
- **Expected Response**: Reduced availability for bikes

### Test 5.3: End Active Reservation (User 1)
- **Request**: `POST {{base_url}}/reservations/{{reservation_id1}}/end`
- **Headers**: `Authorization: Bearer {{token1}}`
- **Expected Response**: Updated reservation with status "completed", end time set, and fee calculated

### Test 5.4: Check Availability After Ending Reservation
- **Request**: `GET {{base_url}}/parking-lots/{{parking_lot_id}}/availability?vehicle_type=car`
- **Headers**: `Authorization: Bearer {{token1}}`
- **Expected Response**: Increased availability for cars

## Test 6: Reservation Cancellation

### Test 6.1: Create a Future Reservation to Cancel
- Create a date 3 hours from now in ISO format
- **Request**: `POST {{base_url}}/reservations`
- **Headers**: `Authorization: Bearer {{token1}}`
- **Body**:
  ```json
  {
    "parking_lot_id": "{{parking_lot_id}}",
    "vehicle_type": "car",
    "vehicle_number": "TN07EF9101",
    "start_time": "2023-06-15T15:00:00.000Z"
  }
  ```
- **Expected Response**: New reservation with status "pending"
- **Post Test**: Store the new reservation ID in a variable

### Test 6.2: Cancel the Reservation
- **Request**: `POST {{base_url}}/reservations/<ID from previous step>/cancel`
- **Headers**: `Authorization: Bearer {{token1}}`
- **Expected Response**: Updated reservation with status "cancelled"

## Test 7: Concurrent Bookings

This test is difficult to perform manually in Postman, but you can:

1. Create a Postman Collection Runner with multiple iterations of the same request
2. Or use the automated test in `functionalTests.js`

## Test 8: Cleanup of Expired Reservations

This is best tested with the automated `cleanupTest.js` script, but you can manually:

1. Create a reservation with a start time in the past
2. Wait for 1-2 minutes for the cleanup job to run
3. Check if the reservation status is automatically updated to "cancelled"

## Verifying Results

After running these tests, verify that:

1. All reservations have the correct statuses (active, pending, completed, cancelled)
2. Availability counts are consistent with the number of active and pending reservations
3. Time handling is correct (IST) throughout the system
4. The system prevents overbooking (should reject reservations that exceed capacity)
5. Fee calculations are correct based on the rates defined in the parking lot 