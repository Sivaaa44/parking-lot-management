import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (!socket) {
    socket = io({
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }
  return socket;
};

export const subscribeToAvailabilityUpdates = (callback) => {
  if (!socket) {
    console.warn('Socket not initialized');
    return () => {};
  }

  socket.on('availability_update', callback);
  console.log('Subscribed to availability updates');

  return () => {
    if (socket) {
      socket.off('availability_update', callback);
      console.log('Unsubscribed from availability updates');
    }
  };
};

export const joinLotRoom = (lotId) => {
  if (socket) {
    socket.emit('join_lot', lotId);
  }
};

export const leaveLotRoom = (lotId) => {
  if (socket) {
    socket.emit('leave_lot', lotId);
  }
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};