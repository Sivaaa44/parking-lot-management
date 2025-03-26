let io;

function initSocket(socketIo) {
  io = socketIo;
}

function broadcast(lotId, message) {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  io.to(`lot_${lotId}`).emit('availabilityUpdate', message);
}

module.exports = {
  initSocket,
  broadcast
};