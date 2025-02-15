var builder = require('botbuilder');

var lib = new builder.Library('proactive-dialogs');
const chatbase = require('./core/chatbase');
const back_to_menu = require('./back-to-menu');
const serializeError = require('serialize-error');

lib.dialog('referral_bonus', [
    function (session, args) {
        session.conversationData.backState = false;
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('proactive.referral_message'), null, false, false);
        session.send(session.gettext('proactive.referral_message',args.referralPoints, args.friendName));

        back_to_menu.sendBackToMainMenu(session, builder);
    }
]);

lib.dialog('referral_joined', [
    function (session, args) {
        session.conversationData.backState = false;
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('proactive.referral_joined'), null, false, false);
        session.send(session.gettext('proactive.referral_joined',args.friendName, args.num_of_tasks_for_referral));

        back_to_menu.sendBackToMainMenu(session, builder);
    }
]);

lib.dialog('daily_bonus', [
    function (session, args) {
        session.conversationData.backState = false;
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('proactive.daily_bonus'), null, false, false);
        session.send(session.gettext('proactive.daily_bonus'));

        back_to_menu.sendBackToMainMenu(session, builder);
    }
]);

lib.dialog('offer_completed', [
    function (session, args) {
        session.conversationData.backState = false;
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('proactive.offer_completed'), null, false, false);
        session.send(session.gettext('proactive.offer_completed', args.points));

        back_to_menu.sendBackToMainMenu(session, builder);
    }
]);

lib.dialog('inactivity_7days', [
    function (session, args) {
        session.conversationData.backState = false;
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('proactive.inactivity_7days'), null, false, false);
        session.send(session.gettext('proactive.inactivity_7days'));

        // card with 2 buttons: 
        // 1. Disable these notifications (+ Let the user tell us why he left us).
        // 2. Make money now (main menu).
    }
]);

lib.dialog('custom', [
    function (session, args) {
        session.conversationData.backState = false;
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, 'custom proactive message', null, false, false);
        let message = args.message;
        if (message.indexOf('\\n\\r') > -1) {
            message = message.split('\\n\\r').join('\n\r');
        }
        session.send(message);

        back_to_menu.sendBackToMainMenu(session, builder);
    }
]);



// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};