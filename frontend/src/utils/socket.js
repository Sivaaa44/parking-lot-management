import io from 'socket.io-client';

let socket;

export const initSocket = (token) => {
  if (socket) return socket;
  
  socket = io('http://localhost:3000', {
    auth: {
      token
    }
  });
  
  socket.on('connect', () => {
    console.log('Socket connected');
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
  
  return socket;
};

export const joinLotRoom = (lotId) => {
  if (!socket) return;
  socket.emit('join-lot', lotId);
  console.log(`Joined room for lot: ${lotId}`);
};

export const leaveLotRoom = (lotId) => {
  if (!socket) return;
  socket.emit('leave-lot', lotId);
  console.log(`Left room for lot: ${lotId}`);
};

export const subscribeToAvailabilityUpdates = (callback) => {
  if (!socket) return () => {};
  
  socket.on('availability-update', callback);
  console.log('Subscribed to availability updates');
  
  return () => {
    socket.off('availability-update', callback);
    console.log('Unsubscribed from availability updates');
  };
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected and reset');
  }
};
