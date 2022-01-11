const game = {};
fetch("/api/config").then((response) => response.json()).then((json) => game.config = json);

const canvas = document.querySelector("#canvas");
const units = [];

const ws = new WebSocket("ws://" + window.location.host + "/ws");

const colors = ["#c9070b", "#0b2bc9", "#f6f467", "#0a802c", "#3d464a", "#d7dff2", "#ed52ba", "#38fddf"];

game.player = {
    nickname: "PlayerBruh" + Math.floor(Math.random() * 50),
    color: colors[Math.floor(Math.random() * colors.length)]
};

window.sendChat = function sendChat() {
    const text = document.querySelector("#chatField").value
    if (!Boolean(text)) return;
    ws.send(JSON.stringify({
        module: "chat",
        action: "message",
        return: {
            author: game.player,
            content: text
        }
    }))
}

ws.addEventListener("open", () => {
    ws.send(JSON.stringify({
        module: "player",
        action: "join",
        return: game.player
    }));
});

ws.addEventListener("message", (message) => {
    message = JSON.parse(message.data);
    if (message.module == "chat") {
        if (message.action == "message") {
            const chat = document.querySelector(".chat");
            const messageElement = document.createElement("div");
            const nicknameElement = document.createElement("div");
            const contentElement = document.createElement("div");

            messageElement.classList.add("message");
            nicknameElement.classList.add("nickname");
            contentElement.classList.add("content");

            nicknameElement.style.color = message.return.author.color;

            nicknameElement.innerHTML = message.return.author.nickname + ":";
            contentElement.innerHTML = message.return.content;

            messageElement.append(nicknameElement);
            messageElement.append(contentElement);
            chat.append(messageElement);
        }
    }
    if (message.module == "game") {
        if (message.action == "map") {
            message.return.forEach((type, index) => {
                index += 1;
                const unit = document.createElement("a");
                if (type == "wall") unit.classList.add("wall");
                else unit.classList.add("unit");
                unit.setAttribute("data-pos", index);
                unit.innerHTML = "#";
                canvas.append(unit);
                units.push(unit);
                if ((index % 15) == 0 && index != 0) canvas.append(document.createElement("br"));
            });
            const freeArea = units.filter(unit => unit.classList.contains("unit"));
            const player = freeArea[Math.floor(Math.random() * freeArea.length)];
            player.classList.add("player");
            player.style.color = game.player.color;
            ws.send(JSON.stringify({
                module: "player",
                action: "my_position",
                return: player.getAttribute("data-pos")
            }))
        }
        if (message.action == "players_list") {
            message.return.forEach(nplayer => {
                let freeArea = units.filter(unit => unit.classList.contains("unit")
                    && !unit.classList.contains("player")
                    && !unit.classList.contains("otherPlayer"))
                const unit = freeArea.find(a => a.getAttribute("data-pos") == nplayer.pos)
                unit.classList.add("otherPlayer")
                unit.setAttribute("data-nickname", nplayer.nickname)
                unit.style.color = nplayer.color
                console.log("Player connected: " + nplayer.nickname)
            })
        }
        if (message.action == "new_player_position") {
            const player = message.return
            const freeArea = units.filter(unit => unit.classList.contains("unit")
                && !unit.classList.contains("player")
                && !unit.classList.contains("otherPlayer"))
            const unit = freeArea.find(a => a.getAttribute("data-pos") == player.pos)
            unit.classList.add("otherPlayer")
            unit.setAttribute("data-nickname", player.nickname)
            unit.style.color = player.color
            console.log("Player connected: " + player.nickname)
        }
    }
    if (message.module == "player") {
        if (message.action == "move") {
            const player = units.find(a => a.getAttribute("data-pos") == message.return.oldPos)
            const nextUnit = units.find(a => a.getAttribute("data-pos") == message.return.newPos)
            player.classList.remove("otherPlayer")
            nextUnit.style.color = player.style.color
            player.style.color = "white"
            nextUnit.classList.add("otherPlayer");
        }
        if (message.action == "leave" && message.result) {
            const player = units.find(unit => unit.getAttribute("data-nickname") == message.return.nickname)
            player.classList.remove("otherPlayer");
            player.style.color = "white";
        }
    }
});
document.onkeydown = ({ key }) => {
    const div = document.querySelector(`div[data-key=${key}]`);
    if (div) div.classList.add("down");
    if (key == "a") {
        const player = units.find((unit) => unit.classList.contains("player"));
        let index = units.indexOf(player) - 1;
        const nextUnit = units[index];
        if (!nextUnit || nextUnit.classList.contains("wall") || nextUnit.classList.contains("otherPlayer")) return;
        player.classList.remove("player")
        nextUnit.style.color = player.style.color
        player.style.color = "white"
        nextUnit.classList.add("player");
        ws.send(JSON.stringify({
            module: "player",
            action: "move",
            return: {
                oldPos: player.getAttribute("data-pos"),
                newPos: nextUnit.getAttribute("data-pos")
            }
        }))
    }
    if (key == "d") {
        const player = units.find((unit) => unit.classList.contains("player"));
        let index = units.indexOf(player) + 1;
        const nextUnit = units[index];
        if (!nextUnit || nextUnit.classList.contains("wall") || nextUnit.classList.contains("otherPlayer")) return;
        player.classList.remove("player")
        nextUnit.style.color = player.style.color
        player.style.color = "white"
        nextUnit.classList.add("player");
        ws.send(JSON.stringify({
            module: "player",
            action: "move",
            return: {
                oldPos: player.getAttribute("data-pos"),
                newPos: nextUnit.getAttribute("data-pos")
            }
        }))
    }
    if (key == "s") {
        const player = units.find((unit) => unit.classList.contains("player"));
        let index = units.indexOf(player) + 15;
        if (index > units.length) index = units.indexOf(player) - (((units.length / 15) - 1) * 15);
        const nextUnit = units[index];
        if (!nextUnit || nextUnit.classList.contains("otherPlayer")) return;
        player.classList.remove("player")
        nextUnit.style.color = player.style.color
        player.style.color = "white"
        nextUnit.classList.add("player");
        ws.send(JSON.stringify({
            module: "player",
            action: "move",
            return: {
                oldPos: player.getAttribute("data-pos"),
                newPos: nextUnit.getAttribute("data-pos")
            }
        }))
    }
    if (key == "w") {
        const player = units.find((unit) => unit.classList.contains("player"));
        let index = units.indexOf(player) - 15;
        if (index < 0) index = units.indexOf(player) + (((units.length / 15) - 1) * 15);;
        const nextUnit = units[index];
        if (!nextUnit || nextUnit.classList.contains("otherPlayer")) return;
        player.classList.remove("player")
        nextUnit.style.color = player.style.color
        player.style.color = "white"
        nextUnit.classList.add("player");
        ws.send(JSON.stringify({
            module: "player",
            action: "move",
            return: {
                oldPos: player.getAttribute("data-pos"),
                newPos: nextUnit.getAttribute("data-pos")
            }
        }))
    }
}
document.onkeyup = ({ key }) => {
    const div = [...document.querySelectorAll(`div[data-key=${key}]`)];
    if (div.length > 0) {
        div.forEach((x) => x.classList.remove("down"));
    }
}