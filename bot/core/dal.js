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

function getBotUserById(userId, callback) {
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
    getPointsToUser: getPointsToUser
};