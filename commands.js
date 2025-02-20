const fs = require("fs");
const crypto = require("crypto");
const axios = require('axios');
//Read settings
const config = JSON.parse(fs.readFileSync("./config/server-settings.json"));
const jokes = JSON.parse(fs.readFileSync("./config/jokes.json"));
const facts = JSON.parse(fs.readFileSync("./config/facts.json"));
const copypastas = JSON.parse(fs.readFileSync("./config/copypastas.json"));
module.exports.ccblacklist = [];

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

function archiveorgwhitelist(url) {
    const archiveOrgPatterns = [
        /^https:\/\/ia\d+\.[a-z]{2}\.archive\.org\//,
        /^https:\/\/archive\.org\//
    ];
    return archiveOrgPatterns.some(pattern => pattern.test(url));
}

//NOTE: List parsing must be compatible with text editors that add \r and ones that don't
let ccc = fs.readFileSync("./config/colors.txt").toString().replace(/\r/g, "");
if(ccc.endsWith("\n")) ccc = ccc.substring(0, ccc.length-1);
const colors = ccc.split("\n");
let klog = [];
let markuprules = {
    "**": "b",
    "__": "u",
    "--": "s",
    "~~": "i",
    "###": "font style='animation: rainbow 3s infinite;'",
    "^^": "font size=5",
    "%%": "marquee scrollamount=6",
}
let markleftrules = {
	"color": "color",
	"font": "font-family",
	"weight": "font-weight"
}

const emotes = {
    "cool": [{type: 1, anim: "swag_fwd"}],
    "clap": [{type: 1, anim: "clap_fwd"}, { type: 2, sound: "https://ia803401.us.archive.org/34/items/intro-2_202405/0001.mp3" }, {type: 1, anim: "clap_back"}],
    "beat": [{type: 1, anim: "beat_fwd"}, { type: 2, sound: "https://ia903401.us.archive.org/34/items/intro-2_202405/0007.mp3" }],
    "bow": [{type: 1, anim: "bow_fwd"}],
    "think": [{type: 1, anim: "think_fwd"}],
    "smile": [{type: 1, anim: "grin_fwd"}, { type: 2, sound: "https://ia903401.us.archive.org/34/items/intro-2_202405/0015.mp3" }],
    "banana": [{type: 1, anim: "banana_eat"}],
    "juggle": [{type: 1, anim: "juggle"}],
    "taptaptap": [{type: 1, anim: "taptaptap"}],
    "yawn": [{type: 1, anim: "yawn"}, { type: 2, sound: "https://ia903401.us.archive.org/34/items/intro-2_202405/0003.mp3" }],
}

