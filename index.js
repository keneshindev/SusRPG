const { createServer } = require("http");
const { Server } = require("ws");
const { createMap } = require("./createMap");
const chalk = require("chalk");
const express = require("express");
const _ = require("lodash")
const config = require("./config.json")

const app = express()
const server = createServer(app)
const ws = new Server({ server, path: "/ws" });

const y = 8;
const x = 15;
const map = createMap({ x, y });
const cleanMap = createMap({ x, y })

app.use(express.static("public"));

app.get("/game", (_, res) => res.sendFile("./index.html", { root: __dirname }))
app.get("/api/config", (_, res) => res.sendFile("./config.json", { root: __dirname }));


ws.connections = [];
ws.on("connection", (socket, request) => {
    ws.connections.push(socket);
    socket.send(JSON.stringify({
        module: "game",
        action: "map",
        return: cleanMap
    }))
    socket.on("message", (data) => {
        data = JSON.parse(data);
        if (data.module == "chat") {
            if (data.action == "message") ws.connections.forEach((connection) => connection.send(JSON.stringify(data)));
        };
        if (data.module == "player") {
            if (data.action == "join") {
                if (!data.return.nickname || !data.return.color) return socket.close(4005);
                if (ws.connections.find((connection) => connection.player && connection.player.nickname == data.return.nickname)) return socket.close(4006);
                if (ws.connections.length == config.max_players) return socket.close(4004);

                console.log(`[GAME] Player ${chalk.hex(data.return.color)(data.return.nickname)} connected`);

                socket.player = data.return;
                ws.connections.filter(connection => connection != socket).forEach(connection => {
                    connection.send(JSON.stringify({
                        module: "game",
                        action: "new_player",
                        return: data.return
                    }));
                });
                socket.send(JSON.stringify({
                    module: "game",
                    action: "players_list",
                    return: ws.connections.filter(connection => connection.player.nickname != socket.player.nickname).map(connection => connection.player)
                }));
            };

            if (data.action == "my_position") {
                if (map[data.return - 1] == "player") return socket.close(4007);
                map[data.return - 1] = "player";
                if (socket.player) {
                    socket.player.pos = data.return;
                    ws.connections.filter(connection => connection != socket).forEach(connection => {
                        connection.send(JSON.stringify({
                            module: "game",
                            action: "new_player_position",
                            return: socket.player
                        }))
                    })
                }
            }
            if (data.action == "move") {
                console.log(`[GAME] Player ${chalk.hex(socket.player.color)(socket.player.nickname)} moved from ${data.return.oldPos} to ${data.return.newPos}`);
                socket.player.pos = data.return.newPos;
                ws.connections.filter(connection => connection != socket).forEach(connection => {
                    connection.send(JSON.stringify({
                        module: "player",
                        action: "move",
                        return: data.return
                    }));
                });
            };
        };
    });
    socket.on('close', () => {
        console.log(`[GAME] Player ${chalk.hex(socket.player?.color ?? "#ffffff")(socket.player?.nickname ?? "Someone")} disconnected`);
        delete ws.connections[ws.connections.indexOf(socket)];
        ws.connections = _.compact(ws.connections);
        if (socket.player) map[socket.player.pos - 1] = "air";

        ws.connections.forEach(connection => {
            connection.send(JSON.stringify({
                module: "player",
                action: "leave",
                return: socket.player
            }));
        });
    });
});

server.listen(8080, () => {
    console.log("[HTTP] Listening on port 8080")
});
