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
var yamaha = new YamahaYXC();

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.musiccast.0
var adapter = utils.adapter('musiccast');

function responeFailLog(response){
    switch (JSON.stringify(respose)) {
        case 1: adapter.log.debug("Response : 1 Initializing");
        case 2: adapter.log.debug("Response : 2 Internal Error");
        case 3: adapter.log.debug("Response : 3 Invalid Request (A method did not exist, a method wasn’t appropriate etc.)");
        case 4: adapter.log.debug("Response : 4 Invalid Parameter (Out of range, invalid characters etc.)");
        case 5: adapter.log.debug("Response : 5 Guarded (Unable to setup in current status etc.)");
        case 6: adapter.log.debug("Response : 6 Time Out");
        case 99: adapter.log.debug("Response : 99 Firmware Updating");
        //Streaming Service Errors
        case 100: adapter.log.debug("Response : 100 Access Error Streaming Service");
        case 101: adapter.log.debug("Response : 101 Other Errors Streaming Service");
        case 102: adapter.log.debug("Response : 102 Wrong User Name Streaming Service");
        case 103: adapter.log.debug("Response : 103 Wrong Password Streaming Service");
        case 104: adapter.log.debug("Response : 104 Account Expired Streaming Service");
        case 105: adapter.log.debug("Response : 105 Account Disconnected/Gone Off/Shut Down Streaming Service");
        case 106: adapter.log.debug("Response : 106 Account Number Reached to the Limit Streaming Service");
        case 107: adapter.log.debug("Response : 107 Server Maintenance Streaming Service");
        case 108: adapter.log.debug("Response : 108 Invalid Account Streaming Service");
        case 109: adapter.log.debug("Response : 109 License Error Streaming Service");
        case 110: adapter.log.debug("Response : 110 Read Only Mode Streaming Service");
        case 111: adapter.log.debug("Response : 111 Max Stations Streaming Service");
        case 112: adapter.log.debug("Response : 112 Access Denied Streaming Service");
    }
    return;
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
        adapter.log.debug('ack is not set! -> command');
        var tmp = id.split('.');
        var dp = tmp.pop(); //should always be "state"
        var idx = tmp.pop(); //is the name after musiccast.x.
            adapter.log.info('MusicCast: '+ id + ' identified for command');

     var yamaha = new YamahaYXC("192.168.178.52")       
        if (dp === 'power' && state === true){

            yamaha.powerOn().done(function(response) {
                if (JSON.stringify(response).response_code === '0' ){adapter.setForeignState(id, true, true);}
                else responeFailLog(response);
            });
        } else
            yamaha.powerOff().done(function(response) {
                if (JSON.stringify(response).response_code === '0' ){adapter.setForeignState(id, false, true);}
                else responeFailLog(response);
            });

        
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

        defineMusic(obj[anz].type, obj[anz].uid); //contains also the structure to musiccast.0._id_type_.
        defineMusicZone(obj[anz].type, obj[anz].uid, 'main', '60'); //contains also the structure to musiccast.0._id_type_.
        defineMusicNetusb(obj[anz].type, obj[anz].uid);
        defineMusicSystem(obj[anz].type, obj[anz].uid);
    }

    //everything is configured, make cyclic updates



    // in this musiccast all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');


    /**
     *   setState examples
     *
     *   you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
     *
     */

    // the variable testVariable is set to true as command (ack=false)
    adapter.setState('testVariable', true);

    // same thing, but the value is flagged "ack"
    // ack should be always set to true if the value is received from or acknowledged from the target system
    adapter.setState('testVariable', {val: true, ack: true});

    // same thing, but the state is deleted after 30s (getState will return null afterwards)
    adapter.setState('testVariable', {val: true, ack: true, expire: 30});



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
