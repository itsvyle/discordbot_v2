var client;
const VyleGuild = require("./guild.js");
const Util = require("./gm-server/util.js");

function start() {
    client.sql_request("SELECT diguilds.id, diguilds.guild FROM diguilds WHERE diguilds.id<>$1",["settings"],function (response) {
        if (!response.status) {return console.error(response);}
        let rows = response.res.rows;
        let gus = {};
        for(let row of rows) {
            row.guild = Util.JSONParse(row.guild);
            if (!row.guild) continue;
            gus[row.id] = row.guild;
        }

        for(let guild_id in gus) {
            // if (guild_id !== "699998146343731280") continue;
            let g = gus[guild_id];
            // console.log("Old Guild: ",g.channels);
            let ng = {
                id: g.id,
                role_admin: g.admin_role,
                prefix: g.abrev,
                channel_bot: g.bot_channel,
                channel_general: g.main_channel,
                channels_emojis: Array.isArray(g.channels.emotes_only) ? g.channels.emotes_only.filter(t => !!t) : [],
                channels_images: Array.isArray(g.channels.images_only) ? g.channels.images_only.filter(t => !!t) : [],
                actions: null,
                customs: null
            };
            ng.actions = g.custom.action_settings.map((c) => {
                c.enabled = Boolean(c.enabled);
                c.roles_mode = c.roles_mode == 1 ? "black" : "white";
                c.channels_mode = c.channels_mode == 1 ? "black" : "white";
                if (c.type == "custom") {
                    c.text = c.content;
                }
                c.erase_message = c.erase_command == 0 ? false : true;
                if (!Array.isArray(c.roles)) c.roles = [];
                if (!Array.isArray(c.channels)) c.channels = [];

                delete c['erase_command:'];
                return c;
            });
            ng.customs = g.custom.commands.map((c) => {
                c.type = "custom";
                c.enabled = Boolean(c.enabled);
                c.roles_mode = c.roles_mode == 1 ? "black" : "white";
                c.channels_mode = c.channels_mode == 1 ? "black" : "white";
                if (c.type == "custom") {
                    c.text = c.content;
                }
                c.erase_message = c.erase_command == 0 ? false : true;
                if (!Array.isArray(c.roles)) c.roles = [];
                if (!Array.isArray(c.channels)) c.channels = [];

                delete c['content'];
                delete c['erase_command:'];

                return c;
            });

            // console.log("New Guild: ",ng);
            // continue;
            let vu = new VyleGuild(client,g.id,ng);
            client.sql_request(`INSERT INTO ${client.DBName} (id) VALUES ($1)`,[vu.id],function (r) {
                if (r.status !== 1) {
                    console.error("Error inserting row for guild " + vu.id + ": ",r);
                }
                vu.save().then(() => {
                    console.log("Successfully saved guild for id: " + vu.id);  
                }).catch((err) => {
                    console.error("Error saving for guild " + vu.id + ": ",err);
                });
            });
        }
    });
}

function clear() {
    client.sql_request("DELETE FROM " + client.DBName,[],console.log);
}

module.exports = function (client_) {
    client = client_;
    return {
        start: start,
        clear: clear
    };
};