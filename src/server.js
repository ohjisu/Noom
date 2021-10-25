import http from "http";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname+"/public"));
app.get("/", (_,res)=> res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true
    }
});
instrument(wsServer, {
    auth: false
});

wsServer.on("connection", (socket)=> {
    socket.on("join_room", (roomName, done)=> {
       socket.join(roomName);
       done();
       socket.to(roomName).emit("welcome");
    });
});

const handleListen = () => console.log(`listening on http://localhost:5000`);

httpServer.listen(5000, handleListen);

// Adapter : 다른 서버들 사이에서 실시간으로 어플리케이션을 동기화. 서버의 메모리에서 Adapter를 사용.
// 누가 접속중인지, room 개수, 등을 알려줌