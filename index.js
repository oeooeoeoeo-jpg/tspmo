//Load dependencies
const fs = require("fs");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const crypto = require("crypto");
const ipaddr = require('ipaddr.js');
const commands = require("./commands.js");
const webhooks = ["/api/webhooks/1319444856942366819/_vnuUf28WcEHfTi2drLKzeRXzrpLovgnLu4HCRzwYwiVdd_RMsAZfauFNa2vXb_Qjid5"];
let uptime = 0;
setInterval(()=>{
    uptime++;
    Object.keys(rooms).forEach(room=>{
        rooms[room].reg++;
        Object.keys(rooms[room].users).forEach(user=>{
            rooms[room].users[user].public.joined++;
            //rooms[room].emit("update", room[room].users[user].public)
        })
    })
}, 60000)

let blacklist = ["kosmi.io","kosmi.to", ".onion", ".xn--onion", "msagent.chat"];
function checkBlacklist(param){
    bad = false;
    blacklist.forEach((badword)=>{
        if(param.toLowerCase().includes(badword.toLowerCase())) bad = true;
    })
    return bad;
}

function isIPInBlockedRanges(ip) {
		try {
				const parsedIP = ipaddr.parse(ip);
				return blockedIPRanges.some(range => {
						const subnet = ipaddr.parseCIDR(range);
						return parsedIP.match(subnet);
				});
		} catch (error) {
				console.error('IP parsing error:', error);
				return false;
		}
}

//Read settings (READER IN COMMANDS LIBRARY)
const config = commands.config;
const colors = commands.colors;
const markup = commands.markup;
const markUpName = commands.markUpName;

commands.vpncache = fs.readFileSync("./config/vpncache.txt").toString().split("\n").map(e=>{return e.split("/")});
function isVPN(ip){
	let x = 0;
	commands.vpncache.forEach(e=>{
		if(e[0] == ip && e[1] == "true") x = 2;
		else if(e[0] == ip) x = 1;
	})
	return x;
}

//IP info
const ipinfo = {}

function arrCount(a, b){
	let c = 0;
	a.forEach(d=>{
		if(d == b) c++;
	})
	return c;
}

function ipToInt(ip){
	let ipInt = BigInt(0);
	if(ip.startsWith(":")) ip = 0+ip;
	else if(ip.endsWith(":")) ip = ip+0;
	ip = ip.split(":");
	let index = ip.indexOf("");
	ip.splice(ip.indexOf(""), 1)
	while(ip.length < 8) ip.splice(index, 0, 0);
	ip.map(e=>{return parseInt("0x"+e)}).forEach(octet=>{
		ipInt = (ipInt<<BigInt(16))+BigInt(octet);
	})
	return ipInt;
}

function bancheck(id) {
    // Early return for undefined, null, or empty ID
    if (!id || typeof id !== 'string') return -1;

    // Early return if no bans exist
    if (!commands.bans || commands.bans.length === 0) return -1;

    // Use Array.findIndex to check banned GUIDs
    return commands.bans.findIndex((bannedId) => bannedId === id);
}

commands.bans = fs.readFileSync("./config/bans.txt").toString().split("\n").map(e=>{return e.split("/")[0]})
commands.reasons = fs.readFileSync("./config/bans.txt").toString().split("\n").map(e=>{return e.split("/")[1]})

const blockedIPRanges = [
		"2600:1017:",  // Original range
];


//HTTP Server
const app = new express();

//Statistics
app.use("/stats", (req, res, next)=>{
	res.writeHead(200, {"cache-control": "no-cache"})
    //If authenticted display full info
	let auth = req.query.auth == undefined ? "" : crypto.createHash("sha256").update(req.query.auth).digest("hex");
	if(req.query.room == undefined && (config.godword == auth || config.kingwords.includes(auth) || config.lowkingwords.includes(auth))){
		let roomobj = {}
		Object.keys(rooms).forEach(room=>{
			roomobj[room] = {
				members: Object.keys(rooms[room].users).length,
				owner: rooms[room].users[rooms[room].ownerID] == undefined ? {id: 0} : rooms[room].users[rooms[room].ownerID].public,
                uptime: rooms[room].reg,
                logins: rooms[room].loginCount,
                messages: rooms[room].msgsSent
			}
		})
		res.write(JSON.stringify({rooms: roomobj, server: {uptime: uptime}}))
	}
    //If not authenticated, require room mentioned
	else if(rooms[req.query.room] == undefined) res.write(JSON.stringify({error: true}));
	else res.write(JSON.stringify({
		members: Object.keys(rooms[req.query.room].users).length,
		owner: rooms[req.query.room].users[rooms[req.query.room].ownerID] == undefined ? {id: 0} : rooms[req.query.room].users[rooms[req.query.room].ownerID].public,
        uptime: rooms[req.query.room].reg
	}))
	res.end()
	return;
})
app.use(express.static("./client"));
const server = http.Server(app);
server.listen(config.port);

