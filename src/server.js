import http from "http";
import SocketIO from "socket.io";

import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname+"/public"));
app.get("/", (_,res)=> res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", (socket)=> {
    socket.onAny((event)=> {
        console.log(`Socket Event:${event}`);
    })
    socket.on("enter_room", (roomName, done)=> {
        socket.join(roomName);
        done();
        socket.to(roomName).emit("welcome");
    })
})

const handleListen = () => console.log(`listening on http://localhost:5000`);

httpServer.listen(5000, handleListen);