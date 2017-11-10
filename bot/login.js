var builder = require('botbuilder');

var lib = new builder.Library('login');
var validators = require('./core/validators');
var utils = require('./core/utils');
var dal = require('./core/dal');
var consts = require('./core/const');
var uuid = require('uuid');
const chatbase = require('./core/chatbase');


lib.dialog('/', [
    function (session) {
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('welcome_message') + '\n\r' + session.gettext('type_email_or_return'), null, false, false);                                                            
        session.send(session.gettext('welcome_message') + '\n\r' + session.gettext('type_email_or_return'));
        return session.beginDialog('email');
    },
    function (session, args) {
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.message.text, 'email identification', false, false);
        
        return session.endDialog();
    }
]);

// Email edit
lib.dialog('email', editOptionDialog(
    function (input) { return validators.EmailRegex.test(input); },
    'invalid_email_address',
    function (session, email) { 
        saveSenderSettingKey(session, 'email', email);
    }));

lib.dialog('userDetails', [
    function (session) {
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('confirm_mail_for_new_user', session.userData.sender.email), null, false, false);                                                                    
        builder.Prompts.confirm(session, session.gettext('confirm_mail_for_new_user', session.userData.sender.email));
    },
    function (session, args) {
        if (args.response) {
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.message.text, 'email confirmed', false, false);
        
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('get_name'), null, false, false);                                                                            
            builder.Prompts.text(session, 'get_name');            
        } else {
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.message.text, 'email not confirmed', false, false);
            
            delete session.userData.sender.email;
            session.replaceDialog('/');            
        }
    },
    function (session, result) {
        session.userData.sender.name = result.response;
        session.userData.sender.user_id = uuid.v1();
        session.userData.sender.language = session.userData.sender.language || consts.defaultUserLanguage;
        session.userData.sender.points = consts.defaultStartPoints;
        session.userData.sender.platforms = [session.message.source];
        //saveSenderSettingFull(session, session.userData.sender); 
        dal.saveNewUserToDatabase(session.userData.sender);
        // Getting more info from user if needed using builder.Prompt.text(session, 'xxxxx');
        session.endDialogWithResult({ updated: true });
    }
]);


function saveSenderSettingKey(session, key, value) {
    session.userData.sender = session.userData.sender || {};
    session.userData.sender[key] = value;
}

function saveSenderSettingFull(session, userProfile) {
    session.userData.sender = userProfile;
}

function editOptionDialog(validationFunc, invalidMessage, saveFunc) {
    return new builder.SimpleDialog(function (session, args, next) {
        // check dialog was just forwarded
        if (!session.dialogData.loop) {
            session.dialogData.loop = true;
            session.sendBatch();
            return;
        }

        if (session.userData.sender && session.userData.sender.email) {
            session.endDialogWithResult({ updated: true });
            return;
        }

        if (!validationFunc(session.message.text)) {
            // invalid
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, invalidMessage, null, false, false);                                                                                        
            session.send(invalidMessage);
        } else {
            // save
            saveFunc(session, session.message.text);
            dal.getBotUserByEmail(session.message.text).then(userDataFromDB => {
                if (!userDataFromDB) {
                    saveSenderSettingKey(session, 'email', session.message.text);
                    
                    // Ask more questions about the user and save to DB + userData.sender
                    session.beginDialog('userDetails');
                } else {
                    if (userDataFromDB.platforms.indexOf(session.message.source) == -1) {
                        userDataFromDB.platforms.push(session.message.source);
                        dal.updateUserPlatforms(userDataFromDB.user_id, userDataFromDB.platforms);
                    }
                    session.userData.sender = userDataFromDB;
                    chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('welcome_back', session.userData.sender.name) , null, false, false);                                                                                        
            
                    session.send(session.gettext('welcome_back', session.userData.sender.name));
                    session.endDialogWithResult({ updated: true });
                }
            
            }).catch(err => {
                session.send('error_occured_try_again');
                session.endDialogWithResult({ updated: false });
            });
          
        }
    });
}

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};