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

function browse(callback) {
    var result = [];
        result.push({ip: "192.168.178.52", name: "Wohnzimmer", type: "YSP-1600", uid: "0B587073"});
        result.push({ip: "192.168.178.56", name: "Küche", type: "WX-030", uid: "0E257883"});
    if (callback) callback(result);
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
        adapter.log.debug('config items : ' + JSON.stringify(adapter.config.devices));
        adapter.log.debug('IP configured : ' + IP[0].ip + ' for UID ' + uid);
        
        yamaha = new YamahaYXC(IP[0].ip);
        
        if (dp === 'power'){
            yamaha.power(state.val).then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('sent power succesfully to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting power' +  responseFailLog(result));}
            });
        }
        if (dp === 'mute'){
            yamaha.mute(state.val).then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('sent mute succesfully to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure mute cmd' +  responseFailLog(result));}
            });
        }
        if (dp === 'surround'){
            yamaha.surround(state.val).then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('sent surround succesfully to '+ state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting surround' +  responseFailLog(result));}
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
                else {adapter.log.debug('failure setting input ' +  responseFailLog(result));}
            });
        }        
        if (dp === 'low'){
            yamaha.setEqualizer(state.val,'','').then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set equalizer LOW succesfully  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting EQ LOW ' +  responseFailLog(result));}
            });
        }
        if (dp === 'mid'){
            yamaha.setEqualizer('', state.val,'').then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set equalizer MID succesfully  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting EQ MID ' +  responseFailLog(result));}
            });
        }          
        if (dp === 'high'){
            yamaha.setEqualizer('','',state.val).then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set equalizer High succesfully  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting EQ HIGH' +  responseFailLog(result));}
            });
        }
        if (dp === 'subwoofer_volume'){
            yamaha.setSubwooferVolumeTo(state.val).then(function(result) {  //zone to be added
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set subwoofer volume succesfully  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting subwoofer volume' +  responseFailLog(result));}
            });
        }
        if (dp === 'bass_extension'){
            yamaha.setBassExtension(state.val).then(function(result) {  //zone to be added
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set Bass Extension  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting Bass Extension' +  responseFailLog(result));}
            });
        }
        if (dp === 'enhancer'){
            yamaha.setEnhancer(state.val).then(function(result) {  //zone to be added
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set Enhancer  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting Enhancer' +  responseFailLog(result));}
            });
        }
        if (dp === 'direct'){
            yamaha.setDirect(state.val).then(function(result) {  //zone to be added
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set Direct  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting Direct' +  responseFailLog(result));}
            });
        }
        if (dp === 'pure_direct'){
            yamaha.setPureDirect(state.val).then(function(result) {  //zone to be added
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set Pure Direct  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting Pure Direct' +  responseFailLog(result));}
            });
        }
        if (dp === 'sound_program'){
            yamaha.setSound(state.val).then(function(result) {  //zone to be added
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set sound program  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting sound program' +  responseFailLog(result));}
            });
        }
        if (dp === 'bass'){
            yamaha.setBassTo(state.val).then(function(result) {  //zone to be added
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set Bass to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting Bass' +  responseFailLog(result));}
            });
        }
        if (dp === 'treble'){
            yamaha.setTrebleTo(state.val).then(function(result) {  //zone to be added
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set Treble to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting Treble' +  responseFailLog(result));}
            });
        }
        if (dp === 'balance'){
            yamaha.setBalance(state.val).then(function(result) {  //zone to be added
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set Balance to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting Balance' +  responseFailLog(result));}
            });
        }                            
        if (dp === 'sleep'){
            yamaha.sleep(state.val).then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set sleep succesfully  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting sleep' +  responseFailLog(result));}
            });
        }
        if (dp === 'clearVoice'){
            yamaha.setClearVoice(state.val).then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('set ClearVoice succesfully  to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure setting ClearVoice' +  responseFailLog(result));}
            });
        }
        if (dp === 'presetrecallnumber'){
            var zone = 'main'; //wie die Übergabe an andere zones verarbeiten??
            yamaha.recallPreset(state.val, zone).then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('recalled the Preset succesfully in zone  ' + zone + ' to ' + state.val);
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure recalling Preset' +  responseFailLog(result));}
            });
        }
        if (dp === 'prev' && state.val === true){
            if(idx === 'netusb'){
                yamaha.prevNet().then(function(result) {
                    if (JSON.parse(result).response_code === 0 ){
                        adapter.log.debug('sent PREV  to netusb ');
                        //adapter.setForeignState(id, true, true);
                    }
                    else {adapter.log.debug('failure sending PREV to NETUSB' +  responseFailLog(result));}
                });
            }
            if(idx === 'cd'){
                yamaha.prevCD().then(function(result) {
                    if (JSON.parse(result).response_code === 0 ){
                        adapter.log.debug('sent PREV  to CD ');
                        //adapter.setForeignState(id, true, true);
                    }
                    else {adapter.log.debug('failure sending PREV to CD' +  responseFailLog(result));}
                });
            }
        }
        if (dp === 'next' && state.val === true){
            if(idx === 'netusb'){
                yamaha.nextNet().then(function(result) {
                    if (JSON.parse(result).response_code === 0 ){
                        adapter.log.debug('sent NEXT  to netusb ');
                        //adapter.setForeignState(id, true, true);
                    }
                    else {adapter.log.debug('failure sending NEXT to NETUSB' +  responseFailLog(result));}
                });
            }
            if(idx === 'cd'){
                yamaha.nextCD().then(function(result) {
                    if (JSON.parse(result).response_code === 0 ){
                        adapter.log.debug('sent NEXT  to CD ');
                        //adapter.setForeignState(id, true, true);
                    }
                    else {adapter.log.debug('failure sending NEXT to CD' +  responseFailLog(result));}
                });
            }
        }
        if (dp === 'repeat' && state.val === true){
            if(idx === 'netusb'){
                yamaha.toggleNetRepeat().then(function(result) {
                    if (JSON.parse(result).response_code === 0 ){
                        adapter.log.debug('sent Repeat  to netusb ');
                        //adapter.setForeignState(id, true, true);
                    }
                    else {adapter.log.debug('failure sending Repeat to NETUSB' +  responseFailLog(result));}
                });
            }
            if(idx === 'cd'){
                yamaha.toggleCDRepeat().then(function(result) {
                    if (JSON.parse(result).response_code === 0 ){
                        adapter.log.debug('sent Repeat  to CD ');
                        //adapter.setForeignState(id, true, true);
                    }
                    else {adapter.log.debug('failure sending Repeat to CD' +  responseFailLog(result));}
                });
            }
        }        
        if (dp === 'playPause'){
            if(idx === 'netusb'){
                if (state.val === true){
                    yamaha.playNet().then(function(result) {
                        if (JSON.parse(result).response_code === 0 ){
                            adapter.log.debug('set NETUSB Play succesfully  to ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else {adapter.log.debug('failure setting NETUSB Play' +  responseFailLog(result));}
                    });
                }
                else {
                    yamaha.stopNet().then(function(result) {
                        if (JSON.parse(result).response_code === 0 ){
                            adapter.log.debug('set NETUSB Stop succesfully  to ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else {adapter.log.debug('failure setting NETUSB Stop' +  responseFailLog(result));}
                    });          
                }
            }
            if(idx === 'cd'){
                if (state.val === true){
                    yamaha.playCD().then(function(result) {
                        if (JSON.parse(result).response_code === 0 ){
                            adapter.log.debug('set CD Play succesfully  to ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else {adapter.log.debug('failure setting CD Play' +  responseFailLog(result));}
                    });
                }
                else {
                    yamaha.stopCD().then(function(result) {
                        if (JSON.parse(result).response_code === 0 ){
                            adapter.log.debug('set CD Stop succesfully  to ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else {adapter.log.debug('failure setting CD Stop' +  responseFailLog(result));}
                    });          
                }
            }
        } 
        if (dp === 'shuffle' && state.val === true){
            if(idx === 'netusb'){
                yamaha.toggleNetShuffle().then(function(result) {
                    if (JSON.parse(result).response_code === 0 ){
                        adapter.log.debug('sent Shuffle  to netusb ');
                        //adapter.setForeignState(id, true, true);
                    }
                    else {adapter.log.debug('failure sending Shuffle to NETUSB' +  responseFailLog(result));}
                });
            }
            if(idx === 'cd'){
                yamaha.toggleCDShuffle().then(function(result) {
                    if (JSON.parse(result).response_code === 0 ){
                        adapter.log.debug('sent Shuffle to CD ');
                        //adapter.setForeignState(id, true, true);
                    }
                    else {adapter.log.debug('failure sending Shuffle to CD' +  responseFailLog(result));}
                });
            }
        }         
    }//if status
});


// New message arrived. obj is array with current messages
adapter.on('message', function (obj) {
    var wait = false;
    if (obj) {
        switch (obj.command) {
            case 'browse':
                /*
                //variant 1
                browse(function (res) {
                    if (obj.callback) adapter.sendTo(obj.from, obj.command, res, obj.callback);
                });
                */
                var result = [];
                yamaha = new YamahaYXC();
                yamaha.discover().then(function(res){
                result.push({ip: res[0], name: res[1], type: res[2], uid: res[3]});
                adapter.log.debug('result ' + JSON.stringify(result));
                }).done(function (res){
                if (obj.callback) adapter.sendTo(obj.from, obj.command, result, obj.callback);
                });
                wait = true;
                break;

            default:
                adapter.log.warn('Unknown command: ' + obj.command);
                break;
        }
    }

    if (!wait && obj.callback) {
        adapter.sendTo(obj.from, obj.command, obj.message, obj.callback);
    }

    return true;
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
    adapter.setObject(type + '_' + uid + '.system.system_id', {
        type: 'state',
        common: {
            "name": "System ID",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "System ID"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.system.device_id', {
        type: 'state',
        common: {
            "name": "Device ID",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "Device ID"
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
    adapter.setObject(type + '_' + uid + '.' + zone + '.group_id', {
        type: 'state',
        common: {
            "name": "MC Link group ID",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "MC Link group ID"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.' + zone + '.group_name', {
        type: 'state',
        common: {
            "name": "MC Link group name",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "MC Link group name"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.' + zone + '.role', {
        type: 'state',
        common: {
            "name": "MC Link group role",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "MC Link group role"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.' + zone + '.server_zone', {
        type: 'state',
        common: {
            "name": "MC Link server zone",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "MC Link server zone"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.' + zone + '.client_list', {
        type: 'state',
        common: {
            "name": "MC Link client list",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "MC Link client list"
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
            "values" : inputs,
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
            "values" : ctrl,
            "role": "text",
            "desc": "link control selection"
        },
        native: {}
    });
}
function defineZoneFunctions(type, uid, zone, func_list, soundoptions, linkaudiolist){
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
        adapter.log.info('Setting up sleep timer in Zone:' + zone + ' of ' + type + '-' + uid);
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
                "values": soundoptions,
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
        adapter.setObject(type + '_' + uid + '.' + zone + '.subwoofer_volume', {
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
                "values": linkaudiolist,
                "role": "text",
                "desc": "link_audio_delay"
            },
            native: {}
        });
        adapter.setObject(type + '_' + uid + '.' + zone + '.link_audio_delay_list', {
            type: 'state',
            common: {
                "name": "link_audio_delay_list",
                "type": "array",
                "read": true,
                "write": true,
                "role": "list",
                "desc": "link_audio_delay_list"
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
                name: 'Input ' + sysinputs[i].id,
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
    adapter.setObject(type + '_' + uid + '.netusb.playback', {
        type: 'state',
        common: {
            "name": "playback status",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "playback status"
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
            "name": "shuffle toggle button",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button",  
            "desc": "shuffle toggle button"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.shuffle_stat', {
        type: 'state',
        common: {
            "name": "shuffle status",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",  //can be toggled off, on, songs, album
            "desc": "shuffle status"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.repeat', {
        type: 'state',
        common: {
            "name": "repeat toggle button",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button", 
            "desc": "repeat toggle button"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.repeat_stat', {
        type: 'state',
        common: {
            "name": "repeat status",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",  //can be toggled off, one, all
            "desc": "repeat status"
        },
        native: {}
    });    
    adapter.setObject(type + '_' + uid + '.netusb.artist', {
        type: 'state',
        common: {
            "name": "artist",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "artist"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.album', {
        type: 'state',
        common: {
            "name": "album",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "album"
        },
        native: {}
    });  
    adapter.setObject(type + '_' + uid + '.netusb.track', {
        type: 'state',
        common: {
            "name": "track",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "track"
        },
        native: {}
    }); 
    adapter.setObject(type + '_' + uid + '.netusb.albumarturl', {
        type: 'state',
        common: {
            "name": "albumarturl",  //ip of device + albumarturl
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "albumarturl"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.input', {
        type: 'state',
        common: {
            "name": "active input netusb",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "active input on netusb"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.playtime', {
        type: 'state',
        common: {
            "name": "active input netusb",
            "type": "number",
            "read": true,
            "write": false,
            "unit": "s",
            "role": "value",
            "desc": "active input on netusb"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.recent_info', {
        type: 'state',
        common: {
            "name": "netusb plaback history",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "netusb playback history"
        },
        native: {}
    });  
    adapter.setObject(type + '_' + uid + '.netusb.preset_info', {
        type: 'state',
        common: {
            "name": "netusb favourites",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "netusb favourites"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.netusb.presetrecallnumber', {
        type: 'state',
        common: {
            "name": "recall preset number",
            "type": "number",
            "read": true,
            "write": true,
            "role": "level",
            "desc": "recall preset number" //wie wird die zone abgeleitet, wenn mehr als main?
        },
        native: {}
    });      
    adapter.setObject(type + '_' + uid + '.netusb.usbdevicetype', {
        type: 'state',
        common: {
            "name": "type of USB device",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "type of USB device" // "msc" / "ipod" / "unknown"
        },
        native: {}
    }); 
    adapter.setObject(type + '_' + uid + '.netusb.attribute', {
        type: 'state',
        common: {
            "name": "service attribute",
            "type": "number",
            "read": true,
            "write": false,
            "role": "value",
            "desc": "service attribute" // must be decoded for detection which possibilities come with the service
        },
        native: {}
    }); 
}
function defineMusicCD(type, uid){
    adapter.setObject(type + '_' + uid + '.cd', {
        type: 'channel',
        common: {
            name: 'MusicCast CD ' + type,
            role: 'sensor'
        },
        native: {
            "addr": uid
        }
    });
    adapter.log.info('Setting up CD of :' + type + '-' + uid);

    adapter.setObject(type + '_' + uid + '.cd.playPause', {
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
    adapter.setObject(type + '_' + uid + '.cd.stop', {
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
    adapter.setObject(type + '_' + uid + '.cd.next', {
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
    adapter.setObject(type + '_' + uid + '.cd.prev', {
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
    adapter.setObject(type + '_' + uid + '.cd.shuffle', {
        type: 'state',
        common: {
            "name": "shuffle",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button",  // can be false = off / true = on
            "desc": "shuffle"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.cd.shuffle_stat', {
        type: 'state',
        common: {
            "name": "shuffle status",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",  //can return "off" / "on" / "folder" / "program"
            "desc": "shuffle status"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.cd.repeat', {
        type: 'state',
        common: {
            "name": "repeat toggle button",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button", 
            "desc": "repeat toggle button"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.cd.repeat_stat', {
        type: 'state',
        common: {
            "name": "repeat status",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",  //can be toggled off, one, all
            "desc": "repeat status"
        },
        native: {}
    });   
    adapter.setObject(type + '_' + uid + '.cd.device_status', {
        type: 'state',
        common: {
            "name": "device status",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",  //"open" / "close" / "ready" / "not_ready"
            "desc": "device status"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.cd.playback', {
        type: 'state',
        common: {
            "name": "playback status",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",  // "play" / "stop" / "pause" / "fast_reverse" / "fast_forward"
            "desc": "playback status"
        },
        native: {}
    });  
    adapter.setObject(type + '_' + uid + '.cd.playtime', {
        type: 'state',
        common: {
            "name": "current playback time",
            "type": "number",
            "read": true,
            "write": false,
            "unit": "s",
            "role": "value", 
            "desc": "current playback time"
        },
        native: {}
    }); 
    adapter.setObject(type + '_' + uid + '.cd.totaltime', {
        type: 'state',
        common: {
            "name": "total track playback time",
            "type": "number",
            "read": true,
            "write": false,
            "unit": "s",
            "role": "value", 
            "desc": "current track total playback time"
        },
        native: {}
    }); 
    adapter.setObject(type + '_' + uid + '.cd.disctime', {
        type: 'state',
        common: {
            "name": "CD total playback time",
            "type": "number",
            "read": true,
            "write": false,
            "unit": "s",
            "role": "value", 
            "desc": "CD total playback time"
        },
        native: {}
    });   
    adapter.setObject(type + '_' + uid + '.cd.tracknumber', {
        type: 'state',
        common: {
            "name": "track current in playback",
            "type": "number",
            "read": true,
            "write": false,
            "role": "value", // If no track, or playback status is complete stop, returns -1.
            "desc": "track current in playback"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.cd.totaltracks', {
        type: 'state',
        common: {
            "name": "total CD tracks",
            "type": "number",
            "read": true,
            "write": false,
            "role": "value", 
            "desc": "total CD tracks"
        },
        native: {}
    }); 
    adapter.setObject(type + '_' + uid + '.cd.artist', {
        type: 'state',
        common: {
            "name": "CD artist name",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",  
            "desc": "CD artist name"
        },
        native: {}
    });  
    adapter.setObject(type + '_' + uid + '.cd.album', {
        type: 'state',
        common: {
            "name": "CD album title",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",  
            "desc": "CD album title"
        },
        native: {}
    });  
    adapter.setObject(type + '_' + uid + '.cd.track', {
        type: 'state',
        common: {
            "name": "CD track title",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",  
            "desc": "CD track title"
        },
        native: {}
    })                    
}
// status requests
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
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.system.system_id', {val: att.system_id, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.system.device_id', {val: att.device_id, ack: true});                     
                }
                else {adapter.log.debug('failure getting device info from  ' + devip + ' : ' +  responseFailLog(result));}
            
         });
}
function getMusicMainInfo(ip, type, uid){
        var devip = ip;
        var devtype = type;
        var devuid = uid;
        yamaha = new YamahaYXC(ip);
        yamaha.getStatus().then(function(result){
                var att = JSON.parse(result);
                if (att.response_code === 0 ){
                    adapter.log.debug('got status info succesfully from ' + devip);
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.power', {val: att.power, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.volume', {val: att.volume, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.mute', {val: att.mute, ack: true}); 
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.input', {val: att.input, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.link_control', {val: att.link_control, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.link_audio_delay', {val: att.link_audio_delay, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.sound_program', {val: att.sound_program, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.clear_voice', {val: att.clear_voice, ack: true});   
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.subwoofer_volume', {val: att.subwoofer_volume, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.low', {val: att.equalizer.low, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.mid', {val: att.equalizer.mid, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.high', {val: att.equalizer.high, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.bass', {val: att.tone_control.bass, ack: true});   
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.treble', {val: att.tone_control.treble, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.balance', {val: att.balance, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.enhancer', {val: att.enhancer, ack: true}); 
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.bass_extension', {val: att.bass_extension, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.direct', {val: att.direct, ack: true});  
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.pure_direct', {val: att.pure_direct, ack: true});            
                }
                else {adapter.log.debug('failure getting status info from  ' + devip + ' : ' +  responseFailLog(result));}
            
         });
}
function getMusicZoneLists(ip, type, uid){
        var devip = ip;
        var devtype = type;
        var devuid = uid;
        yamaha = new YamahaYXC(ip);
        yamaha.getFeatures().then(function(result){
                var att = JSON.parse(result);
                if (att.response_code === 0 ){
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.input_list', {val: att.zone[0].input_list, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.link_control_list', {val: att.zone[0].link_control_list, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.link_audio_delay_list', {val: att.zone[0].link_audio_delay_list, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.sound_program_list', {val: att.zone[0].sound_program_list, ack: true});
                }
                else {adapter.log.debug('failure getting status info from  ' + devip + ' : ' +  responseFailLog(result));}
            
         });
}  
function getMusicNetusbInfo(ip, type, uid){
        var devip = ip;
        var devtype = type;
        var devuid = uid;
        yamaha = new YamahaYXC(ip);
        yamaha.getPlayInfo().then(function(result){
                var att = JSON.parse(result);
                if (att.response_code === 0 ){
                    var albumurl = att.albumart_url;
                    if(albumurl.substr(0,20) === '/YamahaRemoteControl'){
                        albumurl = 'http://' + devip + att.albumart_url;
                    }
                    adapter.log.debug('got Netusb playinfo succesfully from ' + devip + 'with  ' + JSON.stringify(result));
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.input', {val: att.input, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.playback', {val: att.playback, ack: true});                    
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.repeat_stat', {val: att.repeat, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.shuffle_stat', {val: att.shuffle, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.playtime', {val: att.play_time, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.usbdevicetype', {val: att.usb_devicetype, ack: true});                      
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.album', {val: att.album, ack: true}); 
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.albumarturl', {val: albumurl, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.artist', {val: att.artist, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.track', {val: att.track, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.attribute', {val: att.attribute, ack: true});                                         
                }
                else {adapter.log.debug('failure getting Netusb playinfo from  ' + devip + ' : ' +  responseFailLog(result));}            
         });
}
function getMusicNetusbRecent(ip, type, uid){
        var devip = ip;
        var devtype = type;
        var devuid = uid;
        yamaha = new YamahaYXC(ip);
        yamaha.getRecentInfo().then(function(result){
                var att = JSON.parse(result);
                if (att.response_code === 0 ){
                    adapter.log.debug('got Netusb recent info succesfully from ' + devip + 'with  ' + JSON.stringify(result));
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.recent_info', {val: JSON.stringify(att.recent_info), ack: true});                                      
                }
                else {adapter.log.debug('failure getting Netusb recent info from  ' + devip + ' : ' +  responseFailLog(result));}            
         });
}
function getMusicNetusbPreset(ip, type, uid){
        var devip = ip;
        var devtype = type;
        var devuid = uid;
        yamaha = new YamahaYXC(ip);
        yamaha.getPresetInfo().then(function(result){
                var att = JSON.parse(result);
                if (att.response_code === 0 ){
                    adapter.log.debug('got Netusb preset info succesfully from ' + devip + 'with  ' + JSON.stringify(result));
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.netusb.preset_info', {val: JSON.stringify(att.preset_info), ack: true});                                      
                }
                else {adapter.log.debug('failure getting Netusb preset info from  ' + devip + ' : ' +  responseFailLog(result));}           
         });
}
function getMusicCdInfo(ip, type, uid){
        var devip = ip;
        var devtype = type;
        var devuid = uid;
        yamaha = new YamahaYXC(ip);
        yamaha.getPlayInfo().then(function(result){
                var att = JSON.parse(result);
                if (att.response_code === 0 ){
                    adapter.log.debug('got CD playinfo succesfully from ' + devip + 'with  ' + JSON.stringify(result));
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.cd.device_status', {val: att.device_status, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.cd.playback', {val: att.playback, ack: true});                    
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.cd.repeat_stat', {val: att.repeat, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.cd.shuffle_stat', {val: att.shuffle, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.cd.playtime', {val: att.play_time, ack: true}); 
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.cd.totaltime', {val: att.total_time, ack: true}); 
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.cd.disctime', {val: att.disc_time, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.cd.tracknumber', {val: att.track_number, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.cd.totaltracks', {val: att.total_tracks, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.cd.artist', {val: att.artist, ack: true}); 
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.cd.album', {val: att.album, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.cd.track', {val: att.track, ack: true});                                         
                }
                else {adapter.log.debug('failure getting CD playinfo from  ' + devip + ' : ' +  responseFailLog(result));}
            
         });
}
function getMusicDistInfo(ip, type, uid){
        var devip = ip;
        var devtype = type;
        var devuid = uid;
        yamaha = new YamahaYXC(ip);
        yamaha.getDistributionInfo().then(function(result){
                var att = JSON.parse(result);
                if (att.response_code === 0 ){
                    adapter.log.debug('got Distribution info succesfully from ' + devip + 'with  ' + JSON.stringify(result));
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.group_id', {val: att.group_id, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.group_name', {val: att.group_name, ack: true});                    
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.role', {val: att.role, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.server_zone', {val: att.server_zone, ack: true});
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.client_list', {val: att.client_list, ack: true});                                         
                }
                else {adapter.log.debug('failure getting Distibution info from  ' + devip + ' : ' +  responseFailLog(result));}
            
         });
}
// init of device
function getMusicDeviceFeatures(ip, type, uid){
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
                    //Zone Func_list variable
                    defineZoneFunctions(devtype, devuid, zone_name, att.zone[0].func_list, att.zone[0].sound_program_list, att.zone[0].link_audio_delay_list);
                    
                    // input services and their attributes
                    defineMusicSystemInputs(devtype, devuid, att.system.input_list);
                                  
                }
                else {adapter.log.debug('failure getting features from  ' + devip + ' : ' +  responseFailLog(result));}
        });
}
//UDP update
function gotUpdate(msg, devIp){
    var dev = getConfigObjects(adapter.config.devices, 'ip', devIp);
    if (msg.netusb){
        if (msg.netusb.play_time  && adapter.config.netusbplaytime){
            adapter.setForeignState('musiccast.0.'+ dev[0].type + '_' + dev[0].uid + '.netusb.playtime', {val: msg.netusb.play_time, ack: true});
        } 
        if (msg.netusb.play_info_updated){
            getMusicNetusbInfo(devIp, dev[0].type, dev[0].uid);
        }
        if (msg.netusb.recent_info_updated){
            getMusicNetusbRecent(devIp, dev[0].type, dev[0].uid);
        }
        if (msg.netusb.preset_info_updated){
            getMusicNetusbPreset(devIp, dev[0].type, dev[0].uid);
        }           
        //if play_error todo
        
        if (msg.netusb.preset_control){
            if (msg.netusb.preset_control.result === 'success'){
                adapter.setForeignState('musiccast.0.'+ dev[0].type + '_' + dev[0].uid + '.netusb.presetrecallnumber', {val: msg.netusb.preset_control.num, ack: true});
            }
        }  
    }
    if (msg.main){
        //if signal_info_updated /main/getSignalInfo
        //if status_updated /main/getStatus
        getMusicMainInfo(devIp, dev[0].type, dev[0].uid);
    }
    if (msg.system){
        //if func_status_updated
        //if bluetooth_status_updated
        //if name_text_updated
        //if location_info_updated
    }
    if (msg.cd){
        //if device_status
        if (msg.cd.play_time  && adapter.config.cdplaytime){
            adapter.setForeignState('musiccast.0.'+ dev[0].type + '_' + dev[0].uid + '.cd.playtime', {val: msg.cd.play_time, ack: true});
        } 
        if (msg.cd.play_info_updated){
            getMusicCdInfo(devIp, dev[0].type, dev[0].uid);
        }       
    }
    if (msg.tuner){
        //if play_info_updated
        //if preset_info_updated
        //if name_text_updated
        //if location_info_updated
        //getMusicNetusbInfo(devIp, dev[0].type, dev[0].uid);
    }
    if (msg.dist){
        getMusicDistInfo(devIp, dev[0].type, dev[0].uid);
    }
    if (msg.clock){
        // /clock/getSettings
    }      
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
        getMusicDeviceFeatures(obj[anz].ip, obj[anz].type, obj[anz].uid);
        //yamaha.getNameText() evtl. um enum_room für die Zone zu setzen oder über setNameText enum_room aus admin setzen

        //yamaha.getStatus('main'); initial status of device

        // get main status
        getMusicMainInfo(obj[anz].ip, obj[anz].type, obj[anz].uid);  //must be looped if more than main zone
        // get main lists status
        getMusicZoneLists(obj[anz].ip, obj[anz].type, obj[anz].uid);  // 
        // get netusb status
        getMusicNetusbInfo(obj[anz].ip, obj[anz].type, obj[anz].uid);        

        //
    }
    const dgram = require('dgram');
    const server = dgram.createSocket('udp4');
    
    server.on('error', (err) => {
        adapter.log.error('server error:' + err.stack);
        server.close();
    });

    server.on('message', (msg, rinfo) => {
        adapter.log.debug('server got:' + msg.toString() + 'from ' + rinfo.address );
        //adapter.log.debug('server got:' + JSON.parse(msg.toString()) + 'from ' + rinfo.address );
        gotUpdate(JSON.parse(msg.toString()), rinfo.address); //erstmal noch IP, device_id ist eine andere als die in ssdp übermittelte (letze Teil von UDN)
    });
    
    server.on('listening', () => {
        adapter.log.info('socket listening ');
    });
    server.bind(41100);

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
