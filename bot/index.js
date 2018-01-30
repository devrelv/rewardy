var builder = require('botbuilder');
var siteUrl = require('./core/site-url');
var dal = require('./core/dal');
var consts = require('./core/const');
var mailSender = require('./core/mail-sender.js');
const logger = require('./core/logger');
const serializeError = require('serialize-error');
const chatbase = require('./core/chatbase');
var uuid = require('uuid');

logger.log.info('Bot started on MICROSOFT_APP_ID ' + process.env.MICROSOFT_APP_ID);

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Mail sending tests
// mailSender.sendCustomMail('yaari.tal@gmail.com', 'Test Mail', 'test mail', '<b>Test</b> Mail');
// mailSender.sendTemplateMail(consts.MAIL_TEMPLATE_WELCOME, 'yaari.tal@gmail.com', [{key: '%NAME%', value: 'Tal'}]);

// Welcome Dialog
var MainOptions = {
    CheckCredit: 'keyboard.root.checkCredit',
    Redeem: 'keyboard.root.redeem',
    InviteFriends: 'keyboard.root.inviteFriends',
    GetCredit: 'keyboard.root.getCredit',
    FillEmail: 'keyboard.root.fillEmail',
    Help: 'keyboard.root.help'
};
function createRootButtons(session, builder) {
    var buttons = [
        builder.CardAction.imBack(session, session.gettext(MainOptions.CheckCredit), MainOptions.CheckCredit),
        builder.CardAction.imBack(session, session.gettext(MainOptions.GetCredit), MainOptions.GetCredit),
        builder.CardAction.imBack(session, session.gettext(MainOptions.InviteFriends), MainOptions.InviteFriends),
        builder.CardAction.imBack(session, session.gettext(MainOptions.Redeem), MainOptions.Redeem),
        builder.CardAction.imBack(session, session.gettext(MainOptions.Help), MainOptions.Help)];
    if (!isUserHasEmail(session)) {
        buttons.push(builder.CardAction.imBack(session, session.gettext(MainOptions.FillEmail), MainOptions.FillEmail));
    }

    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, 'Main Menu Options', null, false, false);    
    return buttons;
}

function isUserHasEmail(session) {
    return session.userData.sender && session.userData.sender.email.indexOf('@')>-1;
}

function sendRootMenu(session, builder) {
    var card = new builder.HeroCard()
        .title(session.gettext('main.root.title'))
        .buttons(createRootButtons(session, builder));

    session.send(new builder.Message(session)
        .addAttachment(card));
}

var bot = new builder.UniversalBot(connector, [
    function (session, args, next) {
        // User just logged in
        if (!session.userData.sender) {
            session.userData.sender = {};
            session.userData.sender.name = '';
            session.userData.sender.user_id = uuid.v1();
            session.userData.sender.language = session.userData.sender.language || consts.defaultUserLanguage;
            session.userData.sender.points = consts.defaultStartPoints;
            session.userData.sender.platforms = [session.message.source];
            session.userData.sender.email = session.userData.sender.user_id;
            session.userData.sender.proactive_address = session.message.address;

            dal.saveNewUserToDatabase(session.userData.sender);
            session.send(session.gettext('welcome_new_user_message'));

            if (session.message.text.length > 0) {
                session.message.text = "";
            }
            return session.beginDialog('onboarding:/');
            
        } else {
            session.conversationData.onboarding = false;
            return next();
        }
    },
    function (session, args, next) {
        try {
            if (session.message.text == 'clear my data bitch') { // TODO: Bug - the clear data creates a LOOP
                session.userData = {}; 
                session.privateConversationData = {};
                session.conversationData = {};
                session.say('DONE');
                return session.replaceDialog('/');
            } else if (localizedRegex(session, [MainOptions.Redeem]).test(session.message.text)) {
                // chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Redeem Flow', false, false);
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Redeem Flow', false, false);
                // Redeem flow
                return session.beginDialog('redeem:/');
            } else if (localizedRegex(session, [MainOptions.CheckCredit]).test(session.message.text)) {
                // Check Credits flow
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Check Credits Flow', false, false);
                return session.beginDialog('check-credits:/');            
            } else if (localizedRegex(session, [MainOptions.GetCredit]).test(session.message.text)) {
                // Get Free Credits flow
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Get Free Credits Flow', false, false);
                return session.beginDialog('get-free-credits:/');            
            } else if (localizedRegex(session, [MainOptions.InviteFriends]).test(session.message.text)) {
                // Invite Friends flow
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Invite Friends Flow', false, false);
                return session.beginDialog('invite:/');            
            } else if (localizedRegex(session, [MainOptions.Help]).test(session.message.text)) {
                // Help flow
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Help Flow', false, false);
                return session.beginDialog('help:/');
            } else if (localizedRegex(session, [MainOptions.FillEmail]).test(session.message.text)) {
                // Fill User Details
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Goto Fill Details Flow', false, false);
                return session.beginDialog('fill-details:/');
            } else if (session.message.text.length > 0 && !args.childId && args.childId != 'fill-details:/') {
                if (session.conversationData.backState) {
                    session.conversationData.backState = false;
                    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Get Back To Menu', false, false);                    
                } else {
                     // User typed something that we can't understand
                     session.say('unknown_user_command');
                     chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, null, true, false);   
                }
            }
    
            var welcomeCard = new builder.HeroCard(session)
                .title('keyboard.root.title')
                .buttons(createRootButtons(session, builder));
    
            session.send(new builder.Message(session)
                .addAttachment(welcomeCard));
        }
        catch (err) {
            logger.log.error('index: builder.UniversalBot error occurred', {error: serializeError(err)});
            throw err;            
        }
    }
]);


 

