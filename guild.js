const Util = require("./gm-server/util.js");
const Discord = require("discord.js");
const Collection = require("./gm-server/collection.js");
const Config = require("./config.js");
const GuildFields = Config.GuildFields;
const {VyleCommand,VyleCustomCommand} = require("./command.js");
const Parsing = require("./parsing.js");


class VyleGuild {
    constructor(client,id,data) {
        Object.defineProperty(this,"saveKey",{value: null,writable: true});
        /**
         * @type {Client}
         */
        Object.defineProperty(this,"client",{value: client});
        /** 
         * @type {string}
         */
        this.id = id;        
        
        /** 
         * @type {string}
         */
        this.role_admin = null;

        /** 
         * @type {string}
         */
        this.prefix = Config.prefix;

        /** 
         * @type {string}
         */
        this.channel_bot = null;

        /** 
         * @type {string}
         */
        this.channel_general = null;

        /** 
        * @type {Array<string>} 
        */
        this.channels_emojis = [];
        
        /** 
        * @type {Array<string>} 
        */
        this.channels_images = [];
        
        /** 
         * @type {Collection<string,VyleCommand>}
        */
        this.actions = new Collection();
        /** 
        * @type {Collection}
        */
        this.customs = new Collection();

        /**
         * @private
         */
        Object.defineProperty(this,"mappedAliases_",{value: null,writable: true});

        if (data) this.setup(data);
    }

    /**
     * @private 
     */
    mapAliases() {
        this.mappedAliases_ = {};
        let f = (c) => {this.mappedAliases_[c.name] = c.aliases;}

        this.actions.forEach(f);
        this.customs.forEach(f);
        return this.mappedAliases_;
    }

    /**
     * @type {Object<string,Array<string>>} All the aliases for the guild, mapped by command name
     * @readonly
     */
    get mappedAliases() {
        if (!this.mappedAliases_) return this.mapAliases();
        return this.mappedAliases_;
    }

    reset() {
        GuildFields.forEach((r) => this[r] = null);
        this.mappedAliases_ = null;
        this.actions.clear();
        this.customs.clear();
    }

    setup(d,merge) {
        if (merge !== true) this.reset();
        if (d.id) this.id = d.id;

        this.mappedAliases_ = null;

        this.role_admin = d.role_admin || null;

        this.prefix = d.prefix || Config.prefix;

        this.channel_bot = d.channel_bot || null;
        this.channel_general = d.channel_general || null;

        this.channels_emojis = (Array.isArray(d.channels_emojis)) ? d.channels_emojis : [];

        this.channels_images = (Array.isArray(d.channels_images)) ? d.channels_images : [];

        let as = (Array.isArray(d.actions)) ? d.actions.reduce((map,a) => {
            if (!a.name) {return map;}
            map[a.name] = a;
            return map;
        },{}) : {};
        for(let a of Config.actions) {
            let act = null;
            if (as[a.name]) {
                let d = Object.assign(a,as[a.name]);
                d.name = a.name;
                act = new VyleCommand("action",a.name,d);
            } else {
                act = new VyleCommand("action",a.name,a);
            }
            act.example = a.example;
            this.actions.set(a.name,act);
        }
        if (Array.isArray(d.customs)) {
            for(let a of d.customs) {
                if (!a.name) continue;
                // if (this.id == "699998146343731280") console.log(a);
                this.customs.set(a.name,new VyleCustomCommand(a.name,a));
            }
        }

        if (d.saveKey) this.saveKey = d.saveKey;
    }

    toSave() {
        let r = {
            id: this.id
        };
        GuildFields.forEach((f) => r[f] = this[f]);
        r.actions = this.actions.map(a => a.toSave());
        r.customs = this.customs.map(a => a.toSave());
        return r;
    }

    /**
     * Saves the guild to db
     * @returns {Promise}
     */
    save() {
        let DBName = this.client.DBName;
        return new Promise((resolve,reject) => {
            let k = this.saveKey || this.id;
            this.client.sql_request(`UPDATE ${DBName} SET guild = $2 WHERE ${DBName}.id = $1`,[k,this.toSave()],(r) => {
                if (r.status !== 1) {
                    return reject(r);
                } else {
                    return resolve(r.res);
                }
            });
        });
    }

    parseMessageContent(c) {
        let r = {
            args_: null,
            usedAlias: null,
            splitArgs: null
        };
        c = c.trim();
        if (!c.startsWith(this.prefix)) {
            return r;
        }
        r.splitArgs = c.slice(this.prefix.length).trim().split(' ');
        r.usedAlias = r.splitArgs.shift().toLowerCase();
        r.args = r.splitArgs.join(" ").trim();
        return r;
    }

