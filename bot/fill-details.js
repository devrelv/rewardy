var builder = require('botbuilder');

var lib = new builder.Library('fill-details');
var validators = require('./core/validators');
var utils = require('./core/utils');
var dal = require('./core/dal');
var consts = require('./core/const');
var uuid = require('uuid');
const chatbase = require('./core/chatbase');


lib.dialog('/', [
    function (session) {
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('fill-details.explanation') + '\n\r' + session.gettext('type_email_or_return'), null, false, false);                                                            
        builder.Prompts.text(session, session.gettext('fill-details.explanation') + '\n\r' + session.gettext('type_email_or_return'));
    },
    function (session, args) {
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.message.text, 'email identification', false, false);
        
        session.replaceDialog('email', args);        
    }
]);

let userEmail;
lib.dialog('email', [
    function (session, args) {
        if (args.response && (['cancel', 'no', 'quit', 'back'].indexOf(args.response.toLowerCase().trim()) > -1)) {
            // User asked to quit
            session.send(session.gettext('fill-details.user_requested_to_go_back'));
            session.conversationData.backState = true;
            session.endDialog();
            session.replaceDialog('/');
        } else {
            if (!validators.EmailRegex.test(args.response)) {
                // invalid email address
                builder.Prompts.text(session, session.gettext('invalid_email_address') + '\n\r' + session.gettext('type_email_or_return'));
            } else {
                // Valid email address
                userEmail = args.response;
                session.replaceDialog('userDetails'); // getting user name
                
                /* We are not supporting merging users from different platforms
                    In every platform the user will have its own points (email is not unique)
                // Check if email exists in the DB
                dal.getBotUserByEmail(args.response).then(botUserFromDb => {
                    // if email exists, ask to merge
                    if (botUserFromDb) {
                        builder.Prompts.confirm(session, 'Email already exists for ' + botUserFromDb.name + ' on ' + botUserFromDb.platforms.join(',') + '\n\rAre you sure that ' + session.userData.sender.email + ' is your email?'); // TODO: Locale
                    } else {
                        // email does not exists - continue getting user details
                        session.replaceDialog('userDetails');
                    }

                }).catch(err => {

                });*/

            }
        }
    },
    function (session, args, next) {
        session.replaceDialog('email', args);        
    }
]);

lib.dialog('userDetails', [
    function (session) {
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('fill-details.confirm_email_address', session.userData.sender.email), null, false, false);                                                                    
        builder.Prompts.confirm(session, session.gettext('fill-details.confirm_email_address', userEmail));
    },
    function (session, args) {
        if (args.response) {
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.message.text, 'email confirmed', false, false);
        
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('get_name'), null, false, false);                                                                            
            builder.Prompts.text(session, 'fill-details.get_name');            
        } else {
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.message.text, 'email not confirmed', false, false);
            
            session.replaceDialog('fill-details:/');            
        }
    },
    function (session, result) {
        dal.getInvitationByInvitedEmail(userEmail).then((invitationDetails)=>{
            if (invitationDetails && !invitationDetails.invitation_completed) {
                Promise.all(
                    [dal.markInvitationAsCompleted(invitationDetails.inviting_user_id, invitationDetails.invited_email),
                    dal.updateUserSource(session.userData.sender.user_id, {type: consts.botUser_source_friendReferral, id: invitationDetails.inviting_user_id })]).then (()=> {
                        dal.updateUserDetails(session.userData.sender.user_id, userEmail, result.response).then(()=> {
                            dal.getBotUserById(invitationDetails.inviting_user_id).then(invitingUser => {
                                var index = require('./index');
                                var proactiveMessageData = {friendName:  result.response,num_of_tasks_for_referral: consts.minimumCompletedOffersForReferalToCount};
                                index.send_proactive_message(JSON.stringify(invitingUser.proactive_address), invitingUser.user_id, consts.PROACTIVE_MESSAGES_REFERRAL_JOINED, JSON.stringify(proactiveMessageData));
                            });
                            detailsCompletedSuccess(session, userEmail, result.response);
                            
                        }).catch(err=>{
                            detailsCompletedFail(session, err);
                        });
                    })
            } else {
                dal.updateUserDetails(session.userData.sender.user_id, userEmail, result.response).then(()=> {
                    detailsCompletedSuccess(session, userEmail, result.response);
                }).catch(err=>{
                    detailsCompletedFail(session, err);
                });

            }

           
        }).catch(err=>{
            detailsCompletedFail(session, err);
        });
       
    }
]);

function detailsCompletedSuccess(session, userEmail, userName) {
    session.userData.sender = session.userData.sender || {};
    session.userData.sender.email = userEmail;
    session.userData.sender.name = userName;

    
    session.send(session.gettext('fill-details.success'));
    session.conversationData.backState = true;
    session.endDialog();
    session.replaceDialog('/');
}

function detailsCompletedFail(session, err) {
    logger.log.error('fill-details: dal.updateUserDetails error', {error: serializeError(err)});                    
    session.send(session.gettext('fill-details.error'));
    session.conversationData.backState = true;
    session.endDialog();
    session.replaceDialog('/');
}

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};