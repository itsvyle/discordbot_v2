const Config = require("./config.js");
const emojisRegex = (/[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/ug);
/**
 * @param {string} c
 * @returns {boolean}
 */
exports.onlyEmojis = function (c) {
    c = c.replace(/\s+/g, '');
    //https://www.reddit.com/r/Discord_Bots/comments/gteo6t/discordjs_is_there_a_way_to_detect_emojis_in_a/
    var em,emoji;
    let f = function (e) {
        c = c.replace(e,"");
    };

    em = c.match(/<:.+?:\d+>/g);
    if (em) {
        for(emoji of em) {f(emoji);}
    }
    em = c.match(/:[^:\s]+:/g);
    if (em) {
        for(emoji of em) {f(emoji);}
    }
    em = null;
    if (em = c.match(emojisRegex)) {
        for(emoji of em) {f(emoji);}
        if (!c.trim()) return true;
        for(let char of Config.chars) {
            if (c.includes(char)) return false;
        }
        return true;
    }
    return (!c.trim());
};

/**
 * @param {Message} msg
 * @returns {boolean}
 */
exports.onlyImages = function (msg) {
    //if (msg.content) return false;
    if (!msg.attachments || !msg.attachments.size) {
        if (msg.embeds && msg.embeds.length) {
            return msg.embeds.every(e => e && e.type && e.type === "image");
        } else {return false;}
    }
    return true;
};

/**
 * @type {Object<string,string>}
 */
exports.thumbnails = {
    help: "https://images.emojiterra.com/twitter/512px/2753.png"
};

/**
 * Transforms text into emojis text
 * @param {string} text
 * @returns {string}
 */
exports.toEmojis = function (text) {
    const reg = (/[a-zA-Z]/);
    let r = "";
    for(let letter of text) {
        if (reg.test(letter)) {
			r += ':regional_indicator_' + letter.toLowerCase() + ':';
		} else if (letter == '!') {
			r += ':exclamation:';
		} else if (letter == '?') {
			r += ':question:';
		} else if (letter == ' ') {
			r += '  ';
		} else {
			r += letter;
		}
    }
    return r;
};