/**
 *
 * musiccast adapter
 *
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
var YamahaYXC = require('yamaha-yxc-nodejs');
var yamaha = null;

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.musiccast.0
var adapter = utils.adapter('musiccast');

function responseFailLog(fail){
    var errcode = "";
    switch (JSON.parse(fail).response_code) {
        case 1: errcode = "Response : 1 Initializing"; break;
        case 2: errcode = "Response : 2 Internal Error";break;
        case 3: errcode = "Response : 3 Invalid Request (A method did not exist, a method wasn’t appropriate etc.)"; break;
        case 4: errcode = "Response : 4 Invalid Parameter (Out of range, invalid characters etc.)";break;
        case 5: errcode = "Response : 5 Guarded (Unable to setup in current status etc.)"; break;
        case 6: errcode = "Response : 6 Time Out";break;
        case 99: errcode = "Response : 99 Firmware Updating";break;
        //Streaming Service Errors
        case 100: errcode = "Response : 100 Access Error Streaming Service";break;
        case 101: errcode = "Response : 101 Other Errors Streaming Service";break;
        case 102: errcode = "Response : 102 Wrong User Name Streaming Service";break;
        case 103: errcode = "Response : 103 Wrong Password Streaming Service";break;
        case 104: errcode = "Response : 104 Account Expired Streaming Service";break;
        case 105: errcode = "Response : 105 Account Disconnected/Gone Off/Shut Down Streaming Service";break;
        case 106: errcode = "Response : 106 Account Number Reached to the Limit Streaming Service";break;
        case 107: errcode = "Response : 107 Server Maintenance Streaming Service";break;
        case 108: errcode = "Response : 108 Invalid Account Streaming Service";break;
        case 109: errcode = "Response : 109 License Error Streaming Service";break;
        case 110: errcode = "Response : 110 Read Only Mode Streaming Service";break;
        case 111: errcode = "Response : 111 Max Stations Streaming Service";break;
        case 112: errcode = "Response : 112 Access Denied Streaming Service";break;
        default: errcode = "unknown code";           
    }
    return errcode;
}

function getConfigObjects(Obj, where, what){
    var foundObjects = [];
    for (var prop in Obj){
        if (Obj[prop][where] == what){
            foundObjects.push(Obj[prop]);
        }
    }
    return foundObjects;
}


// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        var tmp = id.split('.');
        var dp = tmp.pop(); //is the instance we are working on
        var idx = tmp.pop(); //is zone, system or other item
        var idy = tmp.pop(); // the device "type"_"uid"
        adapter.log.info('MusicCast: '+ id + ' identified for command with ' + state.val);
        
        //ermitteln der IP aus config
        adapter.log.debug('device with uid = ' + idy.split("_")[1]);
        var uid = idy.split("_")[1];
        var IP = getConfigObjects(adapter.config.devices, 'uid', uid);
        adapter.log.debug('IP configured : ' + IP[0].ip + ' for UID ' + uid);
        
        yamaha = new YamahaYXC(IP[0].ip);
        
        if (dp === 'power'){
            yamaha.power(state.val).then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('sent power on succesfully');
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure sending power  cmd' +  responseFailLog(result));}
            });
        }
        if (dp === 'mute'){
            yamaha.mute(state.val).then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('sent mute on succesfully');
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure mute cmd' +  responseFailLog(result));}
            });
        }
        if (dp === 'volume'){
            yamaha.setVolumeTo(state.val).then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('sent volume succesfully  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure sending volume ' +  responseFailLog(result));}
            });
        }
        if (dp === 'input'){
            yamaha.setInput(state.val).then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set input succesfully  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure seting input ' +  responseFailLog(result));}
            });
        }
                                
    }//if status
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj == 'object' && obj.message) {
        if (obj.command == 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});




// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});

function defineMusicDevice(type, uid){
    adapter.setObject(type + '_' + uid , {
        type: 'device',
        common: {
            name: 'MusicCast ' + type,
            role: 'device'
        },
        native: {
            "addr": uid
        }
    });
    adapter.setObject(type + '_' + uid + '.system', {
        type: 'channel',
        common: {
            name: 'MusicCast System Info',
            role: 'sensor'
        },
        native: {
            "addr": uid
        }
    });
    adapter.setObject(type + '_' + uid + '.system.api_version', {
        type: 'state',
        common: {
            "name": "API Version",
            "type": "number",
            "read": true,
            "write": false,
            "role": "value",
            "desc": "API Version"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.system.system_version', {
        type: 'state',
        common: {
            "name": "System Version",
            "type": "number",
            "read": true,
            "write": false,
            "role": "value",
            "desc": "System Version"
        },
        native: {}
    });
}
function defineMusicZone(type, uid, zone, max_vol){
    adapter.setObject(type + '_' + uid + '.' + zone, {
        type: 'channel',
        common: {
            name: 'MusicCast Zone ' + type,
            role: 'sensor'
        },
        native: {
            "addr": uid
        }
    });
    adapter.log.info('Setting up Zone:' + zone + ' of ' + type + '-' + uid);

    adapter.setObject(type + '_' + uid + '.' + zone + '.volume', {
        type: 'state',
        common: {
            "name": "Volume",
            "type": "number",
            "min": 0,
            "max": max_vol,
            "read": true,
            "write": true,
            "role": "level.volume",
            "desc": "State and Control of Volume"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.' + zone + '.mute', {
        type: 'state',
        common: {
            "name": "Mute",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "media.mute",
            "desc": "Mute"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.' + zone + '.power', {
        type: 'state',
        common: {
            "name": "Power ON/OFF(Standby)",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "value",
            "desc": "Power ON/OFF(Standby)"
        },
        native: {}
    });
}
function defineMusicInputs(type, uid, zone, inputs){
    adapter.setObject(type + '_' + uid + '.' + zone + '.input_list', {
        type: 'state',
        common: {
            "name": "list of inputs",
            "type": "array",
            "read": true,
            "write": false,
            "values" : inputs,
            "role": "list",
            "desc": "list of inputs"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.' + zone + '.input', {
        type: 'state',
        common: {
            "name": "Input selection",
            "type": "string",
            "read": true,
            "write": true,
            "role": "text",
            "desc": "Input selection"
        },
        native: {}
    });
}
function defineMusicLinkCtrl(type, uid, zone, ctrl){
    adapter.setObject(type + '_' + uid + '.' + zone + '.link_control_list', {
        type: 'state',
        common: {
            "name": "link control options",
            "type": "array",
            "read": true,
            "write": false,
            "values" : ctrl,
            "role": "list",
            "desc": "link control options"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.' + zone + '.link_control', {
        type: 'state',
        common: {
            "name": "link control selection",
            "type": "string",
            "read": true,
            "write": true,
            "role": "text",
            "desc": "link control selection"
        },
        native: {}
    });
}

function defineZoneFunctions(type, uid, zone, func_list, ctrloptions){
    if (func_list.indexOf("equalizer") !== -1){
        adapter.log.info('Setting up Equalizer in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.low', {
            type: 'state',
            common: {
                "name": "EQ Low",
                "type": "number",
                "min": -10,
                "max": +10,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "EQ Low"
            },
            native: {}
        });
        adapter.setObject(type + '_' + uid + '.' + zone + '.mid', {
            type: 'state',
            common: {
                "name": "EQ Mid",
                "type": "number",
                "min": -10,
                "max": +10,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "EQ Mid"
            },
            native: {}
        });
        adapter.setObject(type + '_' + uid + '.' + zone + '.high', {
            type: 'state',
            common: {
                "name": "EQ High",
                "type": "number",
                "min": -10,
                "max": +10,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "EQ High"
            },
            native: {}
        });
    }
    if (func_list.indexOf("sleep") !== -1){
        adapter.log.info('Setting up Clear Voice in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.sleep', {
            type: 'state',
            common: {
                "name": "Sleep Timer",
                "type": "number",
                "read": true,
                "write": true,
                "min" : 0,
                "max" : 120,
                "role": "level",
                "desc": "Sleep Timer"
            },
            native: {}
        });
    }
    if (func_list.indexOf("clear_voice") !== -1){
        adapter.log.info('Setting up Clear Voice in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.clearVoice', {
            type: 'state',
            common: {
                "name": "Clear Voice",
                "type": "boolean",
                "read": true,
                "write": true,
                "role": "button",
                "desc": "Clear Voice"
            },
            native: {}
        });
    }
    if (func_list.indexOf("sound_program") !== -1){
        adapter.log.info('Setting up SoundProgramm in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.sound_program_list', {
            type: 'state',
            common: {
                "name": "Sound Program options",
                "type": "array",
                "read": true,
                "write": false,
                "values": ctrloptions,
                "role": "list",
                "desc": "Sound Program"
            },
            native: {}
        });
        adapter.setObject(type + '_' + uid + '.' + zone + '.sound_program', {
            type: 'state',
            common: {
                "name": "Sound Program selection",
                "type": "string",
                "read": true,
                "write": true,
                "role": "text",
                "desc": "Sound Program selection"
            },
            native: {}
        });
    }
    if (func_list.indexOf("direct") !== -1){
        adapter.log.info('Setting up direct in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.direct', {
            type: 'state',
            common: {
                "name": "direct",
                "type": "boolean",
                "read": true,
                "write": true,
                "role": "button",
                "desc": "direct"
            },
            native: {}
        });
    }
    if (func_list.indexOf("pure_direct") !== -1){
        adapter.log.info('Setting up pure_direct in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.pure_direct', {
            type: 'state',
            common: {
                "name": "pure direct",
                "type": "boolean",
                "read": true,
                "write": true,
                "role": "button",
                "desc": "pure direct"
            },
            native: {}
        });
    }
    if (func_list.indexOf("enhancer") !== -1){
        adapter.log.info('Setting up pure_direct in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.enhancer', {
            type: 'state',
            common: {
                "name": "enhancer",
                "type": "boolean",
                "read": true,
                "write": true,
                "role": "button",
                "desc": "enhancer"
            },
            native: {}
        });
    }
    if (func_list.indexOf("tone_control") !== -1){
        adapter.log.info('Setting up tone_control in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.treble', {
            type: 'state',
            common: {
                "name": "treble", //name from system/get Features
                "type": "number",
                "min": -5,
                "max": +5, //range from system/get Features
                "read": true,
                "write": true,
                "role": "level",
                "desc": "treble"
            },
            native: {}
        });
        adapter.setObject(type + '_' + uid + '.' + zone + '.bass', {
            type: 'state',
            common: {
                "name": "bass",
                "min": -5,
                "max": +5, //range from system/get Features
                "read": true,
                "write": true,
                "role": "level",
                "desc": "bass"
            },
            native: {}
        });
    }
    if (func_list.indexOf("balance") !== -1){
        adapter.log.info('Setting up balance in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.balance', {
            type: 'state',
            common: {
                "name": "balance",
                "type": "number",
                "min": -5,
                "max": +5,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "balance"
            },
            native: {}
        });
    }
    if (func_list.indexOf("dialogue_level") !== -1){
        adapter.log.info('Setting up dialogue_level in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.dialogue_level', {
            type: 'state',
            common: {
                "name": "dialogue_level",
                "type": "number",
                "min": 0,
                "max": +5,   //range from system/get Features
                "read": true,
                "write": true,
                "role": "level",
                "desc": "dialogue_level"
            },
            native: {}
        }); 
    }
    if (func_list.indexOf("dialogue_lift") !== -1){
        adapter.log.info('Setting up dialogue_lift in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.dialogue_lift', {
            type: 'state',
            common: {
                "name": "dialogue_lift",
                "type": "number",
                "min": 0,
                "max": +5, //range from system/get Features
                "read": true,
                "write": true,
                "role": "level",
                "desc": "dialogue_lift"
            },
            native: {}
        }); 
    } 
    if (func_list.indexOf("subwoofer_volume") !== -1){
        adapter.log.info('Setting up subwoofer_volume in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.balance', {
            type: 'state',
            common: {
                "name": "subwoofer_volume",
                "type": "number",
                "min": 0,
                "max": +5,  //range from system/get Features
                "read": true,
                "write": true,
                "role": "level",
                "desc": "subwoofer_volume"
            },
            native: {}
        }); 
    }
    if (func_list.indexOf("bass_extension") !== -1){
        adapter.log.info('Setting up bass_extension in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.bass_extension', {
            type: 'state',
            common: {
                "name": "bass_extension",
                "type": "boolean",
                "read": true,
                "write": true,
                "role": "button",
                "desc": "bass_extension"
            },
            native: {}
        }); 
    }        
    if (func_list.indexOf("link_audio_delay") !== -1){
        adapter.log.info('Setting up link_audio_delay in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObject(type + '_' + uid + '.' + zone + '.link_audio_delay', {
            type: 'state',
            common: {
                "name": "link_audio_delay",
                "type": "string",
                "read": true,
                "write": true,
                //"values": from list get Features
                "role": "text",
                "desc": "link_audio_delay"
            },
            native: {}
        });  
    }   
    if (func_list.indexOf("signal_info") !== -1){
        // signal info audio ....
    }
}
function defineMusicSystemInputs(type, uid, sysinputs){
    adapter.log.debug(type + ' has number of system inputs : ' + sysinputs.length);
    for (var i=0; i < sysinputs.length; i++){
        adapter.log.debug(type + ' setting up input : ' + sysinputs[i].id);
        adapter.setObject(type + '_' + uid + '.system.inputs.' + sysinputs[i].id, {
            type: 'channel',
            common: {
                name: 'Input ' + id,
                role: 'sensor'
            },
            native: {
                "addr": uid
            }
        });
        adapter.setObject(type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.distribution_enable', {
            type: 'state',
            common: {
                "name": "distribution enabled",
                "type": "boolean",
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "distribution enabled"
            },
            native: {}
        });
        adapter.setObject(type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.account_enable', {
            type: 'state',
            common: {
                "name": "account to be enabled",
                "type": "boolean",
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "account to be enabled"
            },
            native: {}
        });
        adapter.setObject(type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.play_info_type', {
            type: 'state',
            common: {
                "name": "play info type",
                "type": "string",
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "play info type"
            },
            native: {}
        });
        adapter.setForeignState('musiccast.0.'+ type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.distribution_enable', {val: sysinputs[i].distribution_enable, ack: true});
        adapter.setForeignState('musiccast.0.'+ type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.account_enable', {val: sysinputs[i].account_enable, ack: true});
        adapter.setForeignState('musiccast.0.'+ type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.play_info_type', {val: sysinputs[i].play_info_type, ack: true});
    } 
}
function defineMusicNetUsb(type, uid){
    adapter.setObject(type + '_' + uid + '.netusb', {
        type: 'channel',
        common: {
            name: 'MusicCast NetUSB ' + type,
            role: 'sensor'
        },
        native: {
            "addr": uid
        }
    });
    adapter.log.info('Setting up NetUSB of :' + type + '-' + uid);

    adapter.setObject(type + '_' + uid + '.netusb.playPause', {
        type: 'state',
        common: {
            "name": "play",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button.play",
            "desc": "play"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.stop', {
        type: 'state',
        common: {
            "name": "Stop",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button.stop",
            "desc": "Stop"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.next', {
        type: 'state',
        common: {
            "name": "next",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button.next",
            "desc": "next"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.prev', {
        type: 'state',
        common: {
            "name": "prev",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button.prev",
            "desc": "next"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.shuffle', {
        type: 'state',
        common: {
            "name": "shuffle",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button",
            "desc": "shuffle"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.repeat', {
        type: 'state',
        common: {
            "name": "repeat",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button",
            "desc": "repeat"
        },
        native: {}
    });
}
function getMusicDeviceInfo(ip, type, uid){
        var devip = ip;
        var devtype = type;
        var devuid = uid;
        yamaha = new YamahaYXC(ip);
        yamaha.getDeviceInfo().then(function(result){
                var att = JSON.parse(result);
                if (att.response_code === 0 ){
                    adapter.log.debug('got device info succesfully from ' + devip);
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.system.api_version', {val: att.api_version, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.system.system_version', {val: att.system_version, ack: true});                    
                }
                else {adapter.log.debug('failure getting device info from  ' + devip + ' : ' +  responseFailLog(result));}
            
         });
}
function getMusicFeatures(ip, type, uid){
        var devip = ip;
        var devtype = type;
        var devuid = uid;
        yamaha = new YamahaYXC(ip);
        yamaha.getFeatures().then(function(result){
                var att = JSON.parse(result);
                if (att.response_code === 0 ){  
                    adapter.log.debug('got features succesfully from ' + devip);
                    adapter.log.debug('number of zones ' + att.system.zone_num);     //wenn größer als 1 dann eine Schleife aufbauen
                    var zone_name = att.zone[0].id;
                    var max_vol = JSON.stringify(att.zone[0].range_step[0].max); // nehmen wir mal an, dass volume immer auf [0] zu finden ist
                    // Zone basic controls
                    defineMusicZone(devtype, devuid, zone_name, max_vol);
                    // Zone input list
                    defineMusicInputs(devtype, devuid, zone_name, att.zone[0].input_list);
                    
                    // Zone Func_list fixed
                    // link control
                    defineMusicLinkCtrl(devtype, devuid, zone_name, att.zone[0].link_control_list);
                    // input services and their attributes
                    defineMusicSystemInputs(devtype, devuid, att.system.input_list);

                    //Zone Func_list variable
                    defineZoneFunctions(devtype, devuid, zone_name, att.zone[0].func_list, att.zone[0].sound_program_list);
                                  
                }
                else {adapter.log.debug('failure getting features from  ' + devip + ' : ' +  responseFailLog(result));}
        });
}

function main() {

    //yamaha.discover
    //yamaha.discoverYSP 
    //found devices crosscheck with config.devices
    //new found devices to adapter.confg.devices //quit adapter and restart with found config

    var obj = adapter.config.devices;

    //check if something is not configured

    for (var anz in obj){

        //general structure setup        
        defineMusicDevice(obj[anz].type, obj[anz].uid); //contains also the structure to musiccast.0._id_type_.
        defineMusicNetUsb(obj[anz].type, obj[anz].uid); //all devices are supporting netusb
        //defineMClink basic structure

        //some reading from the devices
        // get system data
        getMusicDeviceInfo(obj[anz].ip, obj[anz].type, obj[anz].uid);

        //get the inout list and create object
        getMusicFeatures(obj[anz].ip, obj[anz].type, obj[anz].uid);
        //yamaha.getNameText() evtl. um enum_room für die Zone zu setzen oder über setNameText enum_room aus admin setzen

        //yamaha.getStatus('main'); initial status of device

        //
    }


    //everything is configured, make cyclic updates



    // in this musiccast all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');


    // examples for the checkPassword/checkGroup functions
    /*
    adapter.checkPassword('admin', 'iobroker', function (res) {
        console.log('check user admin pw iobroker: ' + res);
    });

    adapter.checkGroup('admin', 'admin', function (res) {
        console.log('check group user admin group admin: ' + res);
    });

    */

}
