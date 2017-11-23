var builder = require('botbuilder');

var lib = new builder.Library('redeem');
var Promise = require('bluebird');
var Store = require('./store');
const logger = require('./core/logger');
const serializeError = require('serialize-error');
const back_to_menu = require('./back-to-menu');
var mailSender = require('./core/mail-sender.js');
var consts = require('./core/const');
var hash = require('object-hash');
const chatbase = require('./core/chatbase');
const utils = require('./core/utils');
const dal = require('./core/dal');

// Helpers
function voucherAsAttachment(voucher, session) {
    try {
        return new builder.HeroCard()
        .title(voucher.title)
        .subtitle(voucher.description)
        .images([new builder.CardImage().url(voucher.imageUrl)])
        .buttons([
            // new builder.CardAction()
            //     .title(voucher.cta)
            //     .type('postBack')
            //     .value('https://www.bing.com/search?q=hotels+in+' + encodeURIComponent(voucher.points))
            builder.CardAction.imBack(session, getVoucherText(voucher), voucher.voucherId)
        ]);
    }
    catch (err) {
        logger.log.error('redeem: voucherAsAttachment error occurred', {error: serializeError(err), voucher: voucher});        
        throw err;
    }
}

function voucherAsClassic(voucher, session, builder) {
    try {
            return builder.CardAction.imBack(session, voucher.title, voucher.title);
    }
    catch (err) {
        logger.log.error('redeem: voucherAsClassic error occurred', {error: serializeError(err), voucher: voucher});        
        throw err;
    }
}

function getVoucherText(voucher) {
    // return 'voucher #' + voucher.voucherId + ': ' + voucher.title + ' on ' + voucher.store + ' for ' + voucher.cta;
    return voucher.voucherId;
}

let vouchersData;
let backToMenuText;