// Enable Conversation Data persistence
bot.set('persistConversationData', true);

// Set default locale
bot.set('localizerSettings', {
    botLocalePath: './bot/locale',
    defaultLocale: 'en'
});

// Sub-Dialogs
bot.library(require('./help').createLibrary());
bot.library(require('./fill-details').createLibrary());
bot.library(require('./redeem').createLibrary());
bot.library(require('./check-credits').createLibrary());
bot.library(require('./get-free-credits').createLibrary());
bot.library(require('./invite').createLibrary());
bot.library(require('./help').createLibrary());
bot.library(require('./onboarding').createLibrary());
bot.library(require('./proactive-dialogs').createLibrary());

// Validators
bot.library(require('./core/validators').createLibrary());

// Send welcome when conversation with bot is started, by initiating the root dialog
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        logger.log.info('conversation started', {members: message.membersAdded});
        
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, '/');
            }
        });
    }
});

bot.on('contactRelationUpdate', function (data) {
    bot.beginDialog(data.address, '/');
});


bot.on('ping', function (data) {
    bot.beginDialog(data.address, '/');
});


bot.on('event', function (data) {
    bot.beginDialog(data.address, '/');
});


bot.on('invoke', function (data) {
    bot.beginDialog(data.address, '/');
});

bot.on('messageReaction', function (data) {
    bot.beginDialog(data.address, '/');
});





