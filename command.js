const NormalCommandFields = [
    'name',
    'type',
    'roles_mode',
    'roles',
    'channels_mode',
    'channels',
    'erase_message',
    'interval','aliases',
    'enabled',
];

class VyleCommand {
    constructor(type,name,data) {
        /** 
         * @type {string}
         * @readonly
         */
        Object.defineProperty(this,"type",{value: type,enumerable: true});

        /**
         * @type {string}
         */
        Object.defineProperty(this,"usage",{value: null,writable: true});

        /** 
         * @type {string}
         */
        this.name = name;

        /** 
         * The aliases of the command, excluding the name
         * @type {Array<string>}
         * @private
        */  
        Object.defineProperty(this,"aliases_",{value: null,writable: true});

        /**
         * @type {number}
         */
        Object.defineProperty(this,"last_use",{value: null,writable: true});

        if (data) this.setup(data);
    }

    setup(d) {
        if (d.name) this.name = d.name;

        /** 
         * @type {string}
         */
        this.description = d.description || null;

        /** 
         * The channels checking type (black or white)
         * @type {string}
        */
        this.roles_mode = d.roles_mode || "black";
        /** 
        * @type {Array<string>} 
        */
        this.roles = (Array.isArray(d.roles)) ? d.roles : [];

        /** 
         * The channels checking type (black or white)
         * @type {string}
        */
        this.channels_mode = d.channels_mode || "black";
        /** 
         * @type {Array<string>}
        */
        this.channels = (Array.isArray(d.channels)) ? d.channels : [];

        /**
         * @type {boolean}
         */
        this.erase_message = typeof(d.erase_message) === "boolean" ? d.erase_message : false;

        /**
         * @type {number}
         */
        this.interval = (typeof(d.interval) === "number" && d.interval > 0) ? d.interval : 0;
        //console.log(this.name,", Provided interval: " + d.interval,", final: ",this.interval);
        /**
         * @type {number}
         */
        this.last_use = null;

        /** 
        * @type {Array<string>} 
        */
        this.aliases = (Array.isArray(d.aliases)) ? d.aliases : [];
        if (!this.aliases.includes(this.name)) this.aliases.push(this.name);

        /**
         * @type {string}
         */
        if (d.usage) this.usage = d.usage;

        this.enabled = (d.enabled === 0 || d.enabled === false) ? false : true;

        this.aliases_ = this.aliases.filter(a => a !== this.name);
    }

    helpDesc() {
        let r = "";
        r += (this.description) ? this.description : "*No command description*";
        if (this.type == "custom") {
            r += '\n*This is a custom command*';
        }
        if (!this.enabled) {
            r += `\n**THIS COMMAND IS DISABLED**`;
            return r;
        }
        if (this.usage) {
            r += '\n**Usage**: `' + this.usage + '`';
            if (this.example) r += '\n**Example**: `' + this.example + '`';
        }

        return r;
    }

    rolesLimit() {
        if (!this.roles.length) {return "No roles limit";}
        return ((this.roles_mode === "black") ? "You **cannot** use command if you have one these roles:" : "You can only use command if you **have one of these roles**:") + "\n" + this.roles.map(r => "<@&" + r + ">").join(", ");
    }

    channelsLimit() {
        if (!this.channels.length) {return "No channels limit";}
        return ((this.channels_mode === "black") ? "You **cannot** use command in the following channels:" : "You can only use command in the **following channels**:") + "\n" + this.channels.map(r => "<#" + r + ">").join(", ");
    }

    /**
     * To call when command is sent
     */
    done() {
        if (this.interval) this.last_use = Date.now();
    }

    /**
     * If over 0, then command is not ready
     */
    ready() {
        if (!this.interval) return true;
        if (!this.last_use) return true;
        return (this.last_use + this.interval) - Date.now();
    }
    
    /**
     * @returns {boolean}
     */
    checkRoles(rs) {
        let tr = this.roles;
        if (!tr.length) return true;
        if (this.roles_mode == "white") {
            for (let r of tr) {
                if (rs.includes(r)) return true;
            }
            return false;
        } else {
            for (let r of tr) {
                if (rs.includes(r)) return false;
            }
        }
        return true;
    }
    /**
     * @returns {boolean}
     */
    checkChannel(cid) {
        let tc = this.channels;
        if (!tc.length) return true;
        return (this.channels_mode == "white") ? tc.includes(cid) : !tc.includes(cid);
    }
    /**
     * @returns {boolean}
     */
    checkMsg(msg) {
        return (this.checkChannel(msg.channel.id) && this.checkRoles(msg.member._roles));
    }

    toSave() {
        let r = NormalCommandFields.reduce((map,field) => {
            map[field] = this[field];
            return map;
        },{});
        r.aliases = this.aliases_;
        return r;
    }
}

/**
 * A custom command
 * @extends {VyleCommand}
 */
class VyleCustomCommand extends VyleCommand {
    constructor(name,d) {
        super("custom",name,null);
        // console.log("Custom: ",name," = ",d);

        /**
         * @type {string}
         */
        this.text = null;

        if (d) this.setup(d);
        // console.log("CustomParsed: ",name,this);
    }

    setup(d) {
        super.setup(d);

        this.text = d.text || null;
    }

    /**
     * The content to send
     */
    content() {
        if (!this.text) return null;
        return this.text;
    }

    toSave() {
        let r = super.toSave();
        r.description = this.description;
        r.text = this.text;
        return r;
    }
}

module.exports = {
    VyleCommand: VyleCommand,
    VyleCustomCommand: VyleCustomCommand
}