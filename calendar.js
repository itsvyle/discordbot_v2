const {Util,Collection} = require("./gm-server");
const NodeIcal = require('ical');
const {MessageEmbed} = require("discord.js");
Date.prototype.format = require("./gm/gm-date_format.js");
const fs = require("fs");
const saveWrite = (path,data) => fs.writeFileSync(path,JSON.stringify(data,null,2));

const getUTCTime = function (d1) {
    if (!d1) d1 = new Date();
    return new Date(
        d1.getUTCFullYear(),
        d1.getUTCMonth(),
        d1.getUTCDate(),
        d1.getUTCHours(),
        d1.getUTCMinutes(),
        d1.getUTCSeconds()
    );
};
var dateFormat;
class VyleCalendars {
    constructor(client) {
        Object.defineProperty(this,"client",{
            value: client
        });
        dateFormat = this.client.formatDate;

        this.cache = new Collection();
    }

    parseIcal(str) {
        var og = NodeIcal.parseICS(str);
        // console.log(og);
        var cal = [];
        var eventID, event,k,kv;
        const dt_now = getUTCTime();
        console.log("CALS START");
        for(eventID in og) {
            event = og[eventID];
            if (!event.end || event.end < dt_now) continue;
            let e = {
                start: event.start,
                end: event.end,
                created: event.created,
                description: event.description,
                location: event.location || null,
                summary: event.summary
            };
            if (!e.end || !e.start) continue;
            for(k in e) {
                kv = e[k];
                if (kv && typeof(kv) === "object" && ("val" in kv)) {
                    e[k] = kv.val || null;
                }
            }

            cal.push(e);
        }
        //console.log(cal);
        //saveWrite("./cal.json",cal);
        console.log("CALS END");
        return cal;
    }



    getCalendar(url) {
        return new Promise((resolve,reject) => {
            if (this.cache.has(url)) {
                let r = this.cache.get(url);
                let d = getUTCTime(new Date(r.date.getTime()));
                d.setTime(d.getTime() + (12 * 60 * 60 * 1000));//12 hours
                if (d > getUTCTime()) {
                    return resolve(r);
                }
            }
            Util.request(url,{},(response) => {
                if (response.status !== 1) {
                    return reject(response.error);
                }
                var cal;
                try {
                    cal = this.parseIcal(response.res);
                } catch (e) {}
                if (!cal) {
                    return reject("Error parsing calendar for provided link");
                }
                let r = {
                    date: getUTCTime(),
                    data: cal
                };
                this.cache.set(url,r);
                return resolve(r);
            });
        });
    }

    getCalendarRow(error,cal,user) {
        var user_name = "@" + user.name;
        if (error) {
            return [
                {
                    name: user_name,
                    value: error
                }
            ];
        }
        var cal_events = cal.data;
        let ret = null;
        ret = "";
        const dt_now = getUTCTime();
        var eventIndex = cal_events.findIndex(e => ((e.start < dt_now && dt_now < e.end) || e.start > dt_now));
        
        if (eventIndex < 0) {
            return [{
                name: user_name,
                value: "__Not in event, no future events__"
            }];
        }

        var event = cal_events[eventIndex];
        var eventInProgress = (event.start < dt_now && dt_now < event.end);
        console.log(eventInProgress,event);



        return [{
            name: user_name,
            value: ret
        }];
    }

    getEmbedForUsers(users,opts = {}) {
        var urls = [];
        for(var user_id of users) {
            if (this.client.users.has(user_id.id)) {
                let us = this.client.users.get(user_id.id);
                if (us.calendar_url) {
                    urls.push(us);
                    urls[urls.length - 1].name = user_id.name;
                    if (opts.no_cache) {
                        this.cache.delete(us.calendar_url);
                    }
                }
            }
        }
        let embed = new MessageEmbed();
        embed.setTitle("Calendars");


        return new Promise((resolve,reject) => {
            if (!urls.length) return resolve(embed);
            let done = {};
            for(var user of urls) {
                done[user.id] = false;
            }
            var check = () => {
                if (Object.values(done).includes(false) === false) {return resolve(embed);}
            };
            for(var user_ of urls) {
                let user = user_;
                this.getCalendar(user.calendar_url).then((cal) => {
                    embed.addFields(this.getCalendarRow(null,cal,user));
                }).catch((e) => {
                    embed.addFields(this.getCalendarRow(e,null,user));
                }).finally(() => {
                    done[user.id] = true;
                    check();
                });
            }
        });
    }
}

module.exports = VyleCalendars;