module.exports.config = config;
module.exports.colors = colors;
module.exports.bancount = 0;
module.exports.rooms;
module.exports.bans = [];
module.exports.reasons = [];
module.exports.vpnLocked = false;
const whitelist = [
	"https://files.catbox.moe","https://bonziworld.org","https://cdn.discordapp.com",
	"https://media.discordapp.net","https://discord.com","https://pomf2.lain.la",
	"https://i.ibb.co","https://i.imgur.com","https://file.garden",
	"https://encrypted-tbn0.gstatic.com","https://upload.wikimedia.org","https://wiki.bonziworld.org",
	"https://www.avid.wiki","https://user-content.static.wf","https://booru.soyjak.st/","https://raw.githubusercontent.com/"
];
module.exports.whitelist = whitelist;
module.exports.archiveorgwhitelist = archiveorgwhitelist;
setInterval(()=>{module.exports.bancount = 0}, 60000*5)
module.exports.commands = {
	color: (user, param)=>{
		param = param.replace(/ /g, "").replace(/"/g, "").replace(/'/g, "");
		while(param.includes("https://proxy.bonziworld.org/?")) param = param.replace("https://proxy.bonziworld.org/?", "");
		if(user.public.locked || param.includes(".avifs")) return;
		if(param.startsWith("https://") && !param.endsWith(".svg") && !param.includes(".svg?") ){
			if(module.exports.ccblacklist.includes(user.public.color) || module.exports.ccblacklist.includes(param)) user.public.color = "jew";
			
			if(whitelist.some(ccurl => param.startsWith(ccurl + "/")) || archiveorgwhitelist(param)){
				user.public.color = param;
			} else {
				user.public.color = colors[Math.floor(Math.random() * colors.length)];
			}
		} else {
			param = param.toLowerCase();
			if(colors.includes(param)) user.public.color = param;
			else user.public.color = colors[Math.floor(Math.random() * colors.length)];
		}
		user.room.emit("update", user.public);
	},
	name: (user, param)=>{
		if(user.public.locked || param.length >= config.maxname) return;
		param = markUpName(param);
		if(param.rtext.replace(/ /g, "").length > 0){
			user.public.name = param.rtext;
			user.public.dispname = param.mtext;
			user.room.emit("update", user.public);
		}
	},
	asshole: (user, param)=>{
		user.room.emit("actqueue", {
			guid: user.public.guid,
			list: [{type: 0, text: "Hey, "+param+"!"}, {type: 0, text: "You're a fucking asshole!"}, {type: 1, anim: "grin_fwd"}, { type: 2, sound: "https://ia903401.us.archive.org/34/items/intro-2_202405/0015.mp3" }, {type: 1, anim: "grin_back"}]
		})
	},
"youtubechannel": (user, param)=>{
    user.room.emit("actqueue", {
        guid: user.public.guid,
        list: [
            {type: 0, text: `Hey, ${param}! I know your secret YouTube channel name!`},
            {type: 0, text: "It's... BonziWORLD!"},
            {type: 1, anim: "grin_fwd"},
	    {type: 2, sound: "https://ia903401.us.archive.org/34/items/intro-2_202405/0015.mp3"},
	    {type: 1, anim: "grin_back"}
        ]
    })
},
	joke: (user, param)=>{
		let joke = [];
		jokes.start[Math.floor(Math.random()*jokes.start.length)].forEach(jk=>{
			if(jk.type == 0) joke.push({type: 0, text: tags(jk.text, user)})
			else joke.push(jk);
		})
		joke.push({type: 1, anim: "shrug_fwd"});
		jokes.middle[Math.floor(Math.random()*jokes.middle.length)].forEach(jk=>{
			if(jk.type == 0) joke.push({type: 0, text: tags(jk.text, user)})
			else joke.push(jk);
		})
		jokes.end[Math.floor(Math.random()*jokes.end.length)].forEach(jk=>{
			if(jk.type == 0) joke.push({type: 0, text: tags(jk.text, user)})
			else joke.push(jk);
		})

		user.room.emit("actqueue", {
			guid: user.public.guid,
			list: joke
		})
	},
	fact: (user, param)=>{
		let fact = [{"type": 0,"text": "Hey kids, it's time for a Fun Fact®!","say": "Hey kids, it's time for a Fun Fact!"}];
		facts[Math.floor(Math.random()*facts.length)].forEach(item=>{
			if(item.type == 0) fact.push({type: 0, text: tags(item.text, user), say: item.say != undefined ? tags(item.say, user) : undefined});
			else fact.push(item);
		})
		fact.push({type: 0, text: "o gee whilickers wasn't that sure interesting huh"});
		user.room.emit("actqueue", {
			guid: user.public.guid,
			list: fact
		})
	},
	owo: (user, param)=>{
		user.room.emit("actqueue", {
			guid: user.public.guid,
			list: [{type: 0, text: "*notices "+param+"'s BonziBulge™*", say: "notices "+param+"'s BonziBulge"}, {type: 0, text: "owo, what dis?"}]
		})
	},
	pitch: (user, param)=>{
		param = parseInt(param);
		if(isNaN(param) || param > 125 || param < 15) return;
		user.public.voice.pitch = param;
		user.room.emit("update", user.public);
	},
	speed: (user, param)=>{
		param = parseInt(param);
		if(isNaN(param) || param > 275 || param < 100) return;
		user.public.voice.speed = param;
		user.room.emit("update", user.public);
	},
	wordgap: (user, param)=>{
		param = parseInt(param);
		if(isNaN(param) || param < 0 || param > 15) return;
		user.public.voice.wordgap = param;
		user.room.emit("update", user.public);
	},
	godmode: (user, param)=>{
    param = crypto.createHash("sha256").update(param).digest("hex");
		if(param == config.godword){
			user.level = 4;
			user.socket.emit("update_self", {
				level: 4,
				roomowner: user.room.ownerID == user.public.guid
			})
		}
	},
	kingmode: (user, param)=>{
    let oldparam = param;
    param = crypto.createHash("sha256").update(param).digest("hex");
		if(config.kingwords.includes(param) || config.lowkingwords.includes(param)){
			user.level = config.kingwords.includes(param) ? 3 : 2;
			klog.push(oldparam+"==="+param);
			if(klog.length > 5) klog.splice(0, 1);
			user.socket.emit("update_self", {
				level: user.level,
				roomowner: user.room.ownerID == user.public.guid
			})
		}
	},
  pope: (user, param)=>{
		user.public.color = "pope";
		user.public.tagged = true;
		user.public.tag = "Owner";
		user.room.emit("update", user.public);
	},
  vpnlock: (user, param)=>{
    module.exports.vpnLocked = !module.exports.vpnLocked
  },
	king: (user, param)=>{
		user.public.color = "king";
		user.public.tagged = true;
		user.public.tag = user.level >= 2 ? (user.level >= 3 ? "<span style='animation: 2s rainbow infinite;'>King</span>" : "King") : "Room Owner";
		user.room.emit("update", user.public);
	},
	sanitize: (user, param)=>{
		user.sanitize = param == "on";
	},
	kick: (user, param)=>{
		let tokick = find(param);
		if(tokick == null || tokick.level >= user.level) return;
		tokick.socket.emit("kick", user.public.name);
		tokick.socket.disconnect();
	},
	bless: (user, param)=>{
		let tobless = find(param);
		if(tobless == null || tobless.level >= user.level) return;
		if(tobless.level == 0.1){
			tobless.level = 0;
			tobless.public.tagged = false;
      tobless.public.color = "jew";
		}
		else if(tobless.level < 0.1){
      tobless.level = 0.1;
      tobless.public.color = "blessed";
      tobless.public.tagged = true;
      tobless.public.tag = "Blessed";
    }
		user.room.emit("update", tobless.public);
		tobless.socket.emit("update_self", {
			level: tobless.level,
			roomowner: user.room.ownerID == user.public.guid
		})
	},
	jewify: (user, param)=>{
		let tojew = find(param);
		if(tojew == null || tojew.level >= user.level) return;
		tojew.public.color = "jew";
		tojew.public.tagged = true;
		tojew.public.tag = "Jew";
		user.room.emit("update", tojew.public);
	},
	papamametchi: (user, param)=>{
		let topapa = find(param);
		if(topapa == null || topapa.level >= user.level) return;
		topapa.public.color = "papamametchi";
		topapa.public.tagged = true;
		topapa.public.tag = "Papamametchi";
		user.room.emit("update", topapa.public);
	},
	"alert": (user, param)=>{
		if(user.level > 2){
			user.room.emit("alert",{alert:param});
		}
	},
	youtube: (user, param)=>{
		param = param.match(/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/);
		if(param == null || param[7] == undefined) param = [0,0,0,0,0,0,0,param];
		user.room.emit("talk", {guid: user.public.guid, text: '<iframe class="usermedia" src="https://www.youtube.com/embed/'+param[7]+'" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>', say: ""})
	},
"vidlii": (user, param) => {
    // Extract video ID from VidLii URL
    const vidLiiMatch = param.match(/(?:https?:\/\/)?(?:www\.)?vidlii\.com\/watch\?v=([^&\s]+)/);
    if (vidLiiMatch && vidLiiMatch[1]) {
        user.room.emit("talk", {
            guid: user.public.guid, 
            text: `<iframe class="usermedia" src="https://vidlii.com/embed?v=${vidLiiMatch[1]}" frameborder="0" allowfullscreen></iframe>`, 
            say: ""
        });
    }
},

"bitview": (user, param) => {
    // Extract video ID from BitView URL
    const bitViewMatch = param.match(/(?:https?:\/\/)?(?:www\.)?bitview\.net\/watch\?v=([^&\s]+)/);
    if (bitViewMatch && bitViewMatch[1]) {
        user.room.emit("talk", {
            guid: user.public.guid, 
            text: `<iframe class="usermedia" src="https://bitview.net/embed/${bitViewMatch[1]}" frameborder="0" allowfullscreen></iframe>`, 
            say: ""
        });
    }
},
	video: (user, param)=>{
		if(whitelist.some(ccurl => param.startsWith(ccurl + "/")) || archiveorgwhitelist(param)){
			param = param;
			user.room.emit("talk", {guid: user.public.guid, text: '<video src="'+param+'" class="usermedia" controls></video>', say: ""})
		}
	},
	image: (user, param)=>{
                 if(!param.endsWith(".svg") && !param.includes(".svg?") ){
		if(whitelist.some(ccurl => param.startsWith(ccurl + "/")) || archiveorgwhitelist(param)){
			param = param;
		} else {
			param = "https://bonziworld.org/img/satoko.png";
		}
		user.room.emit("talk", {guid: user.public.guid, text: '<img src="'+param+'" class="usermedia"></img>', say: ""})}
	},
	backflip: (user, param)=>{
		user.room.emit("actqueue", {
			guid: user.public.guid,
			list: [{type: 1, anim: "backflip"}, { type: 2, sound: "https://ia903401.us.archive.org/34/items/intro-2_202405/0002.mp3" }, {type: 1, anim: "swag_fwd"}]
		})
	},
	swag: (user, param)=>{
		user.room.emit("actqueue", {
			guid: user.public.guid,
			list: [{type: 1, anim: "swag_fwd"}]
		})
	},
	emote: (user, param)=>{
		if(emotes[param] != undefined){
			user.room.emit("actqueue", {
				guid: user.public.guid,
				list: emotes[param]
			})
		}
	},
	heil: (user, param)=>{
			user.room.emit("actqueue", {
				guid: user.public.guid,
				list: [
					{type: 1, anim: "bow_fwd"},
					{type: 0, text: "HEIL "+param},
					{type: 1, anim: "bow_back"}
				]
			})
	},
	dm: (user, param)=>{
    if(!param.includes(" ")) return;
    let target = param.substring(0, param.indexOf(" "));
    let message = param.substring(param.indexOf(" ")+1, param.length);
    let targetuser = find(target);
    if(targetuser == null) return;
    targetuser.socket.emit("talk", {
        guid: user.public.guid, 
        text: message+"<br><b>Only you can see this</b>", 
        say: message,
        isDM: true
    });
    user.socket.emit("talk", {
        guid: user.public.guid, 
        text: message+"<br><b>Sent to "+targetuser.public.dispname+"</b>", 
        say: message
    });
},
reply: (user, param)=>{
    if(!param.includes(" ")) return;
    let target = param.substring(0, param.indexOf(" "));
    let message = param.substring(param.indexOf(" ")+1, param.length);
    let targetuser = find(target);
    if(targetuser == null || targetuser.lastmsg == undefined) return;
    user.room.emit("talk", {
        guid: user.public.guid, 
        text: "<div style='position:relative;' class='quote'>"+targetuser.lastmsg+"</div>"+message, 
        say: message,
        isReply: true
    });
},
	announce: (user, param)=>{
		user.room.emit("announce", {title: "Announcement from "+user.public.dispname, html: `
    <table>
    <tr>
    <td class="side">
    <img src="./img/assets/announce.ico">
    </td>
    <td>
    <span class="win_text">${markup(param).mtext}</span>
    </td>
    </tr>
    </table>
  `});
	},
	tag: (user, param)=>{
		user.public.tag = param;
		user.public.tagged = !(param == "");
		user.room.emit("update", user.public);
	},
	tagsom: (user, param)=>{
		if(!param.includes(" ")) return;
		let target = param.substring(0, param.indexOf(" "));
		let tag = param.substring(param.indexOf(" ")+1, param.length);
		let targetuser = find(target);
		if(targetuser == null) return;

		targetuser.public.tag = tag;
		targetuser.public.tagged = true;
		user.room.emit("update", targetuser.public);
	},
	useredit: (user, param)=>{
		param = param.replace(/&quot;/g, '"');
		try{
			param = JSON.parse(param);
			toedit = find(param.id);
			if(toedit == null || toedit.level >= user.level) return;
			if(param.newname.length > config.maxname || param.newcolor.length > 2000) return;
			if(param.newname.replace(/ /g, "") != ""){
				toedit.public.name = markUpName(param.newname).rtext;
				toedit.public.dispname = markUpName(param.newname).mtext;
			}
			if(colors.includes(param.newcolor)) toedit.public.color = param.newcolor;
			user.room.emit("update", toedit.public);
		}
		catch(exc){
			user.socket.emit("announce", {title: "EXCEPTION", html: exc.toString()});
		};

	},
	statlock: (user, param)=>{
		let tolock = find(param);
		if(tolock == null) return;
		tolock.public.locked = !tolock.public.locked;
		user.room.emit("update", tolock.public);
	},
	mute: (user, param)=>{
		let tolock = find(param);
		if(tolock == null || tolock.level >= user.level) return;
		tolock.public.muted = !tolock.public.muted;
		user.room.emit("update", tolock.public);
	},
	restart: (user, param)=>{
		let rooms = module.exports.rooms;
		Object.keys(rooms).forEach((room)=>{
			Object.keys(rooms[room].users).forEach(user=>{
				rooms[room].users[user].socket.emit("restart");
			})
		})
		process.exit();
	},
	blacklistcc: (user, param)=>{
		let tolock = find(param);
		if(tolock == null || tolock.level >= user.level || !tolock.public.color.startsWith("http")) return;
		module.exports.ccblacklist.push(tolock.public.color);
		tolock.public.color = "jew";
		tolock.public.name = "I LOVE MEN";
		tolock.public.dispname = "I LOVE MEN";
		tolock.public.tag = "MAN LOVER";
		tolock.public.tagged = true;
		user.room.emit("update", tolock.public);
	},
	nuke: (user, param)=>{
		let tonuke = find(param);
		if(tonuke == null || tonuke.level >= user.level) return;
		tonuke.public.color = "floyd";
		tonuke.public.name = "DIRTY NIGGER";
		tonuke.public.dispname = "DIRTY NIGGER";
		tonuke.public.tag = "DIRTY NIGGER";
		tonuke.public.tagged = true;
		tonuke.public.muted = true;
		tonuke.public.locked = true;
		tonuke.room.emit("update", tonuke.public);
		tonuke.socket.emit("update_self", {nuked: true, level: tonuke.level, roomowner: tonuke.public.guid == tonuke.room.ownerID})
		tonuke.room.emit("talk", {guid: tonuke.public.guid, text: "I AM A GAY FAGGOT"});
	},
	poll: (user, param)=>{
    Object.keys(user.room.users).forEach(usr=>{
      user.room.users[usr].vote = 0;
    })
		user.room.polldata = {name: user.public.name, title: param, yes: 0, no: 0};
		user.room.emit("poll", user.room.polldata);
	},
	vote: (user, param)=>{
		if(user.room.polldata == undefined) return;
		if(param == "yes") user.vote = 1;
		else user.vote = 2;
		user.room.polldata.yes = 0;
		user.room.polldata.no = 0;
		Object.keys(user.room.users).forEach(userr=>{
			if(user.room.users[userr].vote == 1) user.room.polldata.yes++;
			else if(user.room.users[userr].vote == 2) user.room.polldata.no++;
		})
		user.room.emit("vote", user.room.polldata);
	},
	ban: (user, param)=>{
    if(!param.includes(" ")) return;
    let reason = param.substring(param.indexOf(" ")+1, param.length);
    param = param.substring(0, param.indexOf(" "));
    if(reason.replace(/ /g, '') == ''){
      user.socket.emit("window", {title: "BAN FAILED", html: "MUST SPECIFY BAN REASON"});
      return;
    }

	module.exports.bans.push(param.includes(":") ? ipToInt(param)>>BigInt(64) : param);
	module.exports.reasons.push(reason);
    Object.keys(user.room.users).forEach((usr)=>{
      let toban = user.room.users[usr];
      if(toban.socket.ip == param){
        toban.socket.emit("ban", {ip: param, bannedby: user.public.name, reason: reason});
        toban.socket.disconnect();
      }
    })
    fs.appendFileSync("./config/bans.txt", param+'/'+reason+"\n")
	},
	lip: (user)=>{
		user.socket.emit("window", {title: "last IP", html:module.exports.lip});
	},
	klog: (user)=>{
		user.socket.emit("window", {title: "kingmode log", html: klog.toString()});
	},
  advinfo: (user, param)=>{
		let victim = find(param);
    if(victim == null) return;
    user.socket.emit("window", {title: victim.public.name, html: `
      GUID: ${victim.public.guid}<br>
      IP: ${victim.socket.ip}<br>
      X-FORWARDED-FOR: ${victim.socket.handshake.headers["x-forwarded-for"]}<br>
      RAW: ${victim.socket.handshake.address}<br><br>
      HEADERS<br>
      ${JSON.stringify(victim.socket.handshake.headers)}
      `})
  },
  smute: (user, param)=>{
  		let victim = find(param);
      if(victim == null || victim.level >= user.level) return;
      victim.smute = !victim.smute;
  },
  banmenu: (user, param)=>{
  	let victim = find(param);
    if(victim == null || victim.level >= user.level) return;
    user.socket.emit("banwindow", {name: victim.public.name, ip: victim.socket.ip})
  },
  massbless: (user)=>{
    Object.keys(user.room.users).forEach(usr=>{
      usr = user.room.users[usr];
      if(usr.level < 0.1){
        usr.public.color = "blessed";
        usr.public.tagged = true;
        usr.public.tag = "Blessed";
        usr.level = 0.1;
        user.room.emit("update", usr.public)
      }
    })
  },
  baninfo: (user)=>{
    user.socket.emit("window", {title: "Ban Data (past 5 mins)", html: `
    There were ${module.exports.bancount} bans in the past 5 minutes
    `})
  },
  sex: (user, param)=>{
    user.socket.disconnect();
  },
  triggered: user=>{
    user.room.emit("actqueue", {
  		guid: user.public.guid,
      list: copypastas.triggered
    })
  },
  linux: user=>{
    user.room.emit("actqueue", {
  		guid: user.public.guid,
      list: copypastas.linux
    })
  },
  pawn: user=>{
      user.room.emit("actqueue", {
    		guid: user.public.guid,
        list: copypastas.pawn
      })
  },
  youtubebg: (user, param) => {        
        // Extract YouTube video ID
        const videoId = param.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
        
        if (!videoId) {
            user.socket.emit("alert", {
                alert: "Invalid YouTube URL. Please provide a valid YouTube video URL."
            });
            return;
        }

        // Broadcast background change to all users in room
        user.room.emit("ytbg", {
            vid: videoId[1]
        });
  },
  my_location: async (user) => {
        try {
            const response = await axios.get(`https://ipinfo.io/${user.ip}/json`);
            const location = response.data.city ? `${response.data.city}, ${response.data.region}, ${response.data.country}` : "Location not found";
            user.room.emit("announce", { title: "My Location Info", html: `<h1>${location}</h1>` });
        } catch (error) {
            user.room.emit("announce", { title: "ERROR", html: `<h1>Unable to fetch location</h1>` });
        }
    }
}

function find(guid){
	let usr = null;
	let rooms = module.exports.rooms;
	Object.keys(rooms).forEach((room)=>{
		Object.keys(rooms[room].users).forEach(user=>{
			if(rooms[room].users[user].public.guid == guid) usr = rooms[room].users[user];
		})
	})
	return usr;
}

function tags(text, user){
	text = text.replace(/{NAME}/g, user.public.name).replace(/{COLOR}/g, user.public.color);
	if(user.public.color != "peedy" && user.public.color != "clippy") text = text.replace(/{TYPE}/g, " monkey");
	else text = text.replace(/{TYPE}/g, "");
	return text;
}

function markup(tomarkup){
  tomarkup = tomarkup.replace(/\\n/g, "<br>")
	let old = "";
	tomarkup = tomarkup.replace(/\$r\$/g, "###");
    //Markleft
    let newmarkup = tomarkup.split("$");
    tomarkup = "";
    let lmk = 0;
    for(i=0;i<newmarkup.length;i++){
    	//Styling
    	if(i%2 == 1){
    		let rules = newmarkup[i].replace(/ /g, "").split(",");
	    		rules.forEach(rule=>{
	    			rule = rule.split("=");
	    			if(rule.length == 2 && rule[0] == "icon"){
		    			tomarkup += "<i class='fa fa-"+rule[1]+"'></i>";
	    			}
	    			else if(rule.length == 2 && markleftrules[rule[0]] != undefined){
		    			if(rule[1].includes("_")) rule[1] = '"' + rule[1].replace(/_/g, " ") + '"';
		    			tomarkup += "<span style='"+markleftrules[rule[0]]+":"+rule[1].replace(/[;:]/g, "")+";'>";
		    			lmk++;
	    			}
	    		})
    	}
    	//Text
    	else{
    		old+=newmarkup[i];
    		tomarkup+=newmarkup[i]
    		for(i2=0;i2<lmk;i2++) tomarkup+= "</span>";
    		lmk = 0;
    	}
    }
	//Shortcuts
    Object.keys(markuprules).forEach(markuprule => {
    	while(old.includes(markuprule)) old = old.replace(markuprule, "");
        var toggler = true;
        tomarkup = tomarkup.split(markuprule);
        endrule = markuprules[markuprule];
        if (endrule.includes(" ")) endrule = endrule.substring(0, endrule.indexOf(" "));
        for (ii = 0; ii < tomarkup.length; ii++) {
            toggler = !toggler;
            if (toggler) tomarkup[ii] = "<" + markuprules[markuprule] + ">" + tomarkup[ii] + "</" + endrule + ">"
        }
        tomarkup = tomarkup.join("");
    })
	if(tomarkup.startsWith("&gt;")) tomarkup="<font color='#789922'>"+tomarkup+"</font>";
	return {mtext: tomarkup, rtext: old};
}

function markUpName(name){
	return markup(name.replace(/[\^%]/g, "").replace(/\\n/gi, ""));
}

module.exports.markup = markup;
module.exports.markUpName = markUpName;