lib.dialog('/', [
    // Destination
    function (session) {
        try {
            backToMenuText = session.localizer.trygettext(session.preferredLocale(), 'backToMenu.multiple_choices_text', 'back-to-menu');
            // Async fetch
            Store
                .fetchVouchers()
                .then(function (vouchers) {
                    vouchersData = vouchers;
                    let message;
                    if (!utils.isCarouselSupported(session.message.source)) {
                        var simpleChoicesButtons = vouchers.map((voucher) => { return voucherAsClassic(voucher, session, builder); });
                        simpleChoicesButtons.push(builder.CardAction.imBack(session, backToMenuText, backToMenuText));

                        var voucherCard = new builder.HeroCard()
                            .title(session.gettext('redeem.select_voucher'))
                            .buttons(simpleChoicesButtons);
                        
                        message = new builder.Message(session).addAttachment(voucherCard);

                        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, 'Redeem Vouchers Selection - Simple', null, false, false);                        

                        builder.Prompts.text(session, message);                        
                    } else {
                        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('redeem.select_voucher'), null, false, false);                                                    
                        session.send('redeem.select_voucher');

                        message = new builder.Message()
                        .attachmentLayout(builder.AttachmentLayout.carousel)
                        .attachments(vouchers.map((voucher) => { return voucherAsAttachment(voucher, session); }));
    
                        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, 'Redeem Vouchers Selection - Carousel', null, false, false);

                        builder.Prompts.text(session, message);

                        // Getting back to menu option:
                        let backToMenuTitle = session.localizer.trygettext(session.preferredLocale(), 'backToMenu.multiple_choices_title', 'back-to-menu');
                        var cardActions = [builder.CardAction.imBack(session, backToMenuText, backToMenuText)];
                        
                        var card = new builder.HeroCard()
                            .title(backToMenuTitle) // TODO: Fix this as well
                            .buttons(cardActions);
                    
                        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, backToMenuText , null, false, false);            
                            
                        session.send(new builder.Message(session)
                            .addAttachment(card));
                    } 
                });
        }
        catch (err){
            session.say('redeem.general_error');
            logger.log.error('redeem: / dialog 1st function error occurred', {error: serializeError(err)});        
            session.endDialog();
            session.replaceDialog('/');
        }
    }, function (session, args) {
        try {
            
            if (args.response == backToMenuText) {
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, backToMenuText, false, false);
                
                session.conversationData.backState = true;
                session.endDialog();
                session.replaceDialog('/');
            }
            else {
                // look for the voucher:
                // var voucherId = args.response.split(':')[0].split('#')[1];
                var voucherId = args.response;
                var selectedVoucher;
                for (var i=0; i<vouchersData.length; i++) {
                    if (vouchersData[i].voucherId == voucherId || vouchersData[i].title == voucherId) {
                        selectedVoucher = vouchersData[i];
                        break;
                    }
                }
                if (!selectedVoucher) {
                    throw "voucher " + voucherId + " not found";
                }
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, 'Voucher Redeem Request', false, false);
                
                dal.getPointsToUser(session.userData.sender.user_id).then(points => {
                    session.userData.sender.points = points;

                    if (!session.userData.sender.points) {
                        session.userData.sender.points = consts.defaultStartPoints;
                    }
                    
                    if (session.userData.sender.points < selectedVoucher.points) {
                        // Not enough points
                        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('redeem.not_enough_points', session.userData.sender.points, selectedVoucher.points-session.userData.sender.points), null, false, false);                                                                   
                        session.say(session.gettext('redeem.not_enough_points', session.userData.sender.points, selectedVoucher.points-session.userData.sender.points));
                        back_to_menu.sendBackToMainMenu(session, builder);
                    } else if (!session.userData.sender.email || session.userData.sender.email.indexOf('@') < 0) {
                        // No email entered
                        session.say(session.gettext('redeem.no_details_filled'));
                        back_to_menu.sendBackToMainMenu(session, builder);
                    } else {
                        // Continue with the redeem process - send validation email
                        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('redeem.explanation'), null, false, false);                                                                                   
                        session.say('redeem.explanation');
                        mailSender.sendTemplateMail(consts.MAIL_TEMPLATE_REDEEM_CONFIRMATION, session.userData.sender.email, 
                                [{key: '%VOUCHER_ID%', value: selectedVoucher.voucherId},
                                {key: '%VOUCHER__EMAIL_TITLE%', value: selectedVoucher.emailTitle},
                                {key: '%VOUCHER_CTA%', value: selectedVoucher.cta},
                                {key: '%VOUCHER_IMAGE_URL%', value: selectedVoucher.imageUrl},
                                {key: '%REDEEM_CONFIRMATION_URL%', value: get_redeem_confirmation_url(selectedVoucher, session.userData.sender.user_id, session.userData.sender.email)},
                            ]).then(() => {
                            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('redeem.email_sent', session.userData.sender.email), null, false, false);                                                                                   
                            session.say(session.gettext('redeem.email_sent', session.userData.sender.email));
                            back_to_menu.sendBackToMainMenu(session, builder);
                            
                        }).catch(err => {
                            logger.log.error('redeem: / dialog 2nd function on mailSender.sendTemplateMail error', {error: serializeError(err)});
                            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('redeem.email_error'), null, false, false);                                                                                                       
                            session.say('redeem.email_error');
                            back_to_menu.sendBackToMainMenu(session, builder);
                            
                        });
                    }
                }).catch (err => {
                    session.say('redeem.general_error');
                    logger.log.error('redeem: error occurred dal.getPointsToUser', {error: serializeError(err)});
                    session.conversationData.backState = true;
                    session.endDialog();
                    session.replaceDialog('/');
                    
                });
            }
        }
        catch (err) {
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender.user_id, session.message.source, session.message.text, null, true, false);            
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('redeem.general_error'), null, false, false);                                                                                                                   
            session.say('redeem.general_error');
            logger.log.error('redeem: / dialog 2nd function error occurred', {error: serializeError(err)});        
            session.conversationData.backState = true;
            session.endDialog();
            session.replaceDialog('/');
        }
    }
]);

function get_redeem_confirmation_url(voucher, userId, userEmail) {
     
    var verificationCode = hash({voucherId: voucher.voucherId, userId: userId, email: userEmail});
    return process.env.SERVER_API_URL + 'confirm_voucher?vid=' + voucher.voucherId + '&uid=' + userId + '&userEmail=' + userEmail + '&code=' + verificationCode;
}

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};