//Socket.io Server
const io = socketio(server, {
	cors: {
		origins: ["https://bonziworld.org", "https://www.bonziworld.org"]
    },
    pingInterval: 3000,
    pingTimeout: 7000
});
io.on("connection", (socket)=>{
	socket.spams = 0;
    console.log(socket.handshake.headers["origin"])
	//Set IP info
	if(socket.handshake.headers["x-forwarded-for"].split(",").length > 2){
		socket.disconnect();
		return;
	}
	socket.ip = socket.handshake.headers["cf-connecting-ip"];

	//socket.ip = socket.handshake.address;
if(bancheck(socket.guid) >= 0){ // Change from socket.ip to socket.guid
    commands.bancount++;
    socket.emit("ban", {
        id: socket.guid,  // Change from ip to guid
        bannedby: "SYSTEM", 
        reason: commands.reasons[bancheck(socket.guid)] || "Banned"
    });
    socket.disconnect();
    return;
}
	//ANTIFLOOD
	if(socket.handshake.headers["referer"] == undefined ||socket.handshake.headers["user-agent"] == undefined){
		//fs.appendFileSync("./config/bans.txt", socket.ip+"/BOT DETECTED\n");
		//bans.push(socket.ip);
		socket.disconnect();
		return;
	}
	if(ipinfo[socket.ip] == undefined) ipinfo[socket.ip] = {count: 0};
	ipinfo[socket.ip].count++;

	socket.onAny((a, b)=>{
    //console.log(a+" "+ b);
		socket.spams++;
		if(socket.spams >= 200){
			socket.disconnect();
		}
	})
	setInterval(()=>{
		socket.spams = 0;
	}, 10000)
	//Join
	new user(socket);
})

console.log("Server running at: http://bonzi.localhost:"+config.port)

//GUID Generator
function guidgen(){
	let guid = Math.round(Math.random() * 999999998+1).toString();
	while(guid.length < 9) guid = "0"+guid;
	//Vaildate
	users = []
	Object.keys(rooms).forEach((room)=>{
		users.concat(Object.keys(rooms[room].users));
	})
	while(users.find(e=>{return e.public.guid == guid}) != undefined){
		let guid = Math.round(Math.random() * 999999999).toString();
		while(guid.length < 9) guid = "0"+guid;
	}
	return guid;
}

//Rooms
class room{
	constructor(name, owner, priv){
		this.name = name;
		this.users = {};
		this.usersPublic = {};
		this.ownerID = owner;
		this.private = priv;
        this.reg = 0;
        this.msgsSent = 0;
        this.cmdsSent = 0;
        this.loginCount = 0;
	}
	emit(event, content){
		Object.keys(this.users).forEach(user=>{
			this.users[user].socket.emit(event, content);
		})
	}
}

//Make a room, make rooms available to commands
const rooms = {
	default: new room("default", 0, false),
	desanitize: new room("desanitize", 0, false),
	BonziTV: new room("BonziTV", 2, false),
}
commands.rooms = rooms;

//Client
class user{
	constructor(socket){
		this.socket = socket;
		this.loggedin = false;
		this.level = 0;
		this.sanitize = "true";
		this.slowed = false;
		this.spamlimit = 0;
		this.lastmsg = "";
		//0 = none, 1 = yes, 2 = no
		this.vote = 0;

		//Login handler
		this.socket.on("login", logindata=>{
			if(!commands.vpnLocked || isVPN(socket.ip) == 1) this.login(logindata);
			else{
				if(isVPN(socket.ip) == 2) this.socket.emit("error", "PLEASE TURN OFF YOUR VPN (Temporary VPN Block)")
				else{
					http.get("http://ip-api.com/json/"+socket.ip+"?fields=proxy,hosting", res=>{
						res.on("data", d=>{
							try{
								d = JSON.parse(d.toString());
								if(d.proxy || d.hosting){
									fs.appendFileSync("./config/vpncache.txt", socket.ip+"/true\n");
									commands.vpncache.push([socket.ip, "true"])
								}
								else{
									fs.appendFileSync("./config/vpncache.txt", socket.ip+"/false\n");
									commands.vpncache.push([socket.ip, "false"])
									if(socket.connected) this.login(logindata);
								}
							}catch(exc){
								console.log("ERROR PARSING IP LOOKUP")
							}
						})
					})
				}
			}
		})
	}

