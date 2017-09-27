var builder = require('botbuilder');
var siteUrl = require('./site-url');
var dal = require('./dal');
var consts = require('./const');

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var userId = '1234'; // TODO: get the real userId - Replace this variable with the user object (the id will be inside)

// Welcome Dialog
var MainOptions = {
    CheckCredit: 'keyboard.root.checkCredit',
    Redeem: 'keyboard.root.redeem',
    InviteFriends: 'keyboard.root.inviteFriends',
    GetCredit: 'keyboard.root.getCredit'
};

function createRootButtons(session, builder) {
    return [
        builder.CardAction.imBack(session, session.gettext(MainOptions.CheckCredit), MainOptions.CheckCredit),
        builder.CardAction.imBack(session, session.gettext(MainOptions.GetCredit), MainOptions.GetCredit),
        builder.CardAction.imBack(session, session.gettext(MainOptions.InviteFriends), MainOptions.InviteFriends),
        builder.CardAction.imBack(session, session.gettext(MainOptions.Redeem), MainOptions.Redeem)
    ];
}


function sendRootMenu(session, builder) {
    var card = new builder.HeroCard()
        .title(session.gettext('main.root.title'))
        .buttons(createRootButtons(session, builder));

    session.send(new builder.Message(session)
        .addAttachment(card));
}

var bot = new builder.UniversalBot(connector, function (session) {

    session.beginDialog('login:/');
    /*
    var welcomeCard = new builder.HeroCard(session)
        .title('welcome_title')
        .subtitle('welcome_subtitle')
        .buttons(createRootButtons(session, builder));

    session.send(new builder.Message(session)
        .addAttachment(welcomeCard));*/
});

// TODO: CheckCredit - Remove the TriggerAction and attach it to the root dialog with URL as in the flowers example
bot.dialog('CheckCredit', [
        function (session) {
            session.say(session.gettext('checkCredit.loading'));

            // getting the credits
            dal.getBotUserById(userId).then(botUser => {
                messageText = '';
                if (!botUser) {
                    console.log('Could not find the bot user value in the database');
                    dal.saveUserToDatabase(userId);
                    messageText = 'error.couldNotFindUser';
                } else {
                    var numOfCredits = botUser.points;
                    messageText = session.gettext('checkCredit.response {{points}}').replace('{{points}}', numOfCredits);
                }

                session.endDialog(messageText);
                sendRootMenu(session, builder);
        }).catch(err => {
            console.log('error in getBotUserById');
            console.log(err);

            session.endDialog('error.couldNotFindUser');
            sendRootMenu(session, builder);
        })
    }
]).triggerAction({ matches: [
    /Check your credit/i
 ]});

// TODO: GetCredits - Remove the TriggerAction and attach it to the root dialog with URL as in the flowers example
bot.dialog('GetCredits', [
    function (session) {
        session.say(session.gettext('getCredit.intro'));
        dal.getDeviceByUserId(userId).then(userResult => {
            if (!userResult) {
                // That's the first time we encounter this user. Share the legal notice!
                session.say(session.gettext('general.legalNotice'));

                // User is missing. Fetch details and save to database
                // TODO: Use the equivalent for bot.getUserDetails
                // This is the source code:
                    // bot.getUserDetails(session.userProfile)
                    // .then(userDetails => {
                    //     let deviceType = extractDeviceTypeFromUserDetails(userDetails.primary_device_os);
                    //     dal.saveDeviceUserToDatabase(userId, deviceType);
                    //     sendUserOfferWallUrl(session, deviceType, userId);
                    // }).catch(function(e) {
                    //     console.error('Failed to extract with error: ' + e); 
                    //     let fallbackDeviceType = consts.DEVICE_TYPE_DESKTOP;
                    //     dal.saveDeviceUserToDatabase(userId, fallbackDeviceType);
                    //     sendUserOfferWallUrl(session, fallbackDeviceType, userId);
                    // });

                // Until we have the bot.getUserDetails function, we can use this:
                console.log('error in getDeviceByUserId');
                console.log('DeviceUser does not exist');
                let fallbackDeviceType = consts.DEVICE_TYPE_DESKTOP;
                dal.saveDeviceUserToDatabase(userId, fallbackDeviceType);
                sendUserOfferWallUrl(session, fallbackDeviceType, userId);
            } else {
                sendUserOfferWallUrl(session, userResult.type, userId);                
            }
        }).catch(err => {
            sendUserOfferWallUrl(session, consts.DEVICE_TYPE_DESKTOP, userId);
            console.log('error in getDeviceByUserId');
            console.log(err);            
        });
}
]).triggerAction({ matches: [
/Get free credit/i
]});

