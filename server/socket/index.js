module.exports = function (app) {
  const server = require("http").Server(app);
  const io = require("socket.io")(server, {
    cors: {
      origin: `http://127.0.0.1:5173`,
    },
  });

  const namespace = io.of(/^\/channel-\d+$/);
  namespace.on("connection", (socket) => {
    console.log(`✅ Client connected to namespace: ${socket.nsp.name}`);
  });
  app.request.socketChannel = namespace;

  return server;
};
