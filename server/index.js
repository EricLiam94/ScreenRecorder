const app = require("express")();
const path = require("path");
const server = require("http").Server(app);
const io = require("socket.io")(server);

var port = process.env.PORT || 4000;

server.listen(port, () => {
  console.log(`port ${port} is listening`);
});
// WARNING: app.listen(80) will NOT work here!

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

io.on("connection", function(socket) {
  socket.emit("welcome", { hello: "world" });
  socket.on("my other event", function(data) {
    console.log(data);
  });
  socket.on("stream", data => {
    socket.broadcast.emit("broadcast", data);
  });
});
