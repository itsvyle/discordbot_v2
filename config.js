/**
 * @type {Array<string>}
*/
exports.GuildFields = ["role_admin","prefix","channel_bot","channel_general","channels_emojis","channels_images"];

/**
 * @type {string}
 */
exports.prefix = ",";

/**
 * @type {Array<Object>}
 */
exports.actions = [
    {
        name: "ping",
        description: "Get the latency with the bot's server",
        roles_mode: "black",
        roles: [],
        channels_mode: "black",
        channels: [],
        interval: null,
        aliases: [],
        erase_message: false
    },
    {
        name: "help",
        description: "Information on the commands of the bot",
        roles_mode: "black",
        roles: [],
        channels_mode: "black",
        channels: [],
        interval: null,
        aliases: [],
        erase_message: false,
        usage: "help [<command name OR page number>]"
    },
    {
        name: "write",
        description: "Writes text out in emojis",
        usage: "write <text>",
        roles_mode: "black",
        roles: [],
        channels_mode: "black",
        channels: [],
        interval: null,
        aliases: ["w"],
        erase_message: false
    },
    {
        name: "clear",
        description: "Clears the last messages. Max number at once is 100",
        usage: "clear <number of messages>",
        example: "clear 50",
        roles_mode: "black",
        roles: [],
        channels_mode: "black",
        channels: [],
        interval: null,
        aliases: [],
        erase_message: false,
        enabled: false
    },
    {
        name: "zoom-link",
        description: "Returns the zoom link of a teacher for a search query",
        usage: "zoom-link <teacher name / part of teacher name>",
        interval: null,
        aliases: ["z"]
    },
    {
        name: "calendar",
        description: "View the calendar of the user's in the server",
        usage: "calendar",
        interval: null,
        aliases: ["cal"]
    }
];

/**
 * @type {Object}
 */
exports.BaseGuild = {
    id: null,
    role_admin: null,
    prefix: exports.prefix,
    channel_bot: null,
    channel_general: null,
    channels_emojis: [],
    channels_images: []
};

//Example of an action setting
// var test = {
//     name: "test",
//     description: "A test command",
//     roles_mode: "black",
//     roles: [],
//     channels_mode: "white",
//     channels: [],
//     interval: null,
//     aliases: ["t"]
// };

/**
 * @type {Array<string>}
 */
exports.chars = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", ";", "'", "=", "+", "-", "*", "@", "#", "$", "%", "^", "&", "*", "(", ")", "!", "`", "~"];

/**
 * @type {number}
 */
exports.helpPageLength = 10;

/**
 * @type {Object<string,string>}
 */
exports.thumbnails = {
    help: "https://images.emojiterra.com/twitter/512px/2753.png",
    zoom_links: "https://canvas.rutgers.edu/wp-content/uploads/2020/08/zoom-fondo-blanco-vertical-logo-F819E1C283-seeklogo.com_.png",
    calendar: ""
};


/**
 * The row id for the settings in the database
 * @type {string}
 */
exports.settingsRowID = "settings";

/**
 * @type {string}
 */
exports.zoom_links_sheetid = "1zKjALJSn77rviBqHx4fWw4lWYimW74v3_hjaN1fbj1I";

/**
 * @type {Object}
 */
exports.zoom_link_format = {
    email: null,
    person_id: null,
    last_name: null,
    first_name: null,
    id: null,
    link_id: null,
    link_name: null,
    alias: null,
    full_name: null
};

/**
 * @type {string}
 */
exports.client_timezone = "America/New_York";

exports.dashboard = "https://bot-dashboard.itsvyle.repl.co";