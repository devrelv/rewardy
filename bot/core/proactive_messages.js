'use strict';
const consts = require('./const');
const logger = require('./logger');
const serializeError = require('serialize-error');

// TODO: Integrate with locale some how
let messagesArray = [];
function initArray(session)  {    
    messagesArray[consts.PROACTIVE_MESSAGES_REFERRAL_BONUS] = {};
    //messagesArray[consts.PROACTIVE_MESSAGES_REFERRAL_BONUS].type = consts.PROACTIVE_MESSAGES_TYPE_MESSAGE;
    //messagesArray[consts.PROACTIVE_MESSAGES_REFERRAL_BONUS].message = 'Christmas came early this year 🎉! \n\rYou just received %REFERRAL_POINTS% points referral bonus for introducing %FRIEND_NAME% to Rewardy.\n\rInvite friends to get even more points'
    messagesArray[consts.PROACTIVE_MESSAGES_REFERRAL_BONUS].type = consts.PROACTIVE_MESSAGES_TYPE_DIALOG;
    messagesArray[consts.PROACTIVE_MESSAGES_REFERRAL_BONUS].message = 'proactive-dialogs:referral_bonus';
    messagesArray[consts.PROACTIVE_MESSAGES_REFERRAL_JOINED] = {};
    messagesArray[consts.PROACTIVE_MESSAGES_REFERRAL_JOINED].type = consts.PROACTIVE_MESSAGES_TYPE_DIALOG;
    messagesArray[consts.PROACTIVE_MESSAGES_REFERRAL_JOINED].message = 'proactive-dialogs:referral_joined';
    messagesArray[consts.PROACTIVE_MESSAGES_DAILY_BONUS] = {};
    messagesArray[consts.PROACTIVE_MESSAGES_DAILY_BONUS].type = consts.PROACTIVE_MESSAGES_TYPE_DIALOG;
    messagesArray[consts.PROACTIVE_MESSAGES_DAILY_BONUS].message = 'proactive-dialogs:daily_bonus';
    messagesArray[consts.PROACTIVE_MESSAGES_OFFER_COMPLETED] = {};
    messagesArray[consts.PROACTIVE_MESSAGES_OFFER_COMPLETED].type = consts.PROACTIVE_MESSAGES_TYPE_DIALOG;
    messagesArray[consts.PROACTIVE_MESSAGES_OFFER_COMPLETED].message = 'proactive-dialogs:offer_completed';
    messagesArray[consts.PROACTIVE_MESSAGES_INACTIVITY_7DAYS] = {};
    messagesArray[consts.PROACTIVE_MESSAGES_INACTIVITY_7DAYS].type = consts.PROACTIVE_MESSAGES_TYPE_DIALOG;
    messagesArray[consts.PROACTIVE_MESSAGES_INACTIVITY_7DAYS].message = 'proactive-dialogs:inactivity_7days';
    
    
}

function getMessageToSend(session, messageId, messageData) {
    if (messagesArray.length == 0) {
        initArray(session);
    }
    let returnedMessage = messagesArray[messageId];
    if (returnedMessage.type == consts.PROACTIVE_MESSAGES_TYPE_MESSAGE) {
        for (let paramName in messageData) {
            if (messageData.hasOwnProperty(paramName)) {            
                returnedMessage.message = returnedMessage.message.replace(new RegExp('%'+paramName+'%', 'g'), messageData[paramName]);
            }
        }
    }
    
    return returnedMessage;
}

module.exports = {
    getMessageToSend: getMessageToSend,
};