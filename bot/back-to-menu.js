const chatbase = require('./core/chatbase');

const MAX_TITLE_NUMBER = 5;
const MAX_ACTION_NUMBER = 9;

function getMenuTitle(session) {
    let selection = Math.floor(Math.random() * MAX_TITLE_NUMBER) + 1;
    return (session.localizer.trygettext(session.preferredLocale(), 'backToMenu.title' + selection, 'back-to-menu'));
}

function getMenuAction(session) {
    let selection = Math.floor(Math.random() * MAX_ACTION_NUMBER) + 1;
    return (session.localizer.trygettext(session.preferredLocale(), 'backToMenu.back_to_menu' + selection, 'back-to-menu'));
}

function sendBackToMainMenu(session, builder) {
    let menuTitle = getMenuTitle(session);
    let menuAction = getMenuAction(session);
    var cardActions = [builder.CardAction.imBack(session, menuAction, menuAction)];

    var card = new builder.HeroCard()
        .title(menuTitle)
        .buttons(cardActions);

    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, menuTitle , null, false, false);            

    session.conversationData.backState = true;
    session.endDialog(new builder.Message(session)
        .addAttachment(card));
}

module.exports = {
    sendBackToMainMenu: sendBackToMainMenu
}