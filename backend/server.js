const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const socketUtil = require('./utils/socketUtil');
const { setupCleanupInterval } = require('./middlewares/reservationCleanup');
const { getCurrentISTTime, formatISTDate } = require('./utils/timeUtil');
const jwt = require('jsonwebtoken');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev; restrict in production
    methods: ['GET', 'POST'],
  },
});

// Initialize socket utility
socketUtil.initSocket(io);

// Socket.IO setup with authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    // Verify the token and store user ID in the socket
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.join(`user_${decoded.id}`); // Join a room specific to this user
    next();
  } catch (error) {
    return next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'User ID:', socket.userId);

  // Join a room based on parking lot ID (e.g., "lot_123")
  socket.on('joinLot', (lotId) => {
    socket.join(`lot_${lotId}`);
    console.log(`Client ${socket.id} (User: ${socket.userId}) joined lot_${lotId}`);
  });
  
  socket.on('leaveLot', (lotId) => {
    socket.leave(`lot_${lotId}`);
    console.log(`Client ${socket.id} (User: ${socket.userId}) left lot_${lotId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id, 'User ID:', socket.userId);
  });
});

// Now load routes
const authRoutes = require('./routes/authRoutes');
const parkingLotRoutes = require('./routes/parkingLotRoutes');
const reservationRoutes = require('./routes/reservationRoutes');

app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  credentials: true
}));

// Middleware
app.use(express.json());

//logging middleware
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.url} at ${formatISTDate(getCurrentISTTime())}`);
  if (Object.keys(req.body).length) {
    console.log('Request Body:', req.body);
  }

  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parking-lots', parkingLotRoutes);
app.use('/api/reservations', reservationRoutes);

console.log("Connection string:", process.env.MONGODB_URI);
// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/parking-lot-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB at', formatISTDate(getCurrentISTTime()));
  
  // Start the cleanup interval
  setupCleanupInterval(60000); // Run every minute
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} at ${formatISTDate(getCurrentISTTime())}`);
  });
}).catch(err => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});