// Cache of localized regex to match selection from main options
var LocalizedRegexCache = {};
function localizedRegex(session, localeKeys) {
    try {
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
    catch (err) {
        logger.log.error('index: localizedRegex error occurred', {error: serializeError(err)});
        throw err;        
    }
    
}

// Connector listener wrapper to capture site url
var connectorListener = connector.listen();
function listen() {
    return function (req, res) {
        // Capture the url for the hosted application
        var url = req.protocol + '://' + req.get('host');
        siteUrl.save(url);
        connectorListener(req, res);
    };
}

let proactiveMessages = require('./core/proactive_messages');
function send_proactive_message(address, userId, messageId, messageData) {
    return new Promise((resolve, reject) => {
        try {
            address = JSON.parse(address);
            messageData = JSON.parse(messageData);

            let messageObj = proactiveMessages.getMessageToSend(address, messageId, messageData);
            
            if (messageObj.type == consts.PROACTIVE_MESSAGES_TYPE_MESSAGE) {
                let msg = new builder.Message().address(address);
                msg.text(messageObj.message);
                msg.textLocale('en-US');
                bot.send(msg);
                resolve();
            } else if (messageObj.type == consts.PROACTIVE_MESSAGES_TYPE_DIALOG) {            
                bot.beginDialog(address, messageObj.message, messageData, (err) => {
                    if (err) {
                        logger.log.error('error on send_proactive_message(bot.beginDialog)', {error: serializeError(err)});                        
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
        } catch (err) {
            logger.log.error('error on send_proactive_message', {error: serializeError(err)});
            reject(err);
        }
    });
}

function old_broadcastAllUsers(message) {
    dal.getAllBotUsers().then(users => {
        logger.log.info('starting broadcastAllUsers - ' + users.length + ' users found');
        for (let i=0; i<users.length; i++) {
            try {
                send_proactive_message(JSON.stringify(users[i].proactive_address), users[i].user_id, consts.PROACTIVE_MESSAGES_CUSTOM, JSON.stringify({message: message}));
                logger.log.info('message sent to user' + users[i].user_id);
            } catch (err) {
                logger.log.error('error on broadcastAllUsers for user ' + users[i].user_id, {error: serializeError(err)});
            }            
        }
        logger.log.info('finished broadcastAllUsers users');
        
    });
}

function broadcastAllUsers(messageId) {
    return new Promise((resolve, reject) => {        
        try {
            dal.getBroadcastMessage(messageId).then(message => {
                dal.getAllBotUsersForBroadcastMessage(messageId).then(users => {
                    logger.log.info(`starting broadcastAllUsers - ${users.length} users found, messageId is ${messageId}, max batch is ${message.max_batch}`);
                    let numOfSuccess = 0;
                    
                    promiseFor(function(i) {
                        // The condition
                        return  (numOfSuccess<message.max_batch && i < users.length); 
                    }, function(i) {
                        // inside the for
                        return new Promise((resolve, reject) => {
                            send_proactive_message(JSON.stringify(users[i].proactive_address), users[i].user_id, consts.PROACTIVE_MESSAGES_CUSTOM, JSON.stringify({message: message.content}))
                            .then(()=> {
                                logger.log.info('message sent to user ' + users[i].user_id);                    
                                numOfSuccess++;
                                if (!users[i].broadcast_messages_received) {
                                    users[i].broadcast_messages_received = [];
                                }
                                users[i].broadcast_messages_received.push(messageId);
                                dal.updateUserBroadcastMessagesReceived(users[i]).then(()=>{
                                    logger.log.info('user ' + users[i].user_id + ' updated');
                                    resolve();
                                }).catch(err=> {
                                logger.log.error('error on broadcastAllUsers (on dal.updateUserBroadcastMessagesReceived) cant update user ' + users[i].user_id, {error: serializeError(err)});                    
                                reject(err);
                            });
                            }).catch(err => {
                                logger.log.error('error on broadcastAllUsers (on send_proactive_message.catch) cant send to ' + users[i].user_id, {error: serializeError(err)});
                                reject(err);
                            });
                        }).then(()=>{
                            return ++i;
                        }).catch(err=>{
                            logger.log.error('broadcastAllUsers: error in loop for user ' + users[i].user_id, {error: serializeError(err)});
                            return ++i;
                        });
                    }, 0).then(()=> {
                        // After the for
                        message.received_users_count += numOfSuccess;
                        dal.updateBroadcastMessageUsersCount(message).then(()=>{
                            logger.log.info('function done, received_users_count updated');
                            resolve();
                        }).catch(err=> {
                            logger.log.error('error on broadcastAllUsers (on dal.updateBroadcastMessageUsersCount) cant update UsersCount', {error: serializeError(err)});
                            reject(err);
                        });
                    }).catch(err => {
                        logger.log.error('broadcastAllUsers: promiseFor error occured', {error: serializeError(err)});
                        reject(err);
                    });
                })
            })
        } catch (err) {
            logger.log.error('unknown error on broadcastAllUsers', {error: serializeError(err)});                    
            reject(err);
        }
    });    
}

let promiseFor = function(condition, action, value) {
    if (!condition(value)) return value;
    return action(value).then(promiseFor.bind(null, condition, action));
};

// Other wrapper functions
function beginDialog(address, dialogId, dialogArgs) {
    bot.beginDialog(address, dialogId, dialogArgs);
}

function sendMessage(message) {
    bot.send(message);
}

function connect(channelId, connector) {
    bot.connector(channelId, connector);
}

module.exports = {
    connect: connect,
    listen: listen,
    beginDialog: beginDialog,
    sendMessage: sendMessage,
    send_proactive_message: send_proactive_message,
    broadcastAllUsers: broadcastAllUsers,
    old_broadcastAllUsers: old_broadcastAllUsers
};
