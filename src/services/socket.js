import io from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  if (socket) return socket;
  
  // Get the backend URL by replacing frontend port with backend port
  const backendURL = window.location.hostname === 'localhost' 
    ? `http://localhost:5000`
    : window.location.origin.replace(':3000', ':5000').replace(':3001', ':5000');
  
  console.log('🔌 Initializing Socket.io connection to:', backendURL);
  
  socket = io(backendURL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
    path: '/socket.io/'
  });

  socket.on('connect', () => {
    console.log('✅ Socket.io connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket.io disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('⚠️ Socket.io connection error:', error);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    initSocket();
  }
  return socket;
};

export const joinManagerRoom = () => {
  const sock = getSocket();
  if (sock && sock.connected) {
    sock.emit('join-manager');
    console.log('👨‍💼 Joined manager room');
  }
};

export const joinKitchenRoom = () => {
  const sock = getSocket();
  if (sock && sock.connected) {
    sock.emit('join-kitchen');
    console.log('👨‍🍳 Joined kitchen room');
  }
};

export const onNewOrder = (callback) => {
  const sock = getSocket();
  sock.on('new-order', callback);
};

export const offNewOrder = (callback) => {
  const sock = getSocket();
  sock.off('new-order', callback);
};

export const onOrderUpdate = (callback) => {
  const sock = getSocket();
  sock.on('order-update', callback);
};

export const offOrderUpdate = (callback) => {
  const sock = getSocket();
  sock.off('order-update', callback);
};

export const onOrderApproved = (callback) => {
  const sock = getSocket();
  sock.on('order-approved', callback);
};

export const offOrderApproved = (callback) => {
  const sock = getSocket();
  sock.off('order-approved', callback);
};

export const onOrderRejected = (callback) => {
  const sock = getSocket();
  sock.on('order-rejected', callback);
};

export const offOrderRejected = (callback) => {
  const sock = getSocket();
  sock.off('order-rejected', callback);
};

export const onNewFeedback = (callback) => {
  const sock = getSocket();
  sock.on('new-feedback', callback);
};

export const offNewFeedback = (callback) => {
  const sock = getSocket();
  sock.off('new-feedback', callback);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
