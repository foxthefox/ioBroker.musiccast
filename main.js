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
        
        if (dp === 'power' && state.val === true){
            yamaha.powerOn().then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('sent power on succesfully');
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure sending ON ' +  responseFailLog(result));}
            });
        } else if (dp === 'power' && state.val === false) {
            yamaha.powerOff().then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('sent power off succesfully');
                    //adapter.setForeignState(id, false, true);
                }
                else {adapter.log.debug('failure sending OFF ' + responseFailLog(result));}
            });
        }
        if (dp === 'mute' && state.val === true){
            yamaha.muteOn().then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('sent mute on succesfully');
                    //adapter.setForeignState(id, true, true);
                }
                else {adapter.log.debug('failure mute ON ' +  responseFailLog(result));}
            });
        } else if (dp === 'mute' && state.val === false) {
            yamaha.muteOff().then(function(result) {
                if (JSON.parse(result).response_code === 0 ){
                    adapter.log.debug('sent mute off succesfully');
                    //adapter.setForeignState(id, false, true);
                }
                else {adapter.log.debug('failure mute OFF ' + responseFailLog(result));}
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
};

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
            "role": "value",
            "desc": "Volume"
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
            "role": "value",
            "desc": "Mute"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.' + zone + '.power', {
        type: 'state',
        common: {
            "name": "Power",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "value",
            "desc": "Power"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.' + zone + '.input', {
        type: 'state',
        common: {
            "name": "Input",
            "type": "string",
            "read": true,
            "write": true,
            "role": "value",
            "desc": "Input"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.' + zone + '.linkCtrl', {
        type: 'state',
        common: {
            "name": "link control",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "value",
            "desc": "link control"
        },
        native: {}
    });
}

function defineMusicSystem(type, uid){
    adapter.setObject(type + '_' + uid + '.system', {
        type: 'channel',
        common: {
            name: 'MusicCast System' + type,
            role: 'sensor'
        },
        native: {
            "addr": uid
        }
    });
    adapter.log.info('Setting up System variables of :' + type + '-' + uid);

    adapter.setObject(type + '_' + uid + '.system.inputs', {
        type: 'state',
        common: {
            "name": "Inputs",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Inputs"
        },
        native: {}
    });
    adapter.setObject(type + '_' + uid + '.system.soundProg', {
        type: 'state',
        common: {
            "name": "Sound Programs",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Sound Programs"
        },
        native: {}
    });
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
            "name": "next",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button.next",
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

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});

function main() {

    //yamaha.discover

    var obj = adapter.config.devices;  //quit adapter and restart with found config

    //check if something is not configured

    

    for (var anz in obj){

        //yamaha = New YamahaYXC(obj[anz].ip) 
        //yamaha.getSystemFeatures()
        //yamaha.getAnzRooms()
        //yamaha.getLoudspeakerSetting()
        //yamaha.getEqualizerSetting()
        
        defineMusicDevice(obj[anz].type, obj[anz].uid); //contains also the structure to musiccast.0._id_type_.
        defineMusicZone(obj[anz].type, obj[anz].uid, 'main', '60'); //contains also the structure to musiccast.0._id_type_.
        defineMusicNetUsb(obj[anz].type, obj[anz].uid);
        defineMusicSystem(obj[anz].type, obj[anz].uid);
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