function sendUserOfferWallUrl(session, deviceType, userId) {
    session.send(offerWallLinkForUser(deviceType, userId));
}

function extractDeviceTypeFromUserDetails(deviceTypeString) {
    if (!deviceTypeString) {
        return consts.DEVICE_TYPE_DESKTOP;
    }

    let parsedType = consts.DEVICE_TYPE_DESKTOP;
    let compareModel = deviceTypeString.toLowerCase();
    if (compareModel.includes('android')) {
        parsedType = consts.DEVICE_TYPE_ANDROID;
    }
    else if (compareModel.includes('ios')) {
        parsedType = consts.DEVICE_TYPE_APPLE;
    }

    return parsedType;
}

function offerWallLinkForUser(deviceType, userId) {
    let appId;
    if (deviceType === consts.DEVICE_TYPE_ANDROID) {
        appId = consts.SPONSOR_PAY_APP_ID_ANDROID;
    }
    else if (deviceType === consts.DEVICE_TYPE_APPLE) {
        appId = consts.SPONSOR_PAY_APP_ID_APPLE;
    }
    else { // Desktop or unknown
        appId = consts.SPONSOR_PAY_APP_ID_DESKTOP;
    }

    return `http://iframe.sponsorpay.com/?appid=${appId}&uid=${userId}`;
}
 

// Enable Conversation Data persistence
bot.set('persistConversationData', true);

// Set default locale
bot.set('localizerSettings', {
    botLocalePath: './bot/locale',
    defaultLocale: 'en'
});

// Sub-Dialogs
bot.library(require('./dialogs/shop').createLibrary());
bot.library(require('./dialogs/product-selection').createLibrary());
bot.library(require('./dialogs/delivery').createLibrary());
bot.library(require('./dialogs/details').createLibrary());
bot.library(require('./dialogs/checkout').createLibrary());
bot.library(require('./dialogs/settings').createLibrary());
bot.library(require('./dialogs/help').createLibrary());
bot.library(require('./dialogs/login').createLibrary());

// Validators
bot.library(require('./validators').createLibrary());

// Trigger secondary dialogs when 'settings' or 'support' is called
bot.use({
    botbuilder: function (session, next) {
        var text = session.message.text;

        var settingsRegex = localizedRegex(session, ['main_options_settings']);
        var supportRegex = localizedRegex(session, ['main_options_talk_to_support', 'help']);

        if (settingsRegex.test(text)) {
            // interrupt and trigger 'settings' dialog
            return session.beginDialog('settings:/');
        } else if (supportRegex.test(text)) {
            // interrupt and trigger 'help' dialog
            return session.beginDialog('help:/');
        }

        // continue normal flow
        next();
    }
});

// Send welcome when conversation with bot is started, by initiating the root dialog
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, '/');
            }
        });
    }
});

// Cache of localized regex to match selection from main options
var LocalizedRegexCache = {};
function localizedRegex(session, localeKeys) {
    var locale = session.preferredLocale();
    var cacheKey = locale + ":" + localeKeys.join('|');
    if (LocalizedRegexCache.hasOwnProperty(cacheKey)) {
        return LocalizedRegexCache[cacheKey];
    }

    var localizedStrings = localeKeys.map(function (key) { return session.localizer.gettext(locale, key); });
    var regex = new RegExp('^(' + localizedStrings.join('|') + ')', 'i');
    LocalizedRegexCache[cacheKey] = regex;
    return regex;
}

// Connector listener wrapper to capture site url
var connectorListener = connector.listen();
function listen() {
    return function (req, res) {
        // Capture the url for the hosted application
        // We'll later need this url to create the checkout link
        var url = req.protocol + '://' + req.get('host');
        siteUrl.save(url);
        connectorListener(req, res);
    };
}

// Other wrapper functions
function beginDialog(address, dialogId, dialogArgs) {
    bot.beginDialog(address, dialogId, dialogArgs);
}

function sendMessage(message) {
    bot.send(message);
}

module.exports = {
    listen: listen,
    beginDialog: beginDialog,
    sendMessage: sendMessage
};
