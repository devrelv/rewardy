// Singleton Const
module.exports = {
    defaultUserLanguage: 'en',
    actionBodyAbort : 'Abort',
    actionBodyYes : 'Yes',
    actionBodyNo : 'No',
    actionBodyOtherReferralCode : 'OtherReferralCode',
    actionBodyGetReferralMessage : 'GetReferralMessage',
    actionBodyCheckCredits : 'CheckCredits',
    actionBodyRedeemCredits : 'RedeemCredits',
    actionBodyInviteFriends : 'InviteFriends',
    actionBodyGetCredits : 'GetCredits',
    actionBodyGetDailyBonus : 'GetDailyBonus',
    defaultUserLanguage : 'en',
    botUser_source_friendReferral: 'friend',
    
    DEVICE_TYPE_ANDROID : 'Android',
    DEVICE_TYPE_APPLE : 'iOS',
    DEVICE_TYPE_DESKTOP : 'Desktop',
   
    SPONSOR_PAY_APP_ID_DESKTOP : '104180',
    SPONSOR_PAY_APP_ID_APPLE : '104295',
    SPONSOR_PAY_APP_ID_ANDROID : '104296',

    defaultStartPoints: 10,
    referralBonusPoints: 20,
    minimumCompletedOffersForReferalToCount: 1,
    

    MAIL_TEMPLATE_WELCOME: 'welcome_mail',
    MAIL_TEMPLATE_REDEEM_REQUEST: 'redeem_request',
    MAIL_TEMPLATE_HELP_QUESTION: 'help_question',
    MAIL_TEMPLATE_REDEEM_CONFIRMATION: 'redeem_confirmation',
    MAIL_TEMPLATE_NEW_STORE_REQUEST: 'new_store_request',

    PROACTIVE_MESSAGES_REFERRAL_BONUS: 0,
    PROACTIVE_MESSAGES_REFERRAL_JOINED: 1,
    PROACTIVE_MESSAGES_OFFER_COMPLETED: 2,
    PROACTIVE_MESSAGES_DAILY_BONUS: 3,
    PROACTIVE_MESSAGES_INACTIVITY_7DAYS: 4,
    PROACTIVE_MESSAGES_CUSTOM: 5,

    PROACTIVE_MESSAGES_TYPE_MESSAGE: 0,
    PROACTIVE_MESSAGES_TYPE_DIALOG: 1,

    botFramework_Channels : {facebook: 'facebook', skype: 'skype', telegram: 'telegram', kik: 'kik', email: 'email',
        slack: 'slack', groupme: 'groupme',sms: 'sms', emulator: 'emulator',directline: 'directline',console: 'console'}, // session.message.source
    
    BOT_VERSION: '1.0.0',
};