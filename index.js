// Make me admin on david's server
// client.guilds.get("699998146343731280").role_admin = "699999264671006881";
/**
 * @typedef {Object} sql_requestRes
 * @property {number} status
 */
Date.prototype.format = require("./gm/gm-date_format.js");
const request = require("request");
const {Util,Collection} = require("./gm-server");
Util.request.setRequest(request);
const VyleGuild = require("./guild.js");
const {VyleCommand,VyleCustomCommand} = require("./command.js");
const VyleUser = require("./user.js");
const Discord = require("discord.js");
const Events =  require("events");
const Parsing = require("./parsing.js");
const VyleCalendar = require("./calendar.js");
const app = Util.express({
    port: 3000,
    post: true
});
const express = app.express;
const fs = require("fs");
const write = (path,d) => fs.writeFileSync(path,JSON.stringify(d,null,2));
const Testing = false;
var converter;

const DBName = Testing ? "botguildstest" : "botguilds";


const Config = require("./config.js");
var pg = require('pg');
function exit() {process.exit(1);}
const resetColor = "\x1b[0m";
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askReadCommand() {
    rl.question("Command:", (answer) => {
        console.log("\x1b[34m",answer,resetColor);
        try {
            var m = eval(answer);
        } catch (e) {
            console.error(e);
        }
        if (!m && m !== 0 && m !== false && m !== [] && (m === null && m === undefined)) {m = "Done";}
        console.log("\x1b[34m",m,resetColor);
        askReadCommand();
    });
}
var d;

function t() {
    return client.guilds.get("710493762606071860");//david's test server
}
function tvgs() {
    return client.guilds.get("808074192376430633");
}
/**
 * The main app client
 * @extends {Events}
 */
class Client extends Events {
    constructor() {
        super();
        /**
         * The bot client
         * @type {Discord.Client}
         */
        Object.defineProperty(this,"bot",{value: new Discord.Client()});

        this.DBName = DBName;

        /**
         * The SQL connection
         * @type {pg.Client}
         */
        Object.defineProperty(this,"sql_connection",{value: null,writable: true});

        Object.defineProperty(this,"zoom_links",{value: null,writable: true});

        Object.defineProperty(this,"calendar",{value: new VyleCalendar(this),writable: true});

        this.guilds = new Collection();

        this.users = new Collection();

        Object.defineProperty(this,"secret",{value: process.env.API_SECRET,writable: true});
        
        /**
         * The icon of the bot
         * @type {string}
         */
        this.avatarURL = "";
    }

    formatDate(dt) {
        return Util.changeTimezone(dt).format("ddd mmm dd yyyy HH:MM:ss");
    }

    start() {
        this.loadData().then(() => {
            console.log("[start] Got guilds and users data with success");
            this.bot.login(process.env.TOKEN_MAIN);
        }).catch(console.error);
        this.loadZoomLinks().then((r) => {
            console.log("[start] Loaded the zoom links");
            this.zoom_links = r;
        }).catch((e) => {
            // console.error("Error loading zoom links:",e);
        });
    }

    /**
     * Make a mysqli query.
     * @constructor
     * @param {string} query_ - The query to send.
     * @param {array} args_ - The arguments represented by a dollar
     * @param {requestCallback} callback - The function callback
     */
    sql_request(query_, args_, callback) {
        
        var r = {};
        this.sql_connection.query(query_, args_, function(err, result) {
            if (err) {
                r = {
                    status: 0,
                    query: query_,
                    error: err,
                    num_of_rows: -1
                };
            } else {
                r = {
                    status: 1,
                    query: query_,
                    num_of_rows: -1,
                    res: result
                };
                if (result.rows != undefined) {
                    if (result.rows.length != undefined) {
                        r.num_of_rows = result.rows.length;
                    }
                }
            }
            if (typeof callback == 'function') {
                return callback(r);
            } else {
                return console.error('<callback> should be a function');
            }
        });
    }

