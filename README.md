# Park Smart - Parking Management System

A real-time parking management system that allows users to find, reserve, and pay for parking spots.

## Features

- Real-time parking availability information
- Parking spot reservation system
- Dynamic fee calculation based on usage time
- User authentication and reservation management
- Real-time updates using Socket.IO

## Prerequisites

- Node.js (v14+ recommended)
- MongoDB (local instance or MongoDB Atlas)

## Installation

1. Clone the repository:
```
git clone <repository-url>
cd <repository-folder>
```

2. Install backend dependencies:
```
cd backend
npm install
```

3. Set up environment variables:
   Create a `.env` file in the backend directory with the following variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/parking-lot-management
JWT_SECRET=your_secret_key
```

## Database Setup

1. Start your MongoDB server.

2. Seed the database with initial data:
```
cd backend
npm run seed
```

This will create:
- 5 parking lots around Chennai with 2 car spots and 2 bike spots each
- A demo user (Email: user@example.com, Password: password123)

## Running the Application

1. Start the backend server:
```
cd backend
npm run dev
```

The server will run on http://localhost:3000 by default.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get a token
- `GET /api/auth/me` - Get current user info

### Parking Lots
- `GET /api/parking-lots/nearby` - Find nearby parking lots (params: lat, lng, radius)
- `GET /api/parking-lots/:id` - Get details for a specific parking lot

### Reservations
- `POST /api/reservations` - Create a new reservation
- `PUT /api/reservations/:id/start` - Start a reservation (mark as active)
- `PUT /api/reservations/:id/end` - End a reservation and calculate fee
- `GET /api/reservations` - Get user's reservations
- `DELETE /api/reservations/:id` - Cancel a reservation

## Real-time Updates

The system uses Socket.IO for real-time updates of parking lot availability:

1. Connect to the Socket.IO server
2. Join a room for a specific parking lot: `socket.emit('joinLot', parkingLotId)`
3. Listen for availability updates: `socket.on('availabilityUpdate', (data) => {...})` 