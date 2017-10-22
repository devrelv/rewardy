var builder = require('botbuilder');

var lib = new builder.Library('check-credits');
var Promise = require('bluebird');

// TODO: Load the locale
lib.dialog('/', [
    function (session) {
        messageText = session.gettext('checkCredit.response {{points}}').replace('{{points}}', session.userData.sender.points);
        session.say(messageText);
        session.endDialog(session.gettext('general.type_to_continue'));
    }
]);


// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};