    connectSQL() {
        return new Promise((resolve,reject) => {
            var pg_data;
            pg_data = {
                connectionString: process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false
                }
            };
            this.sql_connection = new pg.Client(pg_data);
            this.sql_connection.connect(function(err) {
                if (err) return reject(err);
                return resolve();
            });
        });
    }

    loadData() {
        let par = this;
        let sqlToSend = `SELECT ${DBName}.id, ${DBName}.guild FROM ${DBName}`;
        // if (Testing) sqlToSend += ` WHERE ${DBName}.id=$1 OR ${DBName}.id LIKE '%_test'`;
        return new Promise((resolve,reject) => {
            this.sql_request(sqlToSend,[],(r) => {
                if (!r.status) {
                    return reject(r);
                }
                par.guilds.clear();
                par.users.clear();
                // d = r;
                for(let row of r.res.rows) {
                    if (row.id && row.guild) {
                        row.guild = Util.JSONParse(row.guild);
                        //console.log("RowID",row.id);
                        if (row.guild === null) continue;
                        if (row.id == Config.settingsRowID) {
                            for(let id in row.guild) {
                                par.users.set(String(id),new VyleUser(par,id,row.guild[id]));
                            }
                            continue;
                        }
                        let id = row.guild.id;
                        row.guild.saveKey = row.id;
                        this.guilds.set(id,new VyleGuild(par,id,row.guild));
                    }
                }
                return resolve();
            });
        });
    }

    /**
     * @returns {VyleGuild}
     */
    guild(id) {
        return this.guilds.get(id) || null;
    }

    treatZoomSheet(d) {
        let r = [];
        let current = {},last_row = null;
        for(let c of d) {
            let cell_data = c["gs$cell"];
            let row = Util.parseInt(cell_data.row);
            let col = Util.parseInt(cell_data.col);
            let content = cell_data["$t"];
            if (row === 1) {
                //console.log(row,col,content);
                continue;
            }
            if (row !== last_row) {
                current = Object.assign(Config.zoom_link_format,current);
                if (current.email) {
                    current.alias = current.email.split("@")[0];
                }
                if (current.first_name && current.last_name) {
                    current.full_name = current.first_name.trim() + " " + current.last_name.trim();
                }
                if (last_row !== null) r.push(Object.assign({},current));
                current = {};
                last_row = row;
            }
            content = content.trim();
            switch (col) {
                case 1: current.email = content;break;
                case 2: current.person_id = content;break;
                case 3: current.last_name = content;break;
                case 4: current.first_name = content;break;
                case 5: current.id = content;break;
                case 7: current.link_name = content;break;
                case 8: current.link_id = content;break;
            }
        }
        return r;
    }

    /**
     * Loads the zoom links into an array
     * @returns {Promise}
     */
    loadZoomLinks() {
        let par = this;
        let url = "https://spreadsheets.google.com/feeds/cells/" + Config.zoom_links_sheetid +"/1/public/values?alt=json";
        return new Promise((resolve,reject) => {
            Util.request(url,{json: true},(r) => {
                if (r.status !== 1) {
                    return reject(r);
                }
                if (!r.res.feed || !r.res.feed.entry) {
                    return reject("Invalid response format");
                }
                return resolve(par.treatZoomSheet(r.res.feed.entry));
            });
        });
    }

    /**
     * @returns {Array<Object>}
     */
    zoomLinks(search) {
        search = search.trim().toLowerCase().replace(/\s+/g, '');
        let r = [];
        for(let l of this.zoom_links) {
            if (!l.alias || !l.full_name) continue;
            if (l.full_name.replace(/\s+/g, '').toLowerCase().includes(search)) {
                r.push(Object.assign({},l));
            } else if (l.alias.includes(search)) {
                r.push(Object.assign({},l));
            }
        }
        return r;
    }

    initGuild(guild_id) {
        let par = this;
        return new Promise((resolve,reject) => {
            if (this.guilds.has(guild_id)) {
                return reject("Guild already initialized");
            }
            let guild = new VyleGuild(client,guild_id,{});
            // if (Testing) guild.saveKey = guild_id + "_test";
            this.sql_request(`INSERT INTO ${DBName} (id) VALUES ($1)`,[guild.id],function (insert_r) {
                if (!insert_r.status) {
                    return reject("Error creating new row");
                }
                guild.save().then((r) => {
                    par.guilds.set(guild_id,guild);
                    return resolve();
                }).catch((err) => {
                    console.log(err);
                });
            });
        });
        

    }
}

const client = new Client();

if (Testing || true) {converter = require("./converter.js")(client);}

client.bot.on("ready",function () {
    console.log('[start] Connection to discord client successfully as ' + client.bot.user.tag + ' !');
    client.avatarURL = client.bot.user.displayAvatarURL();
    app.connect(true);
});

