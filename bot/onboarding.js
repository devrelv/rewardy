var builder = require('botbuilder');

var lib = new builder.Library('onboarding');
var dal = require('./core/dal');
var consts = require('./core/const');
const chatbase = require('./core/chatbase');
var store = require('./store');
var _ = require('lodash');
const back_to_menu = require('./back-to-menu');
const mailSender = require('./core/mail-sender');
const serializeError = require('serialize-error');


function isValidResponse(args, validAnswers) {
    return args && validAnswers.indexOf(args.response)>-1;
}


lib.dialog('/', [
    function (session) {
        session.conversationData.backState = false;
        session.conversationData.onboarding = true;
        let card = new builder.HeroCard()
            .title(session.gettext('onboarding.into'))
            .buttons([builder.CardAction.imBack(session, session.gettext('onboarding.yes1'), session.gettext('onboarding.yes1')),
                    builder.CardAction.imBack(session, session.gettext('onboarding.yes2'), session.gettext('onboarding.yes2'))]);
    
        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('onboarding.into'), null, false, false);
        builder.Prompts.text(session, new builder.Message(session)
            .addAttachment(card));
    },
    function (session, args) {
        session.replaceDialog('show_stores', args);
    }, 
]);

let vouchers;
store.fetchVouchers().then(v => {vouchers = v;});
let stores = [];
let storesButtons = [];

lib.dialog('show_stores', [
    function (session, args) {
        if (isValidResponse(args, [])) {
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, args.response, null, false, false);
        }
        if (!session.conversationData.backState && !isValidResponse(args, [session.gettext('onboarding.yes1'), session.gettext('onboarding.yes2')])) {
            session.conversationData.backState = true;
            session.say('onboarding.use_quick_reply');
            session.replaceDialog('onboarding:/');
        } else {
            storesButtons = [];
            stores = [];
            _.forEach(vouchers).map(currentVoucher => {
                if (!stores.hasOwnProperty(currentVoucher.store)) {
                    stores[currentVoucher.store] = {};
                    stores[currentVoucher.store].actionDescription = currentVoucher.actionDescription;
                    stores[currentVoucher.store].vouchers = [];
                    storesButtons.push(builder.CardAction.imBack(session, currentVoucher.store, currentVoucher.store));
                }
                stores[currentVoucher.store].vouchers.push(currentVoucher);
            });
            
            //if (!session.conversationData.storeRequested) {
            //    storesButtons.push(builder.CardAction.imBack(session, session.gettext('onboarding.other_voucher'), session.gettext('onboarding.other_voucher')));                
            //}
            if (!session.conversationData.storeRequested && !session.conversationData.backState) {
                session.say('onboarding.choose_voucher_store');
            }
            session.conversationData.backState = false;
            
            let card = new builder.HeroCard()
            .title(session.gettext('onboarding.default_title'))
            .buttons(storesButtons);

            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('onboarding.choose_voucher_store'), null, false, false);
            builder.Prompts.text(session, new builder.Message(session)
                .addAttachment(card));
        }
    }, 
    function (session, args) {
        session.conversationData.backState = false;
        session.replaceDialog('store_selected', args);        
    }
]);


lib.dialog('store_selected', [
    function (session, args) {
        if (isValidResponse(args, [])) {
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, args.response, null, false, false);
        }
        if (!session.conversationData.backState && !isValidResponse(args, [session.gettext('onboarding.other_voucher')]) && !stores.hasOwnProperty(args.response)) {
            session.conversationData.backState = true;
            session.say('onboarding.use_quick_reply');
            session.replaceDialog('show_stores');
        } else {
            if (isValidResponse(args, [session.gettext('onboarding.other_voucher')])) {
                // Goto Other....
                session.conversationData.backState = false;            
                session.replaceDialog('get_new_store');
            } else {
                if (!session.conversationData.backState) {
                    session.userData.sender.favorite_store = args.response;                    

                    let voucherOptions = _.forEach(stores[session.userData.sender.favorite_store].vouchers).map(currentVoucher => {return currentVoucher.title});                
                    session.say(session.gettext('onboarding.great_voucher_selection', stores[session.userData.sender.favorite_store].actionDescription) + '\n\r' 
                                + session.gettext('onboarding.available_vouchers') + '\n\r💵 ' + voucherOptions.join('\n\r💵 '));
                }
                    
                let card = new builder.HeroCard()
                .title(session.gettext('onboarding.so_lets_start'))
                .buttons([builder.CardAction.imBack(session, session.gettext('onboarding.start_making_points'), session.gettext('onboarding.start_making_points'))]);
    
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('onboarding.so_lets_start'), null, false, false);
                builder.Prompts.text(session, new builder.Message(session)
                    .addAttachment(card));
                
            }            
        }
    }, 
    function (session, args) {
        session.conversationData.backState = false;
        session.replaceDialog('start_making_points', args);
    }
]);