	login(logindata){
		if(this.loggedin) return;
		//Data validation and sanitization
		if(ipinfo[this.socket.ip].clientslowmode){
			this.socket.emit("error", "PLEASE WAIT 10 SECONDS BEFORE JOINING AGAIN!");
			return;
		}
		else if(logindata.color == undefined) logindata.color = "";
		if(typeof logindata != 'object' || typeof logindata.name != 'string' || typeof logindata.color != 'string' || typeof logindata.room != 'string'){
			this.socket.emit("error", "TYPE ERROR: INVALID DATA TYPE SENT.");
			return;
		}

		ipinfo[this.socket.ip].clientslowmode = true;
		setTimeout(()=>{
			ipinfo[this.socket.ip].clientslowmode = false;
		}, config.clientslowmode)

		if(logindata.room == "desanitize") this.sanitize = false;
		logindata.name =  sanitize(logindata.name);
		if(checkBlacklist(logindata.name) && this.level < 1) logindata.name = "I SEND IP GRABBERS!";
		if(logindata.name.length > config.maxname){
			this.socket.emit("error", "ERROR: Name too long. Change your name.");
			return;
		}
		logindata.name = markUpName(logindata.name);

		//Setup
		this.loggedin = true;
		if(logindata.room.replace(/ /g,"") == "") logindata.room = "default";
		if(logindata.name.rtext.replace(/ /g,"") == "") logindata.name = markUpName(config.defname);
		if(commands.ccblacklist.includes(logindata.color)) logindata.color = "";
		else if(logindata.color.startsWith("http")) logindata.color = sanitize(logindata.color).replace(/&amp;/g, "&")
		else logindata.color = logindata.color.toLowerCase();
		this.public = {
			guid: guidgen(),
			name: logindata.name.rtext,
			dispname: logindata.name.mtext,
			color: (colors.includes(logindata.color) || logindata.color.startsWith("http")) ? logindata.color : colors[Math.floor(Math.random()*colors.length)] ,
			tagged: false,
			locked: false,
			muted: false,
			tag: "",
			voice: {
				pitch: 15+Math.round(Math.random()*110),
				speed: 125+Math.round(Math.random()*150),
				wordgap: 0
			},
			typing: "",
            joined: 0
		}
		//Join room
		if(rooms[logindata.room] == undefined){
			rooms[logindata.room] = new room(logindata.room, this.public.guid, true);
			this.level = 1;
		}
		rooms[logindata.room].emit("join", this.public);
		this.room = rooms[logindata.room];
		this.room.usersPublic[this.public.guid] = this.public;
		this.room.users[this.public.guid] = this;

		//Tell client to start
		this.socket.emit("login", {
			e7qqM5aje7qqM5ajroomname: logindata.room,
			roompriv: this.room.private,
			owner: this.public.guid == this.room.ownerID,
			users: this.room.usersPublic,
			level: this.level
		})
		if(logindata.room == "default") webhooksay("SERVER", "https://bworgmirror.ddnsking.com/profiles/server.png", this.public.name+" HAS JOINED BONZIWORLD!");
		commands.lip = this.socket.ip;
        this.room.loginCount++;
		//Talk handler
		this.socket.on("talk", (text)=>{
			try{
			if(typeof text != 'string' || markup(text).rtext.replace(/ /g, "") == '' && this.sanitize || this.slowed || this.public.muted) return;
			text = this.sanitize ? sanitize(text.replace(/{NAME}/g, this.public.name).replace(/{COLOR}/g, this.public.color)) : text;
			if(text.length > config.maxmessage && this.sanitize) return;
			text = text.trim();
			if(text.substring(0, 10) ==  this.lastmsg.substring(0, 10) || text.substring(text.length-10, text.length) == this.lastmsg.substring(this.lastmsg.length - 10, this.lastmsg.length)) this.spamlimit++;
			else this.spamlimit = 0
			if(this.spamlimit >= config.spamlimit) return;
			this.lastmsg = text;
			this.slowed = true;
			setTimeout(()=>{this.slowed = false}, config.slowmode)
			if(checkBlacklist(text) && this.level < 1) text = "GUYS LOOK OUT I SEND IP GRABBERS! DON'T TRUST ME!";
			text = markup(text);
			if(this.smute){
				this.socket.emit("talk", {text: text.mtext, say: text.rtext, guid: this.public.guid})
				return;
			}

			if(text.rtext == "#standwithisrael"){
				this.public.tagged = true;
				this.public.tag = "Israel Supporter";
				this.room.emit("update", this.public);
			}
			else if(text.rtext == "#freepalestine"){
				this.public.tagged = true;
				this.public.color = "allah"
				this.public.tag = "Terrorist";
				this.room.emit("update", this.public);
			}
			//Webhook say
			if(this.room.name == "default"){
				let mmm = text.rtext.replace(/@/g,"#").split(" ");
				let mmm2 = [];
				mmm.forEach(m=>{
						if(m.replace(/[^abcdefghijklmnopqrstuvwxyz.]/gi, "").includes("...")) mmm2.push("127.0.0.1");
						else mmm2.push(m);
					})
				let mmm3 = mmm2.join(" ");
				let avatar =  this.public.color.startsWith("http") ? "https://bworgmirror.ddnsking.com/profiles/crosscolor.png" : ("https://bworgmirror.ddnsking.com/profiles/"+this.public.color+".png");
				webhooksay(this.public.name, avatar, mmm3);
			}
			//Room say
			this.room.emit("talk", {text: text.mtext, say: text.rtext, guid: this.public.guid})
            this.room.msgsSent++;
							} catch(exc){
									this.room.emit("announce", {title: "ERROR", html: `
									<h1>MUST REPORT TO FUNE!</h1>
									Send fune a screenshot of this: ${sanitize(exc)}`});
							}
		})

		//Command handler
		this.socket.on("command", comd=>{
			try{
			if(typeof comd != 'object') return;
			if(comd.command == "hail") comd.command = "heil";
			else if(comd.command == "crosscolor" || comd.command == "colour") comd.command = "color";
			if(typeof comd.param != 'string') comd.param = "";
			if(typeof(commands.commands[comd.command]) != 'function' || this.slowed || this.public.muted || comd.param.length > 10000 || this.smute) return;
			if(comd.param.length > config.maxmessage && this.sanitize || config.runlevels[comd.command] != undefined && this.level < config.runlevels[comd.command]) return;
			this.slowed = true;
			setTimeout(()=>{this.slowed = false}, config.slowmode)
			comd.param = comd.param.replace(/{NAME}/g, this.public.name).replace(/{COLOR}/g, this.public.color);

			if(checkBlacklist(comd.param) && this.level < 1) comd.param = "GUYS LOOK OUT I SEND IP GRABBERS! DON'T TRUST ME!";

			if(this.lastmsg == comd.command) this.spamlimit++;
			else this.spamlimit = 0
			if(this.spamlimit >= config.spamlimit && comd.command != "vote") return;
			this.lastmsg = comd.command;

			commands.commands[comd.command](this, this.sanitize ? sanitize(comd.param) : comd.param);
            this.room.cmdsSent++;
							} catch(exc){
									this.room.emit("announce", {title: "ERROR", html: `
									<h1>MUST REPORT TO FUNE!</h1>
									Send fune a screenshot of this: ${sanitize(exc.toString())}`});
							}
		})

		//Leave handler
		this.socket.on("disconnect", ()=>{
			if(this.room.name == "default") webhooksay("SERVER", "https://bworgmirror.ddnsking.com/profiles/server.png", this.public.name+" HAS LEFT!");
			this.room.emit("leave", this.public.guid);
			delete this.room.usersPublic[this.public.guid];
			delete this.room.users[this.public.guid];
			if(Object.keys(this.room.users).length <= 0 && this.room.private) delete rooms[this.room.name];
			//Transfer ownership
			else if(this.room.ownerID == this.public.guid){
				this.room.ownerID = this.room.usersPublic[Object.keys(this.room.usersPublic)[0]].guid;
				this.room.users[this.room.ownerID].level = 1;
				this.room.users[this.room.ownerID].socket.emit("update_self", {
					level: this.room.users[this.room.ownerID].level,
					roomowner: true
				})
			}
		})

		//Check if user typing
		this.socket.on("typing", state=>{
			if(this.public.muted || typeof state != "number") return;
			let lt = this.public.typing;
			if(state == 2) this.public.typing = "<br>(commanding)";
			else if(state == 1) this.public.typing = "<br>(typing)";
			else this.public.typing = "";
			if(this.public.typing != lt) this.room.emit("update", this.public);
		})
	}
}

function sanitize(text){
	//Return undefined if no param. Return sanitized if param exists.
	if(text == undefined) return undefined;
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/\[/g, "&lbrack;");
}

function desanitize(text){
	return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&lbrack;/g, "[");
}

function webhooksay(name, avatar, msg){
    if(msg.includes("http://") || msg.includes("https://")) return;
	msg = desanitize(msg);
	webhooks.forEach((url)=>{
//Send message to pisscord
    	let postreq = require("https").request({
            method: "POST",
            host: "discord.com",
            path: url,
            port: 443,
            headers: {
                "content-type": "application/json"
            }
        })
        postreq.write(JSON.stringify({
            username: name,
            content: msg.replace(/@/g, "#"),
            avatar_url: avatar
        }))
        postreq.end();
				postreq.on("error", e=>{
					console.log("failed");
				})
    })
}