client.bot.on("guildCreate",async function (guild) {
    console.log("guildCreate",`${guild.id}: ${guild.name}`);
    try {
        let o = await guild.members.fetch(guild.ownerID);
        client.initGuild(guild.id).then(async () => {
            o.user.send("Settings successfully created for this server: **" + guild.name + "**");
        }).catch((err) => {
            o.user.send(`Error creating settings for server: **${guild.name}**\n*${err}*`);
        });
    } catch (err) {
        console.error("Error, guildCreate",err);
    }
    
});

function checkGrandCommands(msg,guild) {
    let trimmed = msg.content.trim().toLowerCase();
    if (trimmed.startsWith("vyle init")) {
        client.initGuild(msg.guild.id).then(() => {
            msg.channel.send("Created guild with success !");
        }).catch((err) => {
            msg.channel.send("Error creating guild:\n**" + err + "**");
        });
        return;
    }
    if (!client.guilds.has(msg.guild.id)) {
        msg.channel.send((new Discord.MessageEmbed())
            .setAuthor("Vyle Bot",client.avatarURL)
            .setDescription("Could not access data: please send a `vyle init` to initialize this server")
        );
    }
    if (trimmed.startsWith("vyle help")) {
        let embed = new Discord.MessageEmbed();
        embed.setColor([255, 255, 255]);
        embed.setTitle("Help").setAuthor("Vyle Bot",client.avatarURL).setThumbnail(client.avatarURL);
        embed.setDescription("`" + guild.prefix + "help` for more");
        embed.addField("Bot prefix in server:","`" + guild.prefix + "`")
            .addField("Number of actions","`" + guild.actions.filter(a => a.enabled).size + "`")
            .addField("Number of custom commands","`" + guild.customs.filter(a => a.enabled).size + "`")
            .addField("Uptime:","`" + Util.formatTime(Date.now() - client.bot.readyTimestamp) + "`")
            .addField("Dashboard","[Click here for server's dashboard](" + Config.dashboard + "/edit?server_id=" + guild.id + ")");
        embed.setTimestamp();
        msg.channel.send(embed);
    }
}

/**
 * @param {Discord.Message}
 */
