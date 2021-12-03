const express= require("express");
var router = express.Router(),client, Util = require("./gm-server/util.js");
var {Util,Collection} = require("./gm-server");

var usersCache = new Collection();
function getUser(token) {
    return new Promise((resolve,reject) => {
        if (usersCache.has(token)) {
            let t = usersCache.get(token);
            t.cache = true;
            if (t.date_added + (2 * 60 * 60 * 1000) > Date.now()) {
                //renew every two hours
                return resolve(t);
            }
        }
        Util.request("https://discord.com/api/users/@me",{
            headers: {
                "authorization": "Bearer " + token,
                "accept": "application/json"
            },
            json: true
        },(r) => {
            if (r.status !== 1) {
                return resolve(false);
            } else {
                r.res.cache = false;
                r.res.date_added = Date.now();
                r.res.avatar_url = "https://cdn.discordapp.com/avatars/" + r.res.id + "/" + r.res.avatar + ".png";
                r.res.token = token;
                usersCache.set(token,r.res);
                return resolve(r.res);
            }
        });
    });
}

router.post("/edit_guild",function (req,res) {
    let id = req.query.id;
    if (!id) {
        res.status(400);
        return res.send("Missing id parameter");
    }
});

router.get("/all_guilds",function (req,res) {
    let guilds = [];
    client.bot.guilds.cache.forEach((g) => {guilds.push(g.id);});
    res.set("content-type","application/json");
    return res.send(JSON.stringify(guilds));
});

router.get("/all_user_guilds",async function (req,res) {
    let {user_id,access_token} = req.query;
    if (!user_id || !access_token) {
        res.status(400);
        return res.send("BAD REQUEST, MISSING PARAMS");
    }
    //console.log("UserID",user_id);
    let guilds = []; //Array.from(client.bot.guilds.cache.keys());
    let myMap = client.bot.guilds.cache;
    for (let [guild_id, g] of myMap) {
        let localGuild = client.guilds.get(g.id);
        if (!localGuild) {
            continue;
        }
        let u;
        try {
            u = await g.members.fetch(user_id);
            if (u) {
                let canEdit = false;
                if (user_id == g.ownerID) {
                    canEdit = true;
                } else if (localGuild.role_admin && u.roles.cache.has(localGuild.role_admin)) {
                    canEdit = true;
                }
                guilds.push({
                    id: g.id,
                    name: g.name,
                    icon: g.iconURL(),
                    access: Number(canEdit)
                });
            }
        } catch(err) {
            console.log(err);
        }
    }

    // console.log(guilds);
    res.set("content-type","application/json");
    return res.send(JSON.stringify(guilds));
});

function checkAuthsForReq(req,res,access_token,guild_id) {
    return new Promise(async (resolve,reject) => {
        if (!access_token || !guild_id) {
            res.status(400);
            res.send("BAD REQUEST, MISSING PARAMS");
            return resolve(false);
        }
        var currentUser = await getUser(access_token);
        req.api_user = currentUser;

        if (!currentUser) {
            res.status(403);
            res.send("You are not authorized to access this guild (must be logged in)");
            return resolve(false);
        }

        let gu = client.guilds.get(guild_id);
        if (!gu) {
            res.status(404);
            res.send("This guild is not initialized or does not exist");
            return resolve(false);
        }
        let dGuild = client.bot.guilds.cache.get(guild_id);
        if (!dGuild) {
            res.status(403);
            res.send("Cannot check authorization, bot is not in the server");
            return resolve(false);
        }
        let user_id = currentUser.id;
        let us = await dGuild.members.fetch(user_id);
        if (!us) {
            res.status(403);
            res.send("You must be in the server to access the settings");
            return resolve(false);
        }
        let canAccess = false;
        if (user_id == dGuild.ownerID) {
            canAccess = true;
        } else if (gu.role_admin && us.roles.cache.has(gu.role_admin)) {
            canAccess = true;
        }

        if (!canAccess) {
            res.status(403);
            res.send("You cannot access to this server's settings");
            return resolve(false);
        }
        return resolve(true);
        //here, user can view and edit data
    });
}

router.get("/get_guild_data",async function (req,res) {
    let access_token = req.query.access_token;
    let guild_id = req.query.guild_id;
    try {
        if (!(await checkAuthsForReq(req,res,access_token,guild_id))) return;
    } catch (err) {
        console.error("Error 'checkAuthsForReq' for: /get_guild_data:",err);
        return;
    }
    // console.log("GuildDataUSER:",req.api_user);

    let gu = client.guilds.get(guild_id);
    let data = gu.dashboardData();
    res.set("content-type","application/json");
    return res.send(JSON.stringify(data));
});

router.post("/set_guild_data",async function (req,res) {
    let access_token = req.query.access_token;
    let guild_id = req.query.guild_id;
    try {
        if (!(await checkAuthsForReq(req,res,access_token,guild_id))) return;
    } catch (err) {
        console.error("Error 'checkAuthsForReq' for: /set_guild_data:",err);
        res.status(500);
        res.send(err);
        return;
    }
    let o = req.body;
    if (!o || typeof(o) != "object") {
        res.status(400);
        return res.send("Missing request body");
    }
    if (!o.id) {
        res.status(400);
        return res.send("Invalid request body");
    }
    // console.log("GuildDataUSER:",req.api_user);

    let gu = client.guilds.get(guild_id);
    let wasSet = gu.fromDashboardData(o);
    if (wasSet === true) {
        res.status(200);
        return res.send(JSON.stringify({
            status: 1
        }));
    }
    res.set("content-type","application/json");
    return res.send(JSON.stringify({
        status: 1
    }));
});

module.exports = function (client_) {
    client = client_;
    return router;
};