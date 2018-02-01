// Singleton Data Access Layer
// This code run once - on load:
var mongoose = require('mongoose');
var consts = require('./const')
const logger = require('./logger');
const serializeError = require('serialize-error');

// const mongodbOptions = {
//     server: {
//         socketOptions: {
//             keepAlive: 300000,
//             connectTimeoutMS: 30000
//         }
//     },
//     replset: {
//         socketOptions: {
//             keepAlive: 300000,
//             connectTimeoutMS: 30000
//         }
//     },
//     useMongoClient: true
// };

logger.log.info('####### connecting to the database #######');
// mongoose.connect(process.env.MONGO_CONNECTION_STRING, mongodbOptions);
mongoose.Promise = require('bluebird');
mongoose.connect(process.env.MONGO_CONNECTION_STRING, {useMongoClient: true}).then(
    ()=>{
    logger.log.info('dal: connected to database');        
    }
).catch(err => {
    logger.log.error('dal: mongoose.connect error occurred', {error: serializeError(err)});
    setTimeout(() => {throw err;}); // The setTimeout is a trick to enable the throw err
});

// Data Model
var User = mongoose.model('User', { name: String });

let Schema = mongoose.Schema;

let BotUserSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String // email is not unique because we allow the same email to be in different platforms
    },
    name: {
        type: String,
        required: false
    },
    language: {
        type: String,
        required: true,
        default: consts.defaultUserLanguage,
    },
    points: {
        type: Number,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now,
        required: true
    },
    last_daily_bonus: {
        type: Date,
        default: Date.now
    },
    source: {
        type: {
            type: String,
            required: false,
            default: ''
        }, 
        id: {
            type: String,
            required: false,
            default: ''
        },
        additional_data: {
            type: Schema.Types.Mixed,
            required: false
        }
    },
    platforms: {
        type: Array,
        default: []
    },
    proactive_address: {
        type: Schema.Types.Mixed
    },
    broadcast_messages_received: {
        type: Array,
        default: []
    }
});

let BotUser = mongoose.model('BotUser', BotUserSchema);

let DeviceUserSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        unique: true
    },
    type: { 
        type: String, 
        default: consts.DEVICE_TYPE_DESKTOP,
        required: true
    }
});

let DeviceUser = mongoose.model('DeviceUser', DeviceUserSchema);

let ReferralUserSchema = new Schema({
    referrer: {
        type: String,
        required: true
    },
    referred: {
        type: String,
        required: true
    }
});

let ReferralUser = mongoose.model('ReferralUserSchema', ReferralUserSchema);

let InvitationSchema = new Schema({
    inviting_user_id: {
        type: String,
        required: true
    },
    invited_email: {
        type: String,
        required: true
    },
    invitation_completed: {
        type: Boolean,
        default: 0,
        required: true
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    }
});
let Invitation = mongoose.model('Invitation', InvitationSchema);

let BroadcastMessageSchema = new Schema({
    message_id: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    max_batch: {
        type: Number,
        default: 100,
        required: true
    },
    received_users_count: {
        type: Number,
        required: false,
        default: 0
    }
});
let BroadcastMessage = mongoose.model('BroadcastMessage', BroadcastMessageSchema);



// Access Functions
// function saveUsername(username) {
// 	var currentUser = new User({ name: username });
//     currentUser.save(function (err) {
//         if (err) {
//         console.log(err);
//         } else {
//         console.log('User saved to db');
//         }
//     });

//     return;
// }

function saveNewUserToDatabase(userDetails, language) {
    let newBotUser = new BotUser({
        user_id: userDetails.user_id,
        email: userDetails.email,
        name: userDetails.name,
        points: userDetails.points,
        language: userDetails.language || consts.defaultUserLanguage,
        platforms: userDetails.platforms,
        proactive_address: userDetails.proactive_address
    });

    newBotUser.save(function(err) {
        if (err) {
            logger.log.error('dal: saveNewUserToDatabase newBotUser.save error occurred', {error: serializeError(err), newBotUser: newBotUser});
        }
    });
}

function saveDeviceUserToDatabase(userId, deviceType) {
    let newDeviceUser = new DeviceUser({
        user_id: userId,
        type: deviceType
    });

    newDeviceUser.save(function(err) {
        if (err) {
            logger.log.error('dal: saveDeviceUserToDatabase newDeviceUser.save error occurred', {error: serializeError(err), newDeviceUser: newDeviceUser, userId: userId, deviceType: deviceType});
        }
    });
}