async function onMessage(msg) {
    if (!msg.guild || msg.author.bot) return;
    /**
     * @type {VyleGuild}
     */
    let content = msg.content;

    let trimmed = content.trim().toLowerCase(); //.replace(/ /g, "");

    let guild = client.guild(msg.guild.id);

    if (!guild) {
        return checkGrandCommands(msg,guild);
    }

    /**
     * @type {VyleCommand}
     */
    var cmd;
    var {args,usedAlias,splitArgs} = guild.parseMessageContent(content);
    if (!!usedAlias) {
        cmd = guild.forAlias(usedAlias);
    }
    if (!guild.checkMessageChannel(msg)) {
        if (cmd) {
            return msg.delete();
        } else {
            msg.delete();
            if (guild.channel_general && msg.guild.channels.cache.has(guild.channel_general)) {
                msg.guild.channels.cache.get(guild.channel_general).send(`${msg.author} said in ${msg.channel}:\n${msg.content}`);
            }
            return;
        }
    }

    if (!cmd) {
        return checkGrandCommands(msg,guild);
    }

    if (!cmd.enabled) {
        return msg.channel.send(`${msg.author}, this command is disabled (\`${cmd.name}\`)`);
    }
    if (!cmd.checkRoles(msg.member._roles)) {
        return msg.channel.send(`${msg.author}, you are not allowed to use this command (\`${cmd.name}\`)`);
    }

    if (!cmd.checkChannel(msg.channel.id)) {
        return msg.channel.send(`${msg.author}, this command (\`${cmd.name}\`) cannot be used in this channel (${msg.channel})`);
    }

    var t = cmd.ready();
    if (t !== true && t > 0) {
        return msg.channel.send(`${msg.author} you need to wait \`${Util.formatTime(t)}\` before using this command again.`);
    }

    if (cmd.type === "custom") {
        let c = cmd.content();
        if (c !== null) msg.channel.send(c);
        cmd.done();
        if (cmd.erase_message) msg.delete();
        return;
    }
    args = args.trim().toLowerCase();

    var i;

    if (cmd.name === "ping") {
        msg.channel.send('Pinging...').then(m => {
            var ping = m.createdTimestamp - msg.createdTimestamp;
            //var botPing = Math.round(client.pi);

            m.edit(`**:ping_pong: Pong! Your Ping Is: __${ping}ms__`);
        });
    } else if (cmd.name == "help") {
        var e;
        if (!args) args = "1";
        if (Util.parseInt(args) !== null) {
            let num = Util.parseInt(args);
            if (num !== null) num -= 1;
            e = guild.UIHelp(num);
        } else {
            e = guild.UIHelpCommand(args);
        }
        
        msg.channel.send(e.setAuthor(msg.author.tag + "'s command", msg.author.displayAvatarURL()));
    } else if (cmd.name === "write") {
        if (!args) {
            return msg.channel.send(`${msg.author}, please provide text to rewrite.\nUsage of the command: \`${guild.prefix}${cmd.usage}\``);
        }
        msg.channel.send(Parsing.toEmojis(args));
    } else if (cmd.name === "zoom-link") {
        args = args.replace(/\s+/g, '');
        if (!args) {
            return msg.channel.send(`${msg.author}, please provide a search text.\nUsage of the command: \`${guild.prefix}${cmd.usage}\``);
        }
        let links = client.zoomLinks(args);
        let embed = new Discord.MessageEmbed();
        embed.setTitle("Zoom links")
            .setThumbnail(Config.thumbnails.zoom_links)
            .setAuthor(msg.author.tag + "'s command", msg.author.displayAvatarURL())
            .setDescription(`Found ${links.length} results for search \`${args}\``);
        if (links.length > 20) {
            return msg.channel.send(embed.addField("Error","This search returned too many result\n**Make a new search with more precise search**"));
        }
        for(let l of links) {
            let val = "";
            if (l.link_id) {
                val += `[Link w/ id](${l.link_id} '${l.link_id}')`;
            }
            if (l.link_id && l.link_name) {
                val += ' - ';
            }
            if (l.link_name) {
                val += `[Link w/ name](${l.link_name} '${l.link_name}')`;
            }

            embed.addField(l.full_name,val);
        }
        msg.channel.send(embed);
    } else if (cmd.name === "clear") {
        if (args && args.trim().toLowerCase() == "all") {args = 100;}
        args = Util.parseInt(args);
        if (args === null) {
            return msg.channel.send(`${msg.author}, please a number of messages to delete.\nUsage of the command: \`${guild.prefix}${cmd.usage}\``);
        }
        if (args < 1) {
            return msg.channel.send(`${msg.author}, please a __positive__ number of messages to delete.\nUsage of the command: \`${guild.prefix}${cmd.usage}\``);
        }
        //args += 1;
        msg.channel.bulkDelete((args > 100) ? 100 : args, true)
            .then((_message) => {
            msg.channel
                // do you want to include the current message here?
                // if not it should be ${_message.size - 1}
                .send(`Bot cleared \`${_message.size}\` messages :broom:${(args <= 100) ? "" : `\nThe maximum number of messages to delete is **100**`}`)
                .then((sent) => {
                    setTimeout(() => {
                        sent.delete();
                    }, 2500);
                });
            });
    } else if (cmd.name === "calendar") {
        var params = (args) ? args.split(",").map(v => v.trim()) : [];
        client.calendar.getEmbedForUsers([{
            id: '621802826418487309',
            name: "vyle"
        }],{
            no_cache: params.includes("no_cache")
        }).then((embed) => {
            msg.channel.send(embed);
        }).catch((e) => {
            msg.channel.send(e);
        });
    }
    cmd.done();
    if (cmd.erase_message) msg.delete();
}


client.bot.on("message",function (m) {
    try {
        onMessage(m);
    } catch (e) {
        console.log(e);
    }

});

client.connectSQL().then(() => {
    console.log("[start] Opened sql connection");
    client.start();
}).catch(console.error);


askReadCommand();

var api = require("./api.js")(client);
app.use("/api",function (req,res,next) {
    if (!req.headers || !client.secret) {
        res.status(500);
        return res.send("ERROR");
    }

    let auth = req.headers.authorization;
    if (!auth || auth !== client.secret) {
        res.status(403);
        return res.send("Unauthorized");
    }
    next();
},api);
app.get("/",function (req,res) {
    res.send("Online");
});






/**
 * This callback is displayed as a global member.
 * @callback sql_requestCLB
 * @param {sql_requestRes} r The response
 */

//let g = Object.assign({},Config.BaseGuild);g.id = "808074192376430633";client.sql_request("INSERT INTO botguilds (id,guild) VALUES ($1,$2)",["test",g],console.log);

/*
t().actions.first().channels.push("817126629712330753")
t().actions.first().channels_mode = "white"
*/

/*
t().actions.get("ping").roles = ["818546268334325771"];
*/

function tadd() {
    return client.guilds.first().customs.set("test",new VyleCustomCommand("test",{
        name: "test",
        text: "caca boudin"
    }));
}