lib.dialog('get_new_store', [
    function (session, args) {
        builder.Prompts.text(session, 'onboarding.get_new_store');
    },
    function (session, args) {
        session.conversationData.storeRequested = true;
        session.conversationData.backState = true;
        mailSender.sendTemplateMail(consts.MAIL_TEMPLATE_NEW_STORE_REQUEST, 'hello@rewardy.co', [{key: '%STORE_NAME%', value: args.response},
        {key: '%USER_DETAILS%', value: JSON.stringify(serializeError(session.userData.sender))}]).then(()=>{
            session.say('onboarding.store_sent_to_us');
            session.replaceDialog('show_stores');
        }).catch(err =>{
            session.say('onboarding.store_sent_to_us');
            // TODO: Add logger            
            session.replaceDialog('show_stores');
        });
    }
]);
lib.dialog('start_making_points', [
    function (session, args) {
        if (isValidResponse(args, [])) {
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, args.response, null, false, false);
        }
        if (!session.conversationData.backState && !isValidResponse(args, [session.gettext('onboarding.start_making_points')])) {
            session.conversationData.backState = true;
            session.say('onboarding.use_quick_reply');
            session.replaceDialog('store_selected');
        } else {
            if (!session.conversationData.backState) {
                session.say('onboarding.making_points_options');
            }
            session.conversationData.backState = false;
            
            let card = new builder.HeroCard()
            .title(session.gettext('onboarding.default_title'))
            .buttons([builder.CardAction.imBack(session, session.gettext('onboarding.invite_friends'), session.gettext('onboarding.invite_friends')),
                        builder.CardAction.imBack(session, session.gettext('onboarding.take_tasks'), session.gettext('onboarding.take_tasks')),
                        builder.CardAction.imBack(session, session.gettext('onboarding.not_now'), session.gettext('onboarding.not_now'))]);

            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('onboarding.making_points_options'), null, false, false);
            builder.Prompts.text(session, new builder.Message(session)
                .addAttachment(card));           
        }
    }, 
    function (session, args) {
        session.conversationData.backState = false;
        if (isValidResponse(args, [])) {
            chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_USER, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, args.response, null, false, false);
        }
        if (!isValidResponse(args, [session.gettext('onboarding.invite_friends'), session.gettext('onboarding.take_tasks'), session.gettext('onboarding.not_now')])) {
            session.conversationData.backState = true;
            session.say('onboarding.use_quick_reply');
            session.replaceDialog('start_making_points');
        } else {
            if (args.response == session.gettext('onboarding.invite_friends')) {
                session.replaceDialog('invite:/');
            } else if (args.response == session.gettext('onboarding.take_tasks')) {
                session.replaceDialog('get-free-credits:/');                
            } else {
                // return to main menu
                session.conversationData.backState = true;
                session.endDialog();        
            }          
        }
    }
]);

lib.dialog('back_from_task_or_invite', [
    function (session, args) {
        let card = new builder.HeroCard()
        .title(session.gettext('onboarding.and'))
        .buttons([builder.CardAction.imBack(session, session.gettext('onboarding.done'), session.gettext('onboarding.done'))]);

        chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, 'back_from_task_or_invite', null, false, false);
        builder.Prompts.text(session, new builder.Message(session)
            .addAttachment(card));          
    },
    function (session, args) {
        if (!isValidResponse(args, [session.gettext('onboarding.done')])) {
            session.say('onboarding.use_quick_reply');
            session.conversationData.backState = true;
            session.replaceDialog('back_from_task_or_invite');
        } else {
            session.conversationData.backState = false;
            // FOR TESTING: dal.getPointsToUser('75686970-ca9e-11e7-a970-e53fbb852519').then(points => {
            dal.getPointsToUser(session.userData.sender.user_id).then(points => {
                if (points > session.userData.sender.points) {
                    session.say('onboarding.well_done');
                } else {
                    session.userData.sender.points = points;
                    session.say('onboarding.it_will_take_time');
                }

                let card = new builder.HeroCard()
                .title(session.gettext('onboarding.back_to_menu_title'))
                .buttons([builder.CardAction.imBack(session, session.gettext('onboarding.back_to_menu_option'), session.gettext('onboarding.back_to_menu_option'))]);
    
                chatbase.sendSingleMessage(chatbase.CHATBASE_TYPE_FROM_BOT, session.userData.sender ? session.userData.sender.user_id : 'unknown', session.message.source, session.gettext('onboarding.back_to_menu_title'), null, false, false);
                builder.Prompts.text(session, new builder.Message(session)
                    .addAttachment(card));
            });
        }
        
    },
    function (session, args) {
        session.conversationData.backState = true;                    
        session.endDialog();
    }
]);


// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};