function updateUserPlatforms(userId, platforms) {
    return new Promise((resolve, reject) => {        
        try {
            BotUser.update({user_id: userId}, {$set: {platforms: platforms}}, (err, res) => {
                if (err) {
                    logger.log.error('dal: updateUserPlatforms.update error', {error: serializeError(err), user_id: userId, platforms: platforms});                        
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (err) {
            logger.log.error('dal: updateUserPlatforms.update error', {error: serializeError(err), user_id: userId, platforms: platforms});
            reject(err);
        }
    });
}

function updateUserDetails(userId, email, name) {
    return new Promise((resolve, reject) => {        
        try {
            BotUser.update({user_id: userId}, {$set: {email: email, name: name}}, (err, res) => {
                if (err) {
                    logger.log.error('dal: updateUserDetails.update error', {error: serializeError(err), user_id: userId, email: email, name: name});                        
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (err) {
            logger.log.error('dal: updateUserDetails.update error', {error: serializeError(err), user_id: userId, email: email, name: name});
            reject(err);
        }
    });
}

function getBotUserById(userId) {
    return new Promise((resolve, reject)=>{
        BotUser.findOne({
            'user_id': userId
        }, function(err, botUser) {
            if (err) {
                logger.log.error('dal: getBotUserById BotUser.findOne error occurred', {error: serializeError(err), user_id: userId});
                reject(err);
            } else {
                resolve(botUser);
            } 
        });
    });
    
}

function getDeviceByUserId(userId, callback) {
    return new Promise((resolve, reject) => {
        DeviceUser.findOne({
            'user_id': userId
        }, function(err, botUser) {
            if (err) {
                logger.log.error('dal: getDeviceByUserId DeviceUser.findOne error occurred', {error: serializeError(err), user_id: userId});
                reject(err);
            } else {
                resolve(botUser);
            } 
        });
    });
}

function saveDeviceUserToDatabase(userId, deviceType){
    let newDeviceUser = new DeviceUser({
        user_id: userId,
        type: deviceType
    });

    newDeviceUser.save(function(err) {
        if (err) {
            logger.log.error('dal: saveDeviceUserToDatabase newDeviceUser.save error occurred', {error: serializeError(err), newDeviceUser: newDeviceUser});
            console.log(err);
        }
    });
}

function getBotUserByEmail(email) {
    return new Promise((resolve, reject) => {
        BotUser.findOne({
            'email': email
        }, function(err, botUser) {
            if (err) {
                logger.log.error('dal: getBotUserByEmail BotUser.findOne error occurred', {error: serializeError(err), email: email});
                reject(err);
            } else {
                resolve(botUser);
            } 
        });
    });
}

function getInvitedFriendsByUserId(userId) {
    return new Promise((resolve, reject) => {
        BotUser.find({
            'source.type': consts.botUser_source_friendReferral,
            'source.id': userId
        }, function(err, data) {
            if (err) {
                logger.log.error('dal: getInvitedFriendsByUserId BotUser.find error occurred', {error: serializeError(err),  source_type: consts.botUser_source_friendReferral, source_id: userId});
                reject(err);
            } else {
                resolve(data);
            } 
        });
    });
}

function updateUserSource(userId, source) {
    return new Promise((resolve, reject) => {
        BotUser.update({user_id: userId}, {$set: {'source' : source }}, (err, res) => {
            if (err) {
                logger.log.error('dal: updateUserSource.update error', {error: serializeError(err), user_id: userId, source: source});
                reject(err);
            } else {
                resolve();
            }
        });
    }); 
}


function getPointsToUser(userId) {
    return new Promise((resolve, reject) => {
        BotUser.findOne({
            'user_id': userId
        }, function(err, data) {
            if (err) {
                logger.log.error('dal: getPointsToUser BotUser.find error occurred', {error: serializeError(err),  userId: userId});
                reject(err);
            } else {
                if (data) {
                    resolve(data.points);                    
                } else {
                    resolve(consts.defaultStartPoints);
                }
            } 
        });
    });
}

function markInvitationAsCompleted(inviting_user_id, invited_email) {
    return new Promise((resolve, reject) => {        
        try {
            Invitation.update({inviting_user_id: inviting_user_id, invited_email: invited_email}, {$set: {'invitation_completed': 1}}, (err, res) => {
                if (err) {
                    logger.log.error('dal: markInvitationAsCompleted.update error', {error: serializeError(err)});                        
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (err) {
            logger.log.error('dal: markInvitationAsCompleted.update error', {error: serializeError(err)});
            reject(err);
        }
    });
}

function getInvitationByInvitedEmail(invited_email) {
    return new Promise((resolve, reject) => {        
        try {
            Invitation.findOne({
               'invited_email': invited_email, 'invitation_completed': 0
            }, (err, res) => {
                if (err) {
                    logger.log.error('dal: markInvitationAsCompleted.findOne error', {error: serializeError(err)});                        
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        } catch (err) {
            logger.log.error('dal: markInvitationAsCompleted.findOne error', {error: serializeError(err)});
            reject(err);
        }
    });
}

function getAllBotUsers (){
    return new Promise((resolve, reject) => {        
        try {
            // BotUser.find({user_id: 'aa29dc60-e36d-11e7-91e8-b59d09a796b9'}, (err, res) => {  // Tal Facebook dev
            // BotUser.find({user_id: 'dce31ab0-cdc2-11e7-a282-f70ffcb9c5b9'}, (err, res) => {  // Tal Kik dev
            // BotUser.find(
            //     {$or:   [{user_id: 'b8e24050-ce8f-11e7-b94b-1bf92d53b788'}, // Tal Telegram dev
            //             {user_id: 'aa29dc60-e36d-11e7-91e8-b59d09a796b9'},  // Tal Facebook dev
            //             {user_id: 'dce31ab0-cdc2-11e7-a282-f70ffcb9c5b9'} // Tal Kik dev
            //             ]
            //     }
            // , (err, res) => {  
            // BotUser.find({}, (err, res) => {
            BotUser.find({user_id: 'test'}, (err, res) => {
                if (err) {
                    logger.log.error('dal: getAllBotUsers.find error', {error: serializeError(err)});                        
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        } catch (err) {
            logger.log.error('dal: getAllBotUsers error', {error: serializeError(err)});
            reject(err);
        }
    });
}

function getAllBotUsersForBroadcastMessage (messageId){
    return new Promise((resolve, reject) => {        
        try {
            BotUser.find({broadcast_messages_received: {$ne: messageId}}, (err, res) => {
                if (err) {
                    logger.log.error('dal: getAllBotUsersForBroadcastMessage.find error', {error: serializeError(err)});                        
                    reject(err);
                } else {
                    resolve(res); // 143
                }
            });
        } catch (err) {
            logger.log.error('dal: getAllBotUsersForBroadcastMessage error', {error: serializeError(err)});
            reject(err);
        }
    });
}

function getBroadcastMessage (messageId) {
    return new Promise((resolve, reject) => {        
        try {
            BroadcastMessage.findOne({message_id: messageId}, (err, res) => {
                if (err) {
                    logger.log.error('dal: getBroadcastMessage.find error', {error: serializeError(err)});                        
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        } catch (err) {
            logger.log.error('dal: getBroadcastMessage error', {error: serializeError(err)});
            reject(err);
        }
    });
}

function updateUserBroadcastMessagesReceived (user) {
    return new Promise((resolve, reject) => {        
        try {
            BotUser.update({user_id: user.user_id}, {$set: {broadcast_messages_received: user.broadcast_messages_received}}, (err, res) => {
                if (err) {
                    logger.log.error('dal: updateUserBroadcastMessagesReceived.update error', {error: serializeError(err), user_id: user.user_id, broadcast_messages_received: user.broadcast_messages_received});                        
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (err) {
            logger.log.error('dal: updateUserBroadcastMessagesReceived error', {error: serializeError(err)});
            reject(err);
        }
    });
}

function updateBroadcastMessageUsersCount (message) {
    return new Promise((resolve, reject) => {        
        try {
            BroadcastMessage.update({message_id: message.message_id}, {$set: {received_users_count: message.received_users_count}}, (err, res) => {
                if (err) {
                    logger.log.error('dal: updateBroadcastMessageUsersCount.update error', {error: serializeError(err), message_id: message.message_id, received_users_count: message.received_users_count});                        
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (err) {
            logger.log.error('dal: updateBroadcastMessageUsersCount error', {error: serializeError(err)});
            reject(err);
        }
    });
}

module.exports = {
    saveNewUserToDatabase: saveNewUserToDatabase,
    saveDeviceUserToDatabase: saveDeviceUserToDatabase,
    getBotUserById: getBotUserById,
    getDeviceByUserId: getDeviceByUserId,
    saveDeviceUserToDatabase: saveDeviceUserToDatabase,
    getBotUserByEmail: getBotUserByEmail,
    getInvitedFriendsByUserId: getInvitedFriendsByUserId,
    updateUserPlatforms: updateUserPlatforms,
    updateUserDetails: updateUserDetails,
    getPointsToUser: getPointsToUser,
    updateUserSource: updateUserSource,
    markInvitationAsCompleted: markInvitationAsCompleted,
    getInvitationByInvitedEmail: getInvitationByInvitedEmail,
    getAllBotUsers: getAllBotUsers,
    getAllBotUsersForBroadcastMessage,
    getBroadcastMessage,
    updateUserBroadcastMessagesReceived,
    updateBroadcastMessageUsersCount
};