    /**
     * @returns {VyleCommand}
     */
    forAlias(alias) {
        let as = this.mappedAliases;
        for(let c in as) {
            if (as[c].includes(alias)) {
                return (this.actions.has(c) ? this.actions.get(c) : this.customs.get(c));
            }
        }
        return null;
    }

    /**
     * @returns {boolean}
     */
    checkMessageChannel(msg) {
        let c = msg.channel.id;
        if (this.channels_emojis.includes(c) && !Parsing.onlyEmojis(msg.content)) return false;
        if (this.channels_images.includes(c) && !Parsing.onlyImages(msg)) return false;
        return true;
    }

    /**
     * @returns {Discord.Messageembed}
     */
    UIHelp(page = 0) {
        
        let embed = new Discord.MessageEmbed();
        embed.setTitle("Help").setThumbnail(Config.thumbnails.help);
        embed.setColor([190, 25, 49]);
        /**
         * @type {Array<VyleCommand>}
         */
        let all = [...this.actions.array(),...this.customs.array()]
        var i = page * Config.helpPageLength,imax = i + Config.helpPageLength,
        max_page = Math.ceil(all.length / Config.helpPageLength);
        embed.setDescription(`Page: **\`${page + 1}/${max_page}\`**\n**Total commands**: \`${all.length}\`\n\`${this.prefix}help [<page number OR command name]\` for more info`);
        embed.setFooter(`Vyle bot - Page: ${page + 1}/${max_page}`,Config.bot_icon)


        if (page + 1 > max_page || page < 0) {
            return embed.addField("Error","Page out of range");
        }

        if (imax > all.length) imax = all.length;
        
        for(;i < imax;i++) {
            let c = all[i];
            if (!c.enabled) continue;
            let val = `**Description**: ${c.description || "N/A"}`;
            if (c.usage) val += '\n**Usage**: `' + c.usage + '`';
            if (c.aliases_.length) val += `\n**Aliases**: \`${c.aliases.join("`, `")}\``;
            
            embed.addField(`${(c.type === "custom") ? "__Custom__: " : ""}\`${c.name}\``,val);
        }

        return embed;
    }

    UIHelpCommand(args) {
        let embed = (new Discord.MessageEmbed()).setThumbnail(Config.thumbnails.help);
        embed.setColor([190, 25, 49]);
        let cmd = this.forAlias(args);
        if (!cmd) {
            return embed.setTitle("Help").setThumbnail(Config.thumbnails.help).setDescription("Did not find a command for name: `" + args + "`");
        }
        embed.setTitle("Help - `" + cmd.name + "`");
        embed.setDescription(cmd.helpDesc());
        if (!cmd.enabled) return embed;
        if (cmd.aliases_.length) {
            let a = "`" + cmd.aliases_.join("`, `") + "`";
            embed.addField("Aliases:",a);
        }
        embed.addField("Use Interval",(!cmd.interval) ? "No interval" : Util.formatTime(cmd.interval));

        embed.addField("Limited roles",cmd.rolesLimit());
        embed.addField("Limited Channels",cmd.channelsLimit());

        return embed;
    }

    UIGrandHelp() {

    }

    dashboardData() {
        let g = this.client.bot.guilds.cache.get(this.id);
        if (!g) {
            return null;
        }
        let r = this.toSave();
        r.roles = [];
        r.channels = [];

        var f = (c) => {
            let og = this.actions.get(c.name);
            c.example = og.example;  
            c.description = og.description;
            c.usage = og.usage || null;
        };

        r.actions.forEach(f);

        r.name = g.name;

        // console.log(r);
        r.roles = g.roles.cache.map(t => ({
            id: t.id,
            name: t.name,
            color: t.hexColor,
            pos: t.position
        })).sort(Util.sortBy({name: "pos",reverse: true}));

        r.channels = g.channels.cache.map(t => ({
            id: t.id,
            type: t.type,
            name: t.name,
            pos: t.rawPosition
        })).filter(t => t.type === "text").sort(Util.sortBy({name: "pos"}));

        r.information = {
            icon: g.iconURL(),
            joinedAt: g.joinedAt.toString()
        };

        return r;
    }

    fromDashboardData(data) {
        if (!data) {return false;}
        this.setup(data,false);
        this.save().catch((err) => {
            console.error("Error saving new settings for guild (" + this.id + "): ",err);  
        });
        return true;
    }

}
module.exports = VyleGuild;