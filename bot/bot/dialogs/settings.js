var util = require('util');
var builder = require('botbuilder');
var validators = require('../validators');
var utils = require('../utils');

var SettingChoice = {
    Email: 'edit_email',
    Phone: 'edit_phone',
    Addresses: 'edit_addresses',
    Cancel: 'cancel'
};

var lib = new builder.Library('settings');
lib.dialog('/', [
    // Display options
    function (session) {
        builder.Prompts.choice(session, 'settings_intro', [
            session.gettext(SettingChoice.Email),
            session.gettext(SettingChoice.Phone),
            session.gettext(SettingChoice.Addresses),
            session.gettext(SettingChoice.Cancel)
        ]);
    },
    // Trigger option edit
    function (session, args, next) {
        args = args || {};
        var response = args.response || {};
        var option = response.entity;
        var promptMessage;
        switch (option) {
            case session.gettext(SettingChoice.Email):
                promptMessage = 'type_email_or_return';
                if (session.userData.sender && session.userData.sender.email) {
                    promptMessage = session.gettext('your_current_email', session.userData.sender.email);
                }
                session.send(promptMessage);
                return session.beginDialog('email');

            case session.gettext(SettingChoice.Phone):
                promptMessage = 'type_phone_or_return';
                if (session.userData.sender && session.userData.sender.phoneNumber) {
                    promptMessage = session.gettext('your_current_phone', session.userData.sender.phoneNumber);
                }
                session.send(promptMessage);
                return session.beginDialog('phone');

            case session.gettext(SettingChoice.Addresses):
                return session.beginDialog('addresses');

            case session.gettext(SettingChoice.Cancel):
                return session.endDialog();
        }
    },
    // Setting updated/cancelled
    function (session, args) {
        args = args || {};
        var text = args.updated ? 'setting_updated' : 'setting_not_updated';
        session.send(text);
        session.replaceDialog('/');
    }
]).reloadAction('restart', null, { matches: /^back|b/i });                               // restart menu options when 'B' or 'Back' is received

// Email edit
lib.dialog('email', editOptionDialog(
    function (input) { return validators.EmailRegex.test(input); },
    'invalid_email_address',
    function (session, email) { saveSenderSetting(session, 'email', email); }));

// Phone Number edit
lib.dialog('phone', editOptionDialog(
    function (input) { return validators.PhoneRegex.test(input); },
    'invalid_phone_number',
    function (session, phone) { saveSenderSetting(session, 'phoneNumber', phone); }));

function saveSenderSetting(session, name, value) {
    session.userData.sender = session.userData.sender || {};
    session.userData.sender[name] = value;
}

function editOptionDialog(validationFunc, invalidMessage, saveFunc) {
    return new builder.SimpleDialog(function (session, args, next) {
        // check dialog was just forwarded
        if (!session.dialogData.loop) {
            session.dialogData.loop = true;
            session.sendBatch();
            return;
        }

        if (!validationFunc(session.message.text)) {
            // invalid
            session.send(invalidMessage);
        } else {
            // save
            saveFunc(session, session.message.text);
            session.endDialogWithResult({ updated: true });
        }
    });
}

function createAddressCard(session, buttonTitle, address) {
    return new builder.HeroCard(session)
        .title(buttonTitle)
        .subtitle(address)
        .buttons([
            builder.CardAction.imBack(session, buttonTitle, buttonTitle)
        ]);
}

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};