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

function publicRooms() {
    const {
        sockets: {
            adapter: {sids, rooms}
        }
    } = wsServer;

    const publicRooms = [];
    rooms.forEach((_, key)=> {
        if ( sids.get(key) === undefined ) publicRooms.push(key)
    });
    return publicRooms;
}

function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket)=> {
    socket["nickname"] = "Anon";

    socket.onAny((event)=> {
        console.log(wsServer.sockets.adapter); // in-memory Adapter
        console.log(`Socket Event:${event}`);
    });
    socket.on("enter_room", (roomName, done)=> {
        socket.join(roomName);
        done();
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        wsServer.sockets.emit("room_change", publicRooms());
    });
    socket.on("disconnecting", ()=> {
        socket.rooms.forEach((room)=>{
            socket.to(room).emit("bye", socket.nickname, countRoom(room)-1);
        });
    });
    socket.on("disconnect", ()=> {
        wsServer.sockets.emit("room_change", publicRooms());
    })
    socket.on("new_message", (msg, room, done)=> {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    });
    socket.on("nickname", (nickname)=> {
        socket["nickname"] = nickname;
    });
})

const handleListen = () => console.log(`listening on http://localhost:5000`);

httpServer.listen(5000, handleListen);

// Adapter : 다른 서버들 사이에서 실시간으로 어플리케이션을 동기화. 서버의 메모리에서 Adapter를 사용.
// 누가 접속중인지, room 개수, 등을 알려줌