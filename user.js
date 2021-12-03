class VyleUser {
    constructor(client,id,data) {
        /**
         * @type {Client}
         */
        Object.defineProperty(this,"client",{value: client});

        /**
         * @type {string}
         */
        this.id = id;
        
        /**
         * @type {?string}
         */
        this.calendar_url = null;

        if (data) this.setup(data);
    }

    setup(d) {
        this.calendar_url = d.calendar_url || null;
    }
}

module.exports = VyleUser;