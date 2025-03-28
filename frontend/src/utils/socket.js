import { io } from 'socket.io-client';

let socket = null;
let currentToken = null;

export const initSocket = (token) => {
  // If token has changed or socket doesn't exist, create a new connection
  if (!socket || currentToken !== token) {
    // Close existing socket if it exists
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    
    currentToken = token;
    
    if (token) {
      socket = io({
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      socket.on('connect', () => {
        console.log('Socket connected with token for user ID:', getUserIdFromToken(token));
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        // If auth error, reset the socket
        if (error.message === 'Authentication error') {
          console.log('Auth error, resetting socket');
          socket = null;
          currentToken = null;
        }
      });
    }
  }
  return socket;
};

// Helper to extract user ID from JWT token (simplified)
function getUserIdFromToken(token) {
  try {
    // Most JWT tokens are in format: header.payload.signature
    // We need the payload part
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.id || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

export const subscribeToAvailabilityUpdates = (callback) => {
  if (!socket) {
    console.warn('Socket not initialized');
    return () => {};
  }

  // Remove any existing listeners to prevent duplicates
  socket.off('availabilityUpdate');
  
  // Add new listener
  socket.on('availabilityUpdate', callback);
  console.log('Subscribed to availability updates');

  return () => {
    if (socket) {
      socket.off('availabilityUpdate', callback);
      console.log('Unsubscribed from availability updates');
    }
  };
};

export const joinLotRoom = (lotId) => {
  if (socket && socket.connected) {
    socket.emit('joinLot', lotId);
    console.log(`Joined lot room: ${lotId}`);
  } else {
    console.warn('Cannot join lot room: Socket not connected');
  }
};

export const leaveLotRoom = (lotId) => {
  if (socket && socket.connected) {
    socket.emit('leaveLot', lotId);
    console.log(`Left lot room: ${lotId}`);
  }
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
    console.log('Socket closed and reset');
  }
};