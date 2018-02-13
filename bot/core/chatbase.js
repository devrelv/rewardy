'use strict';
const consts = require('./const');
const chatbase = require('@google/chatbase').setApiKey(process.env.CHATBASE_API_KEY);
const logger = require('./logger');
const serializeError = require('serialize-error');

const CHATBASE_TYPE_FROM_USER = 'user';
const CHATBASE_TYPE_FROM_BOT = 'agent';


function sendSingleMessage(type, userId, platform, message, intent, not_handled, feedback) {
    try {
        if (!userId) { 
            userId = 'unknown'; 
        } 
        let msg = chatbase.newMessage(process.env.CHATBASE_API_KEY, userId);
        if (type == CHATBASE_TYPE_FROM_BOT) {
            msg.setAsTypeAgent();
        } else {
            msg.setAsTypeUser();        
        }
        msg.setTimestamp(Date.now().toString());
        if (platform) {
            msg.setPlatform(platform)        
        } else {
            msg.setPlatform('unknown');
        }
        msg.setMessage(message);
        msg.setVersion(consts.BOT_VERSION);
        if (intent) {
            msg.setIntent(intent);
        } else if (!intent && not_handled) {
            msg.setAsNotHandled();
        }
        if (feedback) {
            msg.setAsFeedback();
        }
        
        msg.send().catch((err) => {
            logger.log.error('chatBase: sendSingleMessage promise error occurred', {error: serializeError(err)});
        });
    } catch (err) {
        logger.log.error('chatBase: sendSingleMessage error occurred', {error: serializeError(err)});        
    }
    
}

function sendMultipleMessages(arrayOfMessage) {
    try {
        if (Array.isArray(arrayOfMessage)) {
            let msgs = chatbase.newMessageSet();
            let now = Date.now().toString();
            for (let i=0; i<arrayOfMessage.length; i++) {
                try {
                    let msg = msgs.newMessage(process.env.CHATBASE_API_KEY, userId);
                    if (type == CHATBASE_TYPE_FROM_BOT) {
                        msg.setAsTypeAgent();
                    } else {
                        msg.setAsTypeUser();        
                    }
                    msg.setTimestamp(now);
                    if (platform) {
                        msg.setPlatform(platform)        
                    }
                    msg.setMessage(message);
                    msg.setVersion(consts.BOT_VERSION);
                    if (intent) {
                        msg.setIntent(intent);
                    } else if (!intent && not_handled) {
                        msg.setAsNotHandled();
                    }
                    if (feedback) {
                        msg.setAsFeedback();
                    }
                    
                } catch (err) {
                    logger.log.error('chatBase: sendMultipleMessages error occurred', {error: serializeError(err)});        
                }
            }
            msgs.sendMessageSet().catch((err) => {
                logger.log.error('chatBase: sendMultipleMessages promise error occurred', {error: serializeError(err)});
            });
        }
    } catch (err) {
        logger.log.error('chatBase: sendMultipleMessages error occurred', {error: serializeError(err)});        
    }
    
    
}

const BitlyClient = require('bitly');
const bitly = BitlyClient('f331500e9af349f1959450531739000225f84478');

function linkTrackingWrapUrl(url, platform) {
    return new Promise((resolve, reject)=> {
        platform = platform || 'unknown';
        let fullUrl = 'https://chatbase.com/r?api_key=' + process.env.CHATBASE_API_KEY + '&url=' + encodeURIComponent(url) + '&platform=' + platform;
        bitly.shorten(fullUrl).then(newUrl => {
            resolve(newUrl.data.url);
        }).catch(err => {
            logger.log.error('chatBase: linkTrackingWrapUrl error occurred', {error: serializeError(err)});                    
            resolve(fullUrl)
        })
    });
}

module.exports = {
    CHATBASE_TYPE_FROM_USER: CHATBASE_TYPE_FROM_USER,
    CHATBASE_TYPE_FROM_BOT: CHATBASE_TYPE_FROM_BOT,
    sendSingleMessage: sendSingleMessage,
    sendMultipleMessages: sendMultipleMessages,
    linkTrackingWrapUrl: linkTrackingWrapUrl
    
}