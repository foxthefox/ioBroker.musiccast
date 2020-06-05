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
const utils = require('@iobroker/adapter-core'); // Get common adapter utils
var md5 = require("md5");
var YamahaYXC = require('yamaha-yxc-nodejs');
var async = require('async');
var yamaha = null;
var yamaha2 = null;
var mcastTimeout;
var responses = [{}];

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.musiccast.0

let adapter;
function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'musiccast',
        // is called when adapter shuts down - callback has to be called under any circumstances!
        unload: function (callback) {
            try {
                adapter.log.info('cleaned everything up...');
                callback();
            } catch (e) {
                callback();
            }
        },
        // is called if a subscribed object changes
        objectChange: function (id, obj) {
            // Warning, obj can be null if it was deleted
            adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
        },
        // is called if a subscribed state changes
        stateChange: function (id, state) {
            // Warning, state can be null if it was deleted
            adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));

            // you can use the ack flag to detect if it is status (true) or command (false)
            if (state && !state.ack) {

                //hier erkennung einbauen um festzustellen ob 2 oder 3 stufige Objekthierarchie

                var tmp = id.split('.');
                var dp = tmp.pop(); //is the instance we are working on
                var idx = tmp.pop(); //is zone, system or other item
                var idy = tmp.pop(); // the device "type"_"uid"
                adapter.log.info('MusicCast: ' + id + ' identified for command with ' + state.val);

                //ermitteln der IP aus config
                adapter.log.debug('device with uid = ' + idy.split("_")[1]);
                var uid = idy.split("_")[1];
                var IP = getConfigObjects(adapter.config.devices, 'uid', uid);
                adapter.log.debug('config items : ' + JSON.stringify(adapter.config.devices));
                adapter.log.debug('IP configured : ' + IP[0].ip + ' for UID ' + uid);

                yamaha = new YamahaYXC(IP[0].ip);

                var zone = idx;

                if (dp === 'power') {
                    let convertValue = state.val ? 'on' : 'standby';

                    yamaha.power(convertValue, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent power succesfully to ' + zone + ' with ' + convertValue + '(' + state.val + ')');
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting power' + responseFailLog(result)); }
                    });
                }
                if (dp === 'mute') {
                    yamaha.mute(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent mute succesfully to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure mute cmd' + responseFailLog(result)); }
                    });
                }
                if (dp === 'surround') {
                    yamaha.surround(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent surround succesfully to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting surround' + responseFailLog(result)); }
                    });
                }
                if (dp === 'volume') {
                    yamaha.setVolumeTo(Math.round(state.val), zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent volume succesfully  to ' + zone + ' with ' + Math.round(state.val));
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure sending volume ' + responseFailLog(result)); }
                    });
                }
                if (dp === 'input') {
                    yamaha.setInput(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set input succesfully  to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting input ' + responseFailLog(result)); }
                    });
                }
                if (dp === 'low') {
                    yamaha.setEqualizer(state.val, '', '', zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set equalizer LOW succesfully  to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting EQ LOW ' + responseFailLog(result)); }
                    });
                }
                if (dp === 'mid') {
                    yamaha.setEqualizer('', state.val, '', zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set equalizer MID succesfully  to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting EQ MID ' + responseFailLog(result)); }
                    });
                }
                if (dp === 'high') {
                    yamaha.setEqualizer('', '', state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set equalizer High succesfully  to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting EQ HIGH' + responseFailLog(result)); }
                    });
                }
                if (dp === 'subwoofer_volume') {
                    yamaha.setSubwooferVolumeTo(state.val).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set subwoofer volume succesfully  to ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting subwoofer volume' + responseFailLog(result)); }
                    });
                }
                if (dp === 'bass_extension') {
                    yamaha.setBassExtension(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set Bass Extension  to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting Bass Extension' + responseFailLog(result)); }
                    });
                }
                if (dp === 'enhancer') {
                    yamaha.setEnhancer(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set Enhancer  to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting Enhancer' + responseFailLog(result)); }
                    });
                }
                if (dp === 'direct') {
                    yamaha.setDirect(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set Direct  to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting Direct' + responseFailLog(result)); }
                    });
                }
                if (dp === 'pure_direct') {
                    yamaha.setPureDirect(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set Pure Direct  to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting Pure Direct' + responseFailLog(result)); }
                    });
                }
                if (dp === 'sound_program') {
                    yamaha.setSound(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set sound program  to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting sound program' + responseFailLog(result)); }
                    });
                }
                if (dp === 'bass') {
                    yamaha.setBassTo(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set Bass to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting Bass' + responseFailLog(result)); }
                    });
                }
                if (dp === 'treble') {
                    yamaha.setTrebleTo(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set Treble to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting Treble' + responseFailLog(result)); }
                    });
                }
                if (dp === 'balance') {
                    yamaha.setBalance(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set Balance to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting Balance' + responseFailLog(result)); }
                    });
                }
                if (dp === 'sleep') {
                    yamaha.sleep(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set sleep succesfully  to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting sleep' + responseFailLog(result)); }
                    });
                }
                if (dp === 'clearVoice') {
                    yamaha.setClearVoice(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('set ClearVoice succesfully  to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting ClearVoice' + responseFailLog(result)); }
                    });
                }

                if (dp === 'link_control') {
                    yamaha.setLinkControl(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent link control to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting link control ' + responseFailLog(result)); }
                    });
                }

                if (dp === 'link_audio_delay') {
                    yamaha.setLinkAudioDelay(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent audio delay succesfully to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting audio delay ' + responseFailLog(result)); }
                    });
                }

                if (dp === 'link_audio_quality') {
                    yamaha.setLinkAudioQuality(state.val, zone).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent audio quality succesfully to ' + zone + ' with ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure setting audio quality ' + responseFailLog(result)); }
                    });
                }

                /* angeblich soll mit zone der Aufruf gehen, dann muß der Datenpunkt aber in die zonen, ansonsten hat zone=netusb
                if (dp === 'presetrecallnumber'){
                    yamaha.recallPreset(state.val, zone).then(function(result) {
                        if (JSON.parse(result).response_code === 0 ){
                            adapter.log.debug('recalled the Preset succesfully in zone  ' + zone + ' to ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else {adapter.log.debug('failure recalling Preset' +  responseFailLog(result));}
                    });
                }
                */
                if (dp === 'presetrecallnumber') {
                    yamaha.recallPreset(state.val).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('recalled the Preset succesfully to ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure recalling Preset' + responseFailLog(result)); }
                    });
                }
                if (dp === 'prev' && state.val === true) {
                    if (idx === 'netusb') {
                        yamaha.prevNet().then(function (result) {
                            if (JSON.parse(result).response_code === 0) {
                                adapter.log.debug('sent PREV  to netusb ');
                                //adapter.setForeignState(id, true, true);
                            }
                            else { adapter.log.debug('failure sending PREV to NETUSB' + responseFailLog(result)); }
                        });
                    }
                    if (idx === 'cd') {
                        yamaha.prevCD().then(function (result) {
                            if (JSON.parse(result).response_code === 0) {
                                adapter.log.debug('sent PREV  to CD ');
                                //adapter.setForeignState(id, true, true);
                            }
                            else { adapter.log.debug('failure sending PREV to CD' + responseFailLog(result)); }
                        });
                    }
                }
                if (dp === 'next' && state.val === true) {
                    if (idx === 'netusb') {
                        yamaha.nextNet().then(function (result) {
                            if (JSON.parse(result).response_code === 0) {
                                adapter.log.debug('sent NEXT  to netusb ');
                                //adapter.setForeignState(id, true, true);
                            }
                            else { adapter.log.debug('failure sending NEXT to NETUSB' + responseFailLog(result)); }
                        });
                    }
                    if (idx === 'cd') {
                        yamaha.nextCD().then(function (result) {
                            if (JSON.parse(result).response_code === 0) {
                                adapter.log.debug('sent NEXT  to CD ');
                                //adapter.setForeignState(id, true, true);
                            }
                            else { adapter.log.debug('failure sending NEXT to CD' + responseFailLog(result)); }
                        });
                    }
                }
                if (dp === 'repeat' && state.val === true) {
                    if (idx === 'netusb') {
                        yamaha.toggleNetRepeat().then(function (result) {
                            if (JSON.parse(result).response_code === 0) {
                                adapter.log.debug('sent Repeat  to netusb ');
                                //adapter.setForeignState(id, true, true);
                            }
                            else { adapter.log.debug('failure sending Repeat to NETUSB' + responseFailLog(result)); }
                        });
                    }
                    if (idx === 'cd') {
                        yamaha.toggleCDRepeat().then(function (result) {
                            if (JSON.parse(result).response_code === 0) {
                                adapter.log.debug('sent Repeat  to CD ');
                                //adapter.setForeignState(id, true, true);
                            }
                            else { adapter.log.debug('failure sending Repeat to CD' + responseFailLog(result)); }
                        });
                    }
                }
                if (dp === 'playPause') {
                    if (idx === 'netusb') {
                        adapter.getForeignState(id.replace('playPause', 'playback'), function (err, state) {
                            if (state.val === 'stop') {
                                yamaha.playNet().then(function (result) {
                                    if (JSON.parse(result).response_code === 0) {
                                        adapter.log.debug('set NETUSB Play succesfully  to ' + state.val);
                                        //adapter.setForeignState(id, true, true);
                                    }
                                    else { adapter.log.debug('failure setting NETUSB Play' + responseFailLog(result)); }
                                });
                            }
                            else {
                                yamaha.stopNet().then(function (result) {
                                    if (JSON.parse(result).response_code === 0) {
                                        adapter.log.debug('set NETUSB Stop succesfully  to ' + state.val);
                                        //adapter.setForeignState(id, true, true);
                                    }
                                    else { adapter.log.debug('failure setting NETUSB Stop' + responseFailLog(result)); }
                                });
                            }
                        });
                    }
                    if (idx === 'cd') {
                        if (state.val === true) {
                            yamaha.playCD().then(function (result) {
                                if (JSON.parse(result).response_code === 0) {
                                    adapter.log.debug('set CD Play succesfully  to ' + state.val);
                                    //adapter.setForeignState(id, true, true);
                                }
                                else { adapter.log.debug('failure setting CD Play' + responseFailLog(result)); }
                            });
                        }
                        else {
                            yamaha.stopCD().then(function (result) {
                                if (JSON.parse(result).response_code === 0) {
                                    adapter.log.debug('set CD Stop succesfully  to ' + state.val);
                                    //adapter.setForeignState(id, true, true);
                                }
                                else { adapter.log.debug('failure setting CD Stop' + responseFailLog(result)); }
                            });
                        }
                    }
                }
                if (dp === 'stop') {
                    if (idx === 'netusb') {
                        yamaha.stopNet().then(function (result) {
                            if (JSON.parse(result).response_code === 0) {
                                adapter.log.debug('set NETUSB Stop succesfully  to ' + state.val);
                                //adapter.setForeignState(id, true, true);
                            }
                            else { adapter.log.debug('failure setting NETUSB Stop' + responseFailLog(result)); }
                        });
                    }
                    if (idx === 'cd') {
                        yamaha.stopCD().then(function (result) {
                            if (JSON.parse(result).response_code === 0) {
                                adapter.log.debug('set CD Stop succesfully  to ' + state.val);
                                //adapter.setForeignState(id, true, true);
                            }
                            else { adapter.log.debug('failure setting CD Stop' + responseFailLog(result)); }
                        });
                    }
                }
                if (dp === 'shuffle' && state.val === true) {
                    if (idx === 'netusb') {
                        yamaha.toggleNetShuffle().then(function (result) {
                            if (JSON.parse(result).response_code === 0) {
                                adapter.log.debug('sent Shuffle  to netusb ');
                                //adapter.setForeignState(id, true, true);
                            }
                            else { adapter.log.debug('failure sending Shuffle to NETUSB' + responseFailLog(result)); }
                        });
                    }
                    if (idx === 'cd') {
                        yamaha.toggleCDShuffle().then(function (result) {
                            if (JSON.parse(result).response_code === 0) {
                                adapter.log.debug('sent Shuffle to CD ');
                                //adapter.setForeignState(id, true, true);
                            }
                            else { adapter.log.debug('failure sending Shuffle to CD' + responseFailLog(result)); }
                        });
                    }
                }
                if (dp === 'distr_state') {  //Start/Stop distribution
                    //startDistribution(num) als Funktion aufrufen oder hier als 
                    if (state.val === true || state.val === 'true' || state.val === 'on') {
                        var num = 1;
                        yamaha.startDistribution(num).then(function (result) {
                            if (JSON.parse(result).response_code === 0) {
                                adapter.log.debug('sent Start Distribution');
                                //adapter.setForeignState(id, true, true);
                            }
                            else { adapter.log.debug('failure sending Start Distribution' + responseFailLog(result)); }
                        });
                    }
                    if (state.val === false || state.val === 'false' || state.val === 'off') {
                        yamaha.stopDistribution(num).then(function (result) {
                            if (JSON.parse(result).response_code === 0) {
                                adapter.log.debug('sent Stop Distribution');
                                //adapter.setForeignState(id, true, true);
                            }
                            else { adapter.log.debug('failure sending Stop Distribution' + responseFailLog(result)); }
                        });
                    }
                }
                if (dp === 'add_to_group') {  //state.val enthält die IP des Masters

                    //addToGroup(state.val, IP[0].ip); 
                    var groupID = md5(state.val);
                    var clientIP = IP[0].ip;
                    adapter.log.debug('clientIP ' + clientIP + 'ID ' + groupID);

                    var clientpayload = { "group_id": groupID, "zone": ["main"] };
                    var masterpayload = { "group_id": groupID, "zone": "main", "type": "add", "client_list": [clientIP] };
                    yamaha2 = new YamahaYXC(state.val);

                    yamaha.setClientInfo(JSON.stringify(clientpayload)).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent ClientInfo : ' + clientIP);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure sending ClientInfo' + responseFailLog(result)); }
                    });

                    yamaha2.setServerInfo(JSON.stringify(masterpayload)).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent ServerInfo ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure sending ServerInfo' + responseFailLog(result)); }
                    });

                    yamaha2.startDistribution('0').then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent start ServerInfo ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure sending ServerInfo' + responseFailLog(result)); }
                    });
                }
                if (dp === 'remove_from_group') {  //state.val enthält die Master IP
                    //removeFromGroup(state.val, IP[0].ip);
                    var groupID = md5(state.val);
                    var clientIP = IP[0].ip;
                    adapter.log.debug('clientIP ' + clientIP);
                    var clientpayload = { "group_id": "", "zone": ["main"] };
                    var masterpayload = { "group_id": groupID, "zone": "main", "type": "remove", "client_list": [clientIP] };

                    yamaha2 = new YamahaYXC(state.val);

                    yamaha2.stopDistribution(num).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent Stop Distribution');
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure sending Stop Distribution' + responseFailLog(result)); }
                    });

                    yamaha.setClientInfo(JSON.stringify(clientpayload)).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent Client disconnect to : ' + clientIP);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure sending disconnect' + responseFailLog(result)); }
                    });

                    yamaha2.setServerInfo(JSON.stringify(masterpayload)).then(function (result) {
                        if (JSON.parse(result).response_code === 0) {
                            adapter.log.debug('sent ServerInfo to ' + state.val);
                            //adapter.setForeignState(id, true, true);
                        }
                        else { adapter.log.debug('failure sending ServerInfo' + responseFailLog(result)); }
                    });
                }
            }//if status
        },
        // New message arrived. obj is array with current messages
        message: function (obj) {
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
                        yamaha.discover().then(function (res) {
                            result.push({ ip: res[0], name: res[1], type: res[2], uid: res[3] });
                            adapter.log.debug('result ' + JSON.stringify(result));
                        }).done(function (res) {
                            if (obj.callback) adapter.sendTo(obj.from, obj.command, result, obj.callback);
                        });
                        wait = true;
                        break;

                    case 'jsonreq':
                        if (obj.callback) adapter.sendTo(obj.from, obj.command, responses, obj.callback); //responses wird sukzessive mit den get-Aufrufen befüllt
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
        },
        // is called when databases are connected and adapter received configuration.
        // start here!
        ready: function () {
            main();
        }

    });
    adapter = new utils.Adapter(options);

    return adapter;
};


function responseFailLog(fail) {
    var errcode = "";
    switch (JSON.parse(fail).response_code) {
        case 1: errcode = "Response : 1 Initializing"; break;
        case 2: errcode = "Response : 2 Internal Error"; break;
        case 3: errcode = "Response : 3 Invalid Request (A method did not exist, a method wasn’t appropriate etc.)"; break;
        case 4: errcode = "Response : 4 Invalid Parameter (Out of range, invalid characters etc.)"; break;
        case 5: errcode = "Response : 5 Guarded (Unable to setup in current status etc.)"; break;
        case 6: errcode = "Response : 6 Time Out"; break;
        case 99: errcode = "Response : 99 Firmware Updating"; break;
        //Streaming Service Errors
        case 100: errcode = "Response : 100 Access Error Streaming Service"; break;
        case 101: errcode = "Response : 101 Other Errors Streaming Service"; break;
        case 102: errcode = "Response : 102 Wrong User Name Streaming Service"; break;
        case 103: errcode = "Response : 103 Wrong Password Streaming Service"; break;
        case 104: errcode = "Response : 104 Account Expired Streaming Service"; break;
        case 105: errcode = "Response : 105 Account Disconnected/Gone Off/Shut Down Streaming Service"; break;
        case 106: errcode = "Response : 106 Account Number Reached to the Limit Streaming Service"; break;
        case 107: errcode = "Response : 107 Server Maintenance Streaming Service"; break;
        case 108: errcode = "Response : 108 Invalid Account Streaming Service"; break;
        case 109: errcode = "Response : 109 License Error Streaming Service"; break;
        case 110: errcode = "Response : 110 Read Only Mode Streaming Service"; break;
        case 111: errcode = "Response : 111 Max Stations Streaming Service"; break;
        case 112: errcode = "Response : 112 Access Denied Streaming Service"; break;
        default: errcode = "unknown code";
    }
    return errcode;
}

function browse(callback) {
    var result = [];
    result.push({ ip: "192.168.178.52", name: "Wohnzimmer", type: "YSP-1600", uid: "0B587073" });
    result.push({ ip: "192.168.178.56", name: "Küche", type: "WX-030", uid: "0E257883" });
    if (callback) callback(result);
}

function getConfigObjects(Obj, where, what) {
    var foundObjects = [];
    for (var prop in Obj) {
        if (Obj[prop][where] == what) {
            foundObjects.push(Obj[prop]);
        }
    }
    return foundObjects;
}

function defineMusicDevice(type, uid, name) {
    adapter.log.info('Setting up System :' + type + '-' + uid);
    adapter.setObjectNotExists(type + '_' + uid, {
        type: 'device',
        common: {
            name: 'MusicCast ' + type + ' ' + name,
            role: 'device'
        },
        native: {
            "addr": uid
        }
    });
    adapter.setObjectNotExists(type + '_' + uid + '.system', {
        type: 'channel',
        common: {
            name: 'MusicCast System Info',
            role: 'sensor'
        },
        native: {
            "addr": uid
        }
    });
    adapter.setObjectNotExists(type + '_' + uid + '.system.api_version', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.system.system_version', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.system.system_id', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.system.device_id', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.system.getDeviceInfo', {
        type: 'state',
        common: {
            "name": "Feedback of getDeviceInfo",
            "type": "object",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Feedback of getDeviceInfo"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.system.getFeatures', {
        type: 'state',
        common: {
            "name": "Feedback of getFeatures",
            "type": "object",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Feedback of getFeatures"
        },
        native: {}
    });
}
function defineMusicZoneNew(type, uid, zone, zone_arr) {
    adapter.log.info('Setting up Zone:' + zone + ' of ' + type + '-' + uid);
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone, {
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
    /*
    if (zone_arr.zone_b){
        adapter.log.debug('zone b dabei');
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.zone_b', {
            type: 'state',
            common: {
                "name": "Zone B",
                "type": "boolean",
                "read": true,
                "write": true,
                "role": "value",
                "desc": "Zone B"
            },
            native: {}
        });
    } else adapter.log.debug('zone b nicht dabei');
    */
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.getStatus', {
        type: 'state',
        common: {
            "name": "Feedback of getStatus",
            "type": "object",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Feedback of getStatus"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.disable_flags', {
        type: 'state',
        common: {
            "name": "disable_flags",
            "type": "number",
            "read": true,
            "write": false,
            "role": "level",
            "desc": "disable_flags"
        },
        native: {}
    });
    if (zone_arr.func_list.indexOf("volume") !== -1) {
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.volume', {
            type: 'state',
            common: {
                "name": "Volume",
                "type": "number",
                "min": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'volume'; })].min,
                "max": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'volume'; })].max,
                "read": true,
                "write": true,
                "role": "level.volume",
                "desc": "State and Control of Volume"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.max_volume', {
            type: 'state',
            common: {
                "name": "max Volume",
                "type": "number",
                "max": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'volume'; })].max,
                "read": true,
                "write": false,
                "role": "level",
                "desc": "max Volume"
            },
            native: {}
        });
    }
    if (zone_arr.func_list.indexOf("mute") !== -1) {
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.mute', {
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
    }
    if (zone_arr.func_list.indexOf("power") !== -1) {
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.power', {
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
    if (zone_arr.func_list.indexOf("equalizer") !== -1) {
        adapter.log.info('Setting up Equalizer in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.low', {
            type: 'state',
            common: {
                "name": "EQ Low",
                "type": "number",
                "min": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'equalizer'; })].min,
                "max": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'equalizer'; })].max,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "EQ Low"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.mid', {
            type: 'state',
            common: {
                "name": "EQ Mid",
                "type": "number",
                "min": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'equalizer'; })].min,
                "max": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'equalizer'; })].max,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "EQ Mid"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.high', {
            type: 'state',
            common: {
                "name": "EQ High",
                "type": "number",
                "min": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'equalizer'; })].min,
                "max": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'equalizer'; })].max,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "EQ High"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.eq_mode', {
            type: 'state',
            common: {
                "name": "EQ Mode",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "EQ Mode"
            },
            native: {}
        });
    }
    if (zone_arr.func_list.indexOf("sleep") !== -1) {
        adapter.log.info('Setting up sleep timer in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.sleep', {
            type: 'state',
            common: {
                "name": "Sleep Timer",
                "type": "number",
                "read": true,
                "write": true,
                "min": 0,
                "max": 120,
                "role": "level",
                "desc": "Sleep Timer"
            },
            native: {}
        });
    }
    if (zone_arr.func_list.indexOf("clear_voice") !== -1) {
        adapter.log.info('Setting up Clear Voice in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.clearVoice', {
            type: 'state',
            common: {
                "name": "Clear Voice cmd",
                "type": "boolean",
                "read": true,
                "write": true,
                "role": "button",
                "desc": "Clear Voice cmd"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.clear_voice', {
            type: 'state',
            common: {
                "name": "Clear Voice status",
                "type": "boolean",
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "Clear Voice status"
            },
            native: {}
        });
    }
    if (zone_arr.func_list.indexOf("direct") !== -1) {
        adapter.log.info('Setting up direct in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.direct', {
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
    if (zone_arr.func_list.indexOf("pure_direct") !== -1) {
        adapter.log.info('Setting up pure_direct in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.pure_direct', {
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
    if (zone_arr.func_list.indexOf("enhancer") !== -1) {
        adapter.log.info('Setting up pure_direct in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.enhancer', {
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
    if (zone_arr.func_list.indexOf("tone_control") !== -1) {
        adapter.log.info('Setting up tone_control in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.treble', {
            type: 'state',
            common: {
                "name": "treble", //name from system/get Features
                "type": "number",
                "min": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'tone_control'; })].min,
                "max": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'tone_control'; })].max,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "treble"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.bass', {
            type: 'state',
            common: {
                "name": "bass",
                "type": "number",
                "min": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'tone_control'; })].min,
                "max": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'tone_control'; })].max,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "bass"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.tone_control_mode_list', {
            type: 'state',
            common: {
                "name": "Tone Control Mode options",
                "type": "array",
                "read": true,
                "write": false,
                "role": "list",
                "desc": "Tone Control Mode options"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.tone_mode', {
            type: 'state',
            common: {
                "name": "Tone control mode",
                "type": "string",
                "read": true,
                "write": true,
                "value": zone_arr.tone_control_mode_list,
                "role": "text",
                "desc": "Tone control mode"
            },
            native: {}
        });
    }
    if (zone_arr.func_list.indexOf("balance") !== -1) {
        adapter.log.info('Setting up balance in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.balance', {
            type: 'state',
            common: {
                "name": "balance",
                "type": "number",
                "min": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'balance'; })].min,
                "max": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'balance'; })].max,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "balance"
            },
            native: {}
        });
    }
    if (zone_arr.func_list.indexOf("dialogue_level") !== -1) {
        adapter.log.info('Setting up dialogue_level in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.dialogue_level', {
            type: 'state',
            common: {
                "name": "dialogue_level",
                "type": "number",
                "min": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'dialogue_level'; })].min,
                "max": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'dialogue_level'; })].max,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "dialogue_level"
            },
            native: {}
        });
    }
    if (zone_arr.func_list.indexOf("dialogue_lift") !== -1) {
        adapter.log.info('Setting up dialogue_lift in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.dialogue_lift', {
            type: 'state',
            common: {
                "name": "dialogue_lift",
                "type": "number",
                "min": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'dialogue_lift'; })].min,
                "max": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'dialogue_lift'; })].max,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "dialogue_lift"
            },
            native: {}
        });
    }
    if (zone_arr.func_list.indexOf("subwoofer_volume") !== -1) {
        adapter.log.info('Setting up subwoofer_volume in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.subwoofer_volume', {
            type: 'state',
            common: {
                "name": "subwoofer_volume",
                "type": "number",
                "min": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'subwoofer_volume'; })].min,
                "max": zone_arr.range_step[zone_arr.range_step.findIndex(function (row) { return row.id == 'subwoofer_volume'; })].max,
                "read": true,
                "write": true,
                "role": "level",
                "desc": "subwoofer_volume"
            },
            native: {}
        });
    }
    if (zone_arr.func_list.indexOf("bass_extension") !== -1) {
        adapter.log.info('Setting up bass_extension in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.bass_extension', {
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
    if (zone_arr.func_list.indexOf("scene") !== -1) {
        adapter.log.info('Setting up scene in Zone:' + zone + ' of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.scene_num', {
            type: 'state',
            common: {
                "name": "scene #",
                "type": "number",
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "scene #"
            },
            native: {}
        });
        adapter.setForeignState('musiccast.0.' + type + '_' + uid + '.' + zone + '.scene_num', { val: zone_arr.scene_num, ack: true });
    }
    if (zone_arr.func_list.indexOf("contents_display") !== -1) {
        adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.contents_display', {
            type: 'state',
            common: {
                "name": "contents_display",
                "type": "boolean",
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "contents_display"
            },
            native: {}
        });
    }
    if (zone_arr.func_list.indexOf("signal_info") !== -1) {
        // signal info audio ....
    }
}
function defineMusicInputs(type, uid, zone, inputs) {
    adapter.log.info('Setting up Inputs in Zone:' + zone + ' of ' + type + '-' + uid);
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.input_list', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.input', {
        type: 'state',
        common: {
            "name": "Input selection",
            "type": "string",
            "read": true,
            "write": true,
            "values": inputs,
            "role": "text",
            "desc": "Input selection"
        },
        native: {}
    });
}
function defineMusicLinkCtrl(type, uid, zone, ctrl) {
    adapter.log.info('Setting up Link Control in Zone:' + zone + ' of ' + type + '-' + uid);
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.link_control_list', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.link_control', {
        type: 'state',
        common: {
            "name": "link control selection",
            "type": "string",
            "read": true,
            "write": true,
            "values": ctrl,
            "role": "text",
            "desc": "link control selection"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.distribution_enable', {
        type: 'state',
        common: {
            "name": "distribution enable",
            "type": "boolean",
            "read": true,
            "write": false,
            "role": "indicator",
            "desc": "distribution enable"
        },
        native: {}
    });
    /**zusatzobjekte für mc_link 
    */
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.group_id', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.group_name', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.role', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.server_zone', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.client_list', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.add_to_group', {
        type: 'state',
        common: {
            "name": "MC Link add client",
            "type": "string",
            "read": false,
            "write": true,
            "role": 'text',
            "desc": 'Add a Zone to MClink distribution'
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.remove_from_group', {
        type: 'state',
        common: {
            "name": "MC Link remove client",
            "type": "string",
            "read": false,
            "write": true,
            "role": 'text',
            "desc": 'Remove a Zone from MClink distribution'
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.distr_state', {
        type: 'state',
        common: {
            "name": "MC Link distribution start/stop",
            "type": "boolean",
            "read": false,
            "write": true,
            "role": 'switch',
            "desc": 'Start/stop MC Link distribution'
        },
        native: {}
    });
}
function defineMusicSoundProg(type, uid, zone, func_list, soundoptions) {
    adapter.log.info('Setting up SoundProgramm in Zone:' + zone + ' of ' + type + '-' + uid);
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.sound_program_list', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.sound_program', {
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
function defineMusicSurroundDec(type, uid, zone, func_list, surroundoptions) {
    adapter.log.info('Setting up Surround in Zone:' + zone + ' of ' + type + '-' + uid);
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.surr_decoder_type_list', {
        type: 'state',
        common: {
            "name": "Surround options",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Surround options"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.surr_decoder_type', {
        type: 'state',
        common: {
            "name": "Surround selection",
            "type": "string",
            "read": true,
            "write": true,
            "values": surroundoptions,
            "role": "text",
            "desc": "Surround selection"
        },
        native: {}
    });
}
function defineMusicAudioSelect(type, uid, zone, func_list, audiooptions) {
    adapter.log.info('Setting up Audio Selection in Zone:' + zone + ' of ' + type + '-' + uid);
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.audio_select_list', {
        type: 'state',
        common: {
            "name": "Audio Selcetion options",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Audio Selcetion options"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.audio_select', {
        type: 'state',
        common: {
            "name": "Audio selection",
            "type": "string",
            "read": true,
            "write": true,
            "values": audiooptions,
            "role": "text",
            "desc": "Audio selection"
        },
        native: {}
    });
}
function defineMusicPartyMode(type, uid, zone) {
    adapter.log.info('Setting up Party Mode in Zone:' + zone + ' of ' + type + '-' + uid);
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.party_enable', {
        type: 'state',
        common: {
            "name": "party_enable",
            "type": "boolean",
            "read": true,
            "write": false,
            "role": "indicator",
            "desc": "party_enable"
        },
        native: {}
    });
}
function defineMusicActualVolume(type, uid, zone, func_list, actvolumeoptions, range_step) {
    adapter.log.info('Setting up Actual Volume in Zone:' + zone + ' of ' + type + '-' + uid);
    adapter.log.info('Setting up Actual Volume in Zone:' + zone + ' of ' + type + '-' + uid);
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.actual_volume_mode_list', {
        type: 'state',
        common: {
            "name": "Actual volume mode options",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Actual volume mode options"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.act_vol_mode', {
        type: 'state',
        common: {
            "name": "Actual Volume Mode",
            "type": "string",
            "read": true,
            "write": true,
            "values": actvolumeoptions,
            "role": "text",
            "desc": "Actual Volume Mode"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.act_vol_val', {
        type: 'state',
        common: {
            "name": "Actual Volume db",
            "type": "number",
            "min": range_step[range_step.findIndex(function (row) { return row.id == 'actual_volume_db'; })].min,
            "max": range_step[range_step.findIndex(function (row) { return row.id == 'actual_volume_db'; })].max,
            "read": true,
            "write": true,
            "role": "level.volume",
            "desc": "State and Control of Volume db"
        },
        native: {}
    });

    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.act_vol_unit', {
        type: 'state',
        common: {
            "name": "Actual Volume Unit",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "Actual Volume Unit"
        },
        native: {}
    });
}
function defineMusicLinkAudioDelay(type, uid, zone, func_list, linkaudiolist) {
    adapter.log.info('Setting up link_audio_delay in Zone:' + zone + ' of ' + type + '-' + uid);
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.link_audio_delay', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.link_audio_delay_list', {
        type: 'state',
        common: {
            "name": "link_audio_delay_list",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "link_audio_delay_list"
        },
        native: {}
    });
}
function defineMusicLinkAudioQuality(type, uid, zone, func_list, linkaudiolist) {
    adapter.log.info('Setting up link_audio_quality in Zone:' + zone + ' of ' + type + '-' + uid);
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.link_audio_quality', {
        type: 'state',
        common: {
            "name": "link_audio_quality",
            "type": "string",
            "read": true,
            "write": true,
            "values": linkaudiolist,
            "role": "text",
            "desc": "link_audio_quality"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.' + zone + '.link_audio_quality_list', {
        type: 'state',
        common: {
            "name": "link_audio_quality_list",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "link_audio_quality_list"
        },
        native: {}
    });
}
function defineMusicSystemInputs(type, uid, sysinputs) {
    adapter.log.debug(type + ' has number of system inputs : ' + sysinputs.length);
    for (var i = 0; i < sysinputs.length; i++) {
        adapter.log.info(type + ' setting up input : ' + sysinputs[i].id);
        adapter.setObjectNotExists(type + '_' + uid + '.system.inputs.' + sysinputs[i].id, {
            type: 'channel',
            common: {
                name: 'Input ' + sysinputs[i].id,
                role: 'sensor'
            },
            native: {
                "addr": uid
            }
        });
        adapter.setObjectNotExists(type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.distribution_enable', {
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
        adapter.setObjectNotExists(type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.account_enable', {
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
        adapter.setObjectNotExists(type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.play_info_type', {
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
        adapter.setForeignState('musiccast.0.' + type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.distribution_enable', { val: sysinputs[i].distribution_enable, ack: true });
        adapter.setForeignState('musiccast.0.' + type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.account_enable', { val: sysinputs[i].account_enable, ack: true });
        adapter.setForeignState('musiccast.0.' + type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.play_info_type', { val: sysinputs[i].play_info_type, ack: true });
    }
}
function defineMusicNetUsb(type, uid) {
    adapter.setObjectNotExists(type + '_' + uid + '.netusb', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.getPlayInfo', {
        type: 'state',
        common: {
            "name": "Feedback of getPlayInfo",
            "type": "object",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Feedback of getPlayInfo"
        },
        native: {}
    });

    adapter.setObjectNotExists(type + '_' + uid + '.netusb.playPause', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.playback', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.stop', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.next', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.prev', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.shuffle', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.shuffle_stat', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.repeat', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.repeat_stat', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.artist', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.album', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.track', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.albumart_url', {
        type: 'state',
        common: {
            "name": "albumart url",  //ip of device + albumarturl
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "albumart url"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.input', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.play_queue_type', {
        type: 'state',
        common: {
            "name": "queue type netusb",
            "type": "string",
            "read": true,
            "write": false,
            "role": "text",
            "desc": "queue type netusb"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.play_time', {
        type: 'state',
        common: {
            "name": "played  time",
            "type": "number",
            "read": true,
            "write": false,
            "unit": "s",
            "role": "value",
            "desc": "played time"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.total_time', {
        type: 'state',
        common: {
            "name": "total time played",
            "type": "number",
            "read": true,
            "write": false,
            "unit": "s",
            "role": "value",
            "desc": "total time played"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.recent_info', {
        type: 'state',
        common: {
            "name": "netusb playback history",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "netusb playback history"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.preset_info', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.presetrecallnumber', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.usb_devicetype', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.attribute', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.auto_stopped', {
        type: 'state',
        common: {
            "name": "automatically stopped",
            "type": "boolean",
            "read": true,
            "write": false,
            "role": "value",
            "desc": "automatically stopped"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.repeat_available', {
        type: 'state',
        common: {
            "name": "netusb array repeat",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "netusb array repeat"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.netusb.shuffle_available', {
        type: 'state',
        common: {
            "name": "netusb array shuffle",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "netusb array shuffle"
        },
        native: {}
    });
}
function defineMusicCD(type, uid) {
    adapter.setObjectNotExists(type + '_' + uid + '.cd', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.getPlayInfo', {
        type: 'state',
        common: {
            "name": "Feedback of getPlayInfo",
            "type": "object",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Feedback of getPlayInfo"
        },
        native: {}
    });

    adapter.setObjectNotExists(type + '_' + uid + '.cd.playPause', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.stop', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.next', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.prev', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.shuffle', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.shuffle_stat', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.repeat', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.repeat_stat', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.device_status', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.playback', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.play_time', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.total_time', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.disc_time', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.track_number', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.total_tracks', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.artist', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.album', {
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
    adapter.setObjectNotExists(type + '_' + uid + '.cd.track', {
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
function defineMusicTuner(type, uid, func_list, range_step, preset) {
    adapter.setObjectNotExists(type + '_' + uid + '.tuner', {
        type: 'channel',
        common: {
            name: 'MusicCast Tuner ' + type,
            role: 'sensor'
        },
        native: {
            "addr": uid
        }
    });
    adapter.setObjectNotExists(type + '_' + uid + '.tuner.getPlayInfo', {
        type: 'state',
        common: {
            "name": "Feedback of getPlayInfo",
            "type": "object",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Feedback of getPlayInfo"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.tuner.common_preset_info', {
        type: 'state',
        common: {
            "name": "Tuner Common favourites",
            "type": "array",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Tuner Common favourites"
        },
        native: {}
    });
    if (func_list.indexOf("am") !== -1) {
        adapter.log.info('Setting up AM Tuner of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.am.preset_info', {
            type: 'state',
            common: {
                "name": "Tuner AM favourites",
                "type": "array",
                "read": true,
                "write": false,
                "role": "list",
                "desc": "Tuner AM favourites"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.am.preset', {
            type: 'state',
            common: {
                "name": "AM Preset number",
                "type": "number",
                "min": 0,
                "max": 40, //eigentlich von getFeatures range_step[range_step.indexOf(preset)].max
                "read": true,
                "write": true,
                "role": "level",
                "desc": "AM preset number"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.am.freq', {
            type: 'state',
            common: {
                "name": "AM Frequency",
                "type": "number",
                "min": range_step[range_step.findIndex(function (row) { return row.id == 'am'; })].min,
                "max": range_step[range_step.findIndex(function (row) { return row.id == 'am'; })].max,
                "step": 9,
                "unit": "kHz",
                "read": true,
                "write": true,
                "role": "level",
                "desc": "AM Frequency"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.am.tuned', {
            type: 'state',
            common: {
                "name": "AM tuned",
                "type": "boolean",
                "read": true,
                "write": false,
                "role": "switch",
                "desc": "AM tuned"
            },
            native: {}
        });
    }
    if (func_list.indexOf("fm") !== -1) {
        adapter.log.info('Setting up FM Tuner of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.fm.preset_info', {
            type: 'state',
            common: {
                "name": "Tuner FM favourites",
                "type": "array",
                "read": true,
                "write": false,
                "role": "list",
                "desc": "Tuner FM favourites"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.fm.preset', {
            type: 'state',
            common: {
                "name": "FM Preset number",
                "type": "number",
                "min": 0,
                "max": 40, //eigentlich von getFeatures range_step[range_step.indexOf(preset)].max
                "read": true,
                "write": true,
                "role": "level",
                "desc": "FM preset number"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.fm.freq', {
            type: 'state',
            common: {
                "name": "FM Frequency",
                "type": "number",
                "min": range_step[range_step.findIndex(function (row) { return row.id == 'fm'; })].min,
                "max": range_step[range_step.findIndex(function (row) { return row.id == 'fm'; })].max,
                "step": 50,
                "unit": "kHz",
                "read": true,
                "write": true,
                "role": "level",
                "desc": "FM Frequency"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.fm.tuned', {
            type: 'state',
            common: {
                "name": "FM tuned",
                "type": "boolean",
                "read": true,
                "write": false,
                "role": "switch",
                "desc": "FM tuned"
            },
            native: {}
        });
    }
    if (func_list.indexOf("rds") !== -1) {
        adapter.log.info('Setting up RDS Tuner of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.rds.program_type', {
            type: 'state',
            common: {
                "name": "RDS program type",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "RDS program type"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.rds.program_service', {
            type: 'state',
            common: {
                "name": "RDS program_service",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "RDS program_service"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.rds.radio_text_a', {
            type: 'state',
            common: {
                "name": "RDS Radio Text A",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "RDS Radio Text A"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.rds.radio_text_b', {
            type: 'state',
            common: {
                "name": "RDS Radio Text B",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "RDS Radio Text B"
            },
            native: {}
        });
    }
    if (func_list.indexOf("dab") !== -1) {
        adapter.log.info('Setting up DAB Tuner of ' + type + '-' + uid);
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.preset_info', {
            type: 'state',
            common: {
                "name": "Tuner DAB favourites",
                "type": "array",
                "read": true,
                "write": false,
                "role": "list",
                "desc": "Tuner DAB favourites"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.preset', {
            type: 'state',
            common: {
                "name": "DAB Preset number",
                "type": "number",
                "min": 0,
                "max": 40, //eigentlich von getFeatures
                "read": true,
                "write": true,
                "role": "level",
                "desc": "DAB preset number"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.id', {
            type: 'state',
            common: {
                "name": "DAB Station ID",
                "type": "number",
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "DAB Station ID"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.status', {
            type: 'state',
            common: {
                "name": "DAB Status",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "DAB Status"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.freq', {
            type: 'state',
            common: {
                "name": "DAB Frequency",
                "type": "number",
                "min": 174000,
                "max": 240000,
                "unit": "kHz",
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "DAB Frequency"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.category', {
            type: 'state',
            common: {
                "name": "DAB Category",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "DAB category"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.audio_mode', {
            type: 'state',
            common: {
                "name": "DAB audio_mode",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "DAB audio_mode"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.bit_rate', {
            type: 'state',
            common: {
                "name": "DAB Bit Rate",
                "type": "number",
                "min": 32,
                "max": 256,
                "unit": "kbps",
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "DAB Bit Rate"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.quality', {
            type: 'state',
            common: {
                "name": "DAB quality",
                "type": "number",
                "min": 0,
                "max": 100,
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "DAB quality"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.tune_aid', {
            type: 'state',
            common: {
                "name": "DAB signal strength",
                "type": "number",
                "min": 0,
                "max": 100,
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "DAB signal strength"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.off_air', {
            type: 'state',
            common: {
                "name": "DAB Off Air Status",
                "type": "boolean",
                "read": true,
                "write": false,
                "role": "switch",
                "desc": "DAB Off Air Status"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.dab_plus', {
            type: 'state',
            common: {
                "name": "DAB+ Status",
                "type": "boolean",
                "read": true,
                "write": false,
                "role": "switch",
                "desc": "DAB+ Status"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.audio_mode', {
            type: 'state',
            common: {
                "name": "DAB Audio Mode", //mono/stereo
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "DAB Audio Mode"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.program_type', {
            type: 'state',
            common: {
                "name": "DAB Program Type",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "DAB Program Type"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.ch_label', {
            type: 'state',
            common: {
                "name": "DAB CH label",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "DAB CH label"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.service_label', {
            type: 'state',
            common: {
                "name": "DAB Service label",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "DAB Service label"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.dls', {
            type: 'state',
            common: {
                "name": "DAB DLS",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "DAB DLS"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.ensemble_label', {
            type: 'state',
            common: {
                "name": "DAB ensemble label",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "DAB ensemble label"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.initial_scan_progress', {
            type: 'state',
            common: {
                "name": "DAB initial scan progress",
                "type": "number",
                "min": 0,
                "max": 100,
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "DAB initial scan progress"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.tuner.dab.total_station_num', {
            type: 'state',
            common: {
                "name": "DAB total station number",
                "type": "number",
                "min": 0,
                "max": 255,
                "read": true,
                "write": false,
                "role": "indicator",
                "desc": "DAB total station number"
            },
            native: {}
        });
    }
}
function defineMusicClock(type, uid, func_list, range_step, alarm_fade_type_num, alarm_mode_list, alarm_input_list, alarm_preset_list) {
    adapter.setObjectNotExists(type + '_' + uid + '.clock', {
        type: 'channel',
        common: {
            name: 'MusicCast Clock ' + type,
            role: 'sensor'
        },
        native: {
            "addr": uid
        }
    });
    adapter.log.info('Setting up Clock of :' + type + '-' + uid);
    //generic clock objects
    adapter.setObjectNotExists(type + '_' + uid + '.clock.getSettings', {
        type: 'state',
        common: {
            "name": "Feedback of getStatus",
            "type": "object",
            "read": true,
            "write": false,
            "role": "list",
            "desc": "Feedback of getStatus"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.clock.auto_sync', {
        type: 'state',
        common: {
            "name": "Clock time auto sync",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button",
            "desc": "Clock time auto sync"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.clock.format', {
        type: 'state',
        common: {
            "name": "Clock format time display",
            "type": "string",
            "read": true,
            "write": true,
            "role": "text",
            "desc": "Clock format time display"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.clock.alarm_on', {
        type: 'state',
        common: {
            "name": "Clock Alarm function on/off",
            "type": "boolean",
            "read": true,
            "write": true,
            "role": "button",
            "desc": "Clock Alarm function on/off"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.clock.volume', {
        type: 'state',
        common: {
            "name": "Clock Alarm volume",
            "type": "number",
            "min": range_step[range_step.findIndex(function (row) { return row.id == 'alarm_volume'; })].min,
            "max": range_step[range_step.findIndex(function (row) { return row.id == 'alarm_volume'; })].max,
            "step": 1, //eigentlich von getFeatures range_step[range_step.indexOf(alarm_volume)].step
            "read": true,
            "write": true,
            "role": "level",
            "desc": "Clock Alarm volume"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.clock.fade_interval', {
        type: 'state',
        common: {
            "name": "Clock Alarm Fade Interval",
            "type": "number",
            "min": range_step[range_step.findIndex(function (row) { return row.id == 'alarm_fade'; })].min,
            "max": range_step[range_step.findIndex(function (row) { return row.id == 'alarm_fade'; })].max,
            "read": true,
            "write": true,
            "role": "level",
            "desc": "Clock Alarm Fade Interval"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.clock.fade_type', {
        type: 'state',
        common: {
            "name": "Clock Fade Type",
            "type": "number",
            "min": 0, //eigentlich von getFeatures
            "max": 9, //eigentlich von getFeatures alarm_fade_type_numbers
            "read": true,
            "write": true,
            "role": "level",
            "desc": "Clock Alarm Fade Type"
        },
        native: {}
    });
    adapter.setObjectNotExists(type + '_' + uid + '.clock.mode', {
        type: 'state',
        common: {
            "name": "Clock Alarm Mode", // oneday/weekly
            "type": "string",
            "read": true,
            "write": true,
            "role": "text",
            "desc": "Clock Alarm Mode"
        },
        native: {}
    });

    //day related clock objects
    if (alarm_mode_list.indexOf("oneday") !== -1) {
        adapter.setObjectNotExists(type + '_' + uid + '.clock.oneday.enable', {
            type: 'state',
            common: {
                "name": "Clock Oneday Alarm Enable",
                "type": "boolean",
                "read": true,
                "write": true,
                "role": "button",
                "desc": "Clock Oneday Alarm Enable"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.clock.oneday.time', {
            type: 'state',
            common: {
                "name": "Clock Oneday Alarm Time",
                "type": "string",
                "read": true,
                "write": true,
                "role": "text",
                "desc": "Clock Oneday Alarm Time"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.clock.oneday.beep', {
            type: 'state',
            common: {
                "name": "Clock Oneday Alarm Beep",
                "type": "boolean",
                "read": true,
                "write": true,
                "role": "button",
                "desc": "Clock Oneday Alarm Beep"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.clock.oneday.playback_type', {
            type: 'state',
            common: {
                "name": "Clock Oneday Alarm Playback Type",
                "type": "string",
                "read": true,
                "write": true,
                "role": "text",
                "desc": "Clock Oneday Alarm Playback Type"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.clock.oneday.resume_input', {
            type: 'state',
            common: {
                "name": "Clock Oneday Alarm Resume Input",
                "type": "string",
                "read": true,
                "write": true,
                "role": "text",
                "desc": "Clock Oneday Alarm Resume Input"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.clock.oneday.preset_type', {
            type: 'state',
            common: {
                "name": "Clock Oneday Alarm Preset Type",
                "type": "string",
                "read": true,
                "write": true,
                "role": "text",
                "desc": "Clock Oneday Alarm Preset Type"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.clock.oneday.preset_num', {
            type: 'state',
            common: {
                "name": "Clock Oneday Alarm Preset Number",
                "type": "number",
                "min": 0, //eigentlich von getFeatures
                "max": 40, //eigentlich von getFeatures
                "read": true,
                "write": true,
                "role": "level",
                "desc": "Clock Oneday Alarm Preset Number"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.clock.oneday.preset_netusb_input', {
            type: 'state',
            common: {
                "name": "Clock Oneday Alarm Netusb input ID",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "Clock Oneday Alarm Netusb input ID"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.clock.oneday.preset_netusb_text', {
            type: 'state',
            common: {
                "name": "Clock Oneday Alarm Netusb input text",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "Clock Oneday Alarm Netusb input text"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.clock.oneday.preset_tuner_band', {
            type: 'state',
            common: {
                "name": "Clock Oneday Alarm Tuner Band",
                "type": "string",
                "read": true,
                "write": false,
                "role": "text",
                "desc": "Clock Oneday Alarm Tuner Band"
            },
            native: {}
        });
        adapter.setObjectNotExists(type + '_' + uid + '.clock.oneday.preset_tuner_number', {
            type: 'state',
            common: {
                "name": "Clock Oneday Alarm Preset Tuner Freq od ID",
                "type": "number",
                "min": 0, //eigentlich von getFeatures
                "max": 40, //eigentlich von getFeatures
                "read": true,
                "write": true,
                "role": "level",
                "desc": "Clock Oneday Alarm Preset Tuner Freq or ID"
            },
            native: {}
        });
    }

    if (alarm_mode_list.indexOf("weekly") !== -1) {
        var days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
        for (anz in days) {
            //loop days[anz]
            adapter.setObjectNotExists(type + '_' + uid + '.clock.' + days[anz] + '.enable', {
                type: 'state',
                common: {
                    "name": "Clock" + days[anz] + "Alarm Enable",
                    "type": "boolean",
                    "read": true,
                    "write": true,
                    "role": "button",
                    "desc": "Clock" + days[anz] + "Alarm Enable"
                },
                native: {}
            });
            adapter.setObjectNotExists(type + '_' + uid + '.clock.' + days[anz] + '.time', {
                type: 'state',
                common: {
                    "name": "Clock" + days[anz] + "Alarm Time",
                    "type": "string",
                    "read": true,
                    "write": true,
                    "role": "text",
                    "desc": "Clock" + days[anz] + "Alarm Time"
                },
                native: {}
            });
            adapter.setObjectNotExists(type + '_' + uid + '.clock.' + days[anz] + '.beep', {
                type: 'state',
                common: {
                    "name": "Clock" + days[anz] + "Alarm Beep",
                    "type": "boolean",
                    "read": true,
                    "write": true,
                    "role": "button",
                    "desc": "Clock" + days[anz] + "Alarm Beep"
                },
                native: {}
            });
            adapter.setObjectNotExists(type + '_' + uid + '.clock.' + days[anz] + '.playback_type', {
                type: 'state',
                common: {
                    "name": "Clock" + days[anz] + "Alarm Playback Type",
                    "type": "string",
                    "read": true,
                    "write": true,
                    "role": "text",
                    "desc": "Clock" + days[anz] + "Alarm Playback Type"
                },
                native: {}
            });
            adapter.setObjectNotExists(type + '_' + uid + '.clock.' + days[anz] + '.resume_input', {
                type: 'state',
                common: {
                    "name": "Clock" + days[anz] + "Alarm Resume Input",
                    "type": "string",
                    "read": true,
                    "write": true,
                    "role": "text",
                    "desc": "Clock" + days[anz] + "Alarm Resume Input"
                },
                native: {}
            });
            adapter.setObjectNotExists(type + '_' + uid + '.clock.' + days[anz] + '.preset_type', {
                type: 'state',
                common: {
                    "name": "Clock" + days[anz] + "Alarm Preset Type",
                    "type": "string",
                    "read": true,
                    "write": true,
                    "role": "text",
                    "desc": "Clock" + days[anz] + "Alarm Preset Type"
                },
                native: {}
            });
            adapter.setObjectNotExists(type + '_' + uid + '.clock.' + days[anz] + '.preset_num', {
                type: 'state',
                common: {
                    "name": "Clock" + days[anz] + "Alarm Preset Number",
                    "type": "number",
                    "min": 0, //eigentlich von getFeatures
                    "max": 40, //eigentlich von getFeatures
                    "read": true,
                    "write": true,
                    "role": "level",
                    "desc": "Clock" + days[anz] + "Alarm Preset Number"
                },
                native: {}
            });
            adapter.setObjectNotExists(type + '_' + uid + '.clock.' + days[anz] + '.preset_netusb_input', {
                type: 'state',
                common: {
                    "name": "Clock" + days[anz] + "Alarm Netusb input ID",
                    "type": "string",
                    "read": true,
                    "write": false,
                    "role": "text",
                    "desc": "Clock" + days[anz] + "Alarm Netusb input ID"
                },
                native: {}
            });
            adapter.setObjectNotExists(type + '_' + uid + '.clock.' + days[anz] + '.preset_netusb_text', {
                type: 'state',
                common: {
                    "name": "Clock" + days[anz] + "Alarm Netusb input text",
                    "type": "string",
                    "read": true,
                    "write": false,
                    "role": "text",
                    "desc": "Clock" + days[anz] + "Alarm Netusb input text"
                },
                native: {}
            });
            adapter.setObjectNotExists(type + '_' + uid + '.clock.' + days[anz] + '.preset_tuner_band', {
                type: 'state',
                common: {
                    "name": "Clock" + days[anz] + "Alarm Tuner Band",
                    "type": "string",
                    "read": true,
                    "write": false,
                    "role": "text",
                    "desc": "Clock" + days[anz] + "Alarm Tuner Band"
                },
                native: {}
            });
            adapter.setObjectNotExists(type + '_' + uid + '.clock.' + days[anz] + '.preset_tuner_number', {
                type: 'state',
                common: {
                    "name": "Clock" + days[anz] + "Alarm Preset Tuner Freq od ID",
                    "type": "number",
                    "min": 0, //eigentlich von getFeatures
                    "max": 40, //eigentlich von getFeatures
                    "read": true,
                    "write": true,
                    "role": "level",
                    "desc": "Clock" + days[anz] + "Alarm Preset Tuner Freq or ID"
                },
                native: {}
            });
        }
    }
}
// status requests
function getMusicDeviceInfo(ip, type, uid) {
    var devip = ip;
    var devtype = type;
    var devuid = uid;
    yamaha = new YamahaYXC(ip);
    yamaha.getDeviceInfo().then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            adapter.log.debug('got device info succesfully from ' + devip);


            var resp = { "device": devtype + '_' + devuid, "request": "/system/getDeviceInfo", "responses": att }
            if (!responses.find(o => o.device === devtype + '_' + devuid && o.request === '/system/getDeviceInfo')) responses.push(resp)
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.system.getDeviceInfo', { val: att, ack: true });

            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.system.api_version', { val: att.api_version, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.system.system_version', { val: att.system_version, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.system.system_id', { val: att.system_id, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.system.device_id', { val: att.device_id, ack: true });
        }
        else { adapter.log.debug('failure getting device info from  ' + devip + ' : ' + responseFailLog(result)); }

    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicDeviceInfo] error: ${err.message}, stack: ${err.stack}`);
        }
    });
}
function getMusicZoneInfo(ip, type, uid, zone) {
    var devip = ip;
    var devtype = type;
    var devuid = uid;
    var zone_name = zone || 'main';
    yamaha = new YamahaYXC(ip);
    yamaha.getStatus(zone_name).then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            adapter.log.debug('got status info succesfully from ' + devip + ' for ' + zone_name);

            var resp = { "device": devtype + '_' + devuid, "request": "/" + zone_name + "/getStatus", "responses": att }
            if (!responses.find(o => o.device === devtype + '_' + devuid && o.request === '/' + zone_name + '/getStatus')) responses.push(resp)
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.getStatus', { val: att, ack: true });

            for (var key in att) {

                if (key == "tone_control") {
                    var tone = att[key];
                    for (var id in tone) {
                        adapter.log.debug('Zone Status Update ' + key + ' ' + id + '  at ' + tone[id]);
                        if (id == "mode") {
                            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.tone_mode', { val: tone[id], ack: true });
                        }
                        else {
                            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.' + id, { val: tone[id], ack: true });
                        }
                    }
                }
                else if (key == "equalizer") {
                    var eq = att[key];
                    for (var id in eq) {
                        adapter.log.debug('Zone Status Update ' + key + ' ' + id + '  at ' + eq[id]);
                        if (id == "mode") {
                            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.eq_mode', { val: eq[id], ack: true });
                        }
                        else {
                            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.' + id, { val: eq[id], ack: true });
                        }
                    }
                }
                else if (key == "actual_volume") {
                    adapter.log.debug('Zone Status Update ' + key + ' ' + id + '  at ' + att[key]);
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.act_vol_mode', { val: att[key].mode, ack: true });
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.act_vol_val', { val: att[key].value, ack: true });
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.act_vol_unit', { val: att[key].unit, ack: true });
                } else if (key == "power") {
                    let convertValue = att[key] === 'on' ? true : false;

                    adapter.log.debug('Zone Status Update ' + key + '  at ' + att[key] + ' (' + convertValue + ')');
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.' + key, { val: convertValue, ack: true });
                } else {
                    adapter.log.debug('Zone Status Update ' + key + '  at ' + att[key]);
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.' + key, { val: att[key], ack: true });
                }
            }
        }
        else { adapter.log.debug('failure getting status info from  ' + devip + ' : ' + responseFailLog(result)); }

    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicZoneInfo] error: ${err.message}, stack: ${err.stack}`);
        }
    });
}
function getMusicZoneLists(ip, type, uid) {
    var devip = ip;
    var devtype = type;
    var devuid = uid;
    yamaha = new YamahaYXC(ip);
    yamaha.getFeatures().then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            for (var i = 0; i < att.system.zone_num; i++) {
                var zone_name = att.zone[i].id;
                //inputs gibts immer
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.input_list', { val: att.zone[i].input_list, ack: true });

                if (att.zone[i].func_list.indexOf("tone_control") !== -1) {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.tone_control_mode_list', { val: att.zone[i].tone_control_mode_list, ack: true });
                }
                if (att.zone[i].func_list.indexOf("link_control") !== -1) {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.link_control_list', { val: att.zone[i].link_control_list, ack: true });
                }
                if (att.zone[i].func_list.indexOf("link_audio_delay") !== -1) {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.link_audio_delay_list', { val: att.zone[i].link_audio_delay_list, ack: true });
                }
                if (att.zone[i].func_list.indexOf("link_audio_quality") !== -1) {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.link_audio_quality_list', { val: att.zone[i].link_audio_quality_list, ack: true });
                }
                if (att.zone[i].func_list.indexOf("sound_program") !== -1) {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.sound_program_list', { val: att.zone[i].sound_program_list, ack: true });
                }
                if (att.zone[i].func_list.indexOf("audio_select") !== -1) {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.audio_select_list', { val: att.zone[i].audio_select_list, ack: true });
                }
                if (att.zone[i].func_list.indexOf("surr_decoder_type") !== -1) {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.surr_decoder_type_list', { val: att.zone[i].surr_decoder_type_list, ack: true });
                }
                if (att.zone[i].func_list.indexOf("actual_volume") !== -1) {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.' + zone_name + '.actual_volume_mode_list', { val: att.zone[i].actual_volume_mode_list, ack: true });
                }
            }
        }
        else { adapter.log.debug('failure getting status info from  ' + devip + ' : ' + responseFailLog(result)); }

    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicZoneLists] error: ${err.message}, stack: ${err.stack}`);
        }
    });
}
function getMusicNetusbInfo(ip, type, uid) {
    var devip = ip;
    var devtype = type;
    var devuid = uid;
    yamaha = new YamahaYXC(ip);
    yamaha.getPlayInfo().then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            var albumurl = att.albumart_url;
            if (albumurl.substr(0, 20) === '/YamahaRemoteControl') {
                albumurl = 'http://' + devip + att.albumart_url;
            }
            adapter.log.debug('got Netusb playinfo succesfully from ' + devip + 'with  ' + JSON.stringify(result));

            var resp = { "device": type, "request": '/netusb/getPlayInfo', "responses": att }
            if (!responses.find(o => o.device === devtype + '_' + devuid && o.request === '/netusb/getPlayInfo')) responses.push(resp)
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + 'netusb.getPlayInfo', { val: att, ack: true });


            for (var key in att) {
                if (key == "albumart_url") {
                    var albumurl = att.albumart_url;
                    if (albumurl.substr(0, 20) === '/YamahaRemoteControl') {
                        albumurl = 'http://' + devip + att.albumart_url;
                    }
                    adapter.log.debug('albumart ' + albumurl);
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.netusb' + '.' + key, { val: albumurl, ack: true });
                }
                else if (key == "repeat") {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.netusb.repeat_stat', { val: att[key], ack: true });
                }
                else if (key == "shuffle") {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.netusb.shuffle_stat', { val: att[key], ack: true });
                }
                else {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.netusb' + '.' + key, { val: att[key], ack: true });

                }
            }
        }
        else { adapter.log.debug('failure getting Netusb playinfo from  ' + devip + ' : ' + responseFailLog(result)); }
    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicNetusbInfo] error: ${err.message}, stack: ${err.stack}`);
        }
    });
}

function getMusicNetusbRecent(ip, type, uid) {
    var devip = ip;
    var devtype = type;
    var devuid = uid;
    yamaha = new YamahaYXC(ip);
    yamaha.getRecentInfo().then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            adapter.log.debug('got Netusb recent info succesfully from ' + devip + 'with  ' + JSON.stringify(result));
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.netusb.recent_info', { val: att.recent_info, ack: true });
        }
        else { adapter.log.debug('failure getting Netusb recent info from  ' + devip + ' : ' + responseFailLog(result)); }
    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicNetusbRecent] error: ${err.message}, stack: ${err.stack}`);
        }
    });
}

function getMusicNetusbPreset(ip, type, uid) {
    var devip = ip;
    var devtype = type;
    var devuid = uid;
    yamaha = new YamahaYXC(ip);
    yamaha.getPresetInfo().then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            adapter.log.debug('got Netusb preset info succesfully from ' + devip + 'with  ' + JSON.stringify(result));
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.netusb.preset_info', { val: att.preset_info, ack: true });
        }
        else { adapter.log.debug('failure getting Netusb preset info from  ' + devip + ' : ' + responseFailLog(result)); }
    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicNetusbPreset] error: ${err.message}, stack: ${err.stack}`);
        }
    });
}
function getMusicCdInfo(ip, type, uid) {
    var devip = ip;
    var devtype = type;
    var devuid = uid;
    yamaha = new YamahaYXC(ip);
    yamaha.getPlayInfo('cd').then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {

            adapter.log.debug('got CD playinfo succesfully from ' + devip + 'with  ' + JSON.stringify(result));

            var resp = { "device": devtype + '_' + devuid, "request": '/cd/getPlayInfo', "responses": att }
            if (!responses.find(o => o.device === devtype + '_' + devuid && o.request === '/cd/getPlayInfo')) responses.push(resp)

            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.cd.getPlayInfo', { val: att, ack: true });
            for (var key in att) {
                if (key == "repeat") {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.cd.repeat_stat', { val: att[key], ack: true });
                }
                else if (key == "shuffle") {
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.cd.shuffle_stat', { val: att[key], ack: true });
                }
                else
                    adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.cd' + '.' + key, { val: att[key], ack: true });
            }
            /*
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
            */
        }
        else { adapter.log.debug('failure getting CD playinfo from  ' + devip + ' : ' + responseFailLog(result)); }

    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicCdInfo] error: ${err.message}, stack: ${err.stack}`);
        }
    });
}
function getMusicTunerInfo(ip, type, uid) {
    var devip = ip;
    var devtype = type;
    var devuid = uid;
    yamaha = new YamahaYXC(ip);
    yamaha.getTunerPlayInfo().then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            adapter.log.debug('got Tuner playinfo succesfully from ' + devip + 'with  ' + JSON.stringify(result));

            var resp = { "device": devtype + '_' + devuid, "request": '/tuner/getPlayInfo', "responses": att }
            if (!responses.find(o => o.device === devtype + '_' + devuid && o.request === '/tuner/getPlayInfo')) responses.push(resp)
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.getPlayInfo', { val: att, ack: true });

            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.band', { val: att.band, ack: true });
            if (att.band == 'am') {
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.am.preset', { val: att.am.preset, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.am.freq', { val: att.am.freq, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.am.tuned', { val: att.am.tuned, ack: true });
            }
            if (att.band == 'fm') {
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.fm.preset', { val: att.fm.preset, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.fm.freq', { val: att.fm.freq, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.fm.tuned', { val: att.fm.tuned, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.fm.audio_mode', { val: att.fm.audio_mode, ack: true });
            }
            if (att.band == 'dab') {
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.preset', { val: att.dab.preset, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.id', { val: att.dab.id, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.status', { val: att.dab.status, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.freq', { val: att.dab.freq, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.category', { val: att.dab.category, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.audio_mode', { val: att.dab.audio_mode, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.bit_rate', { val: att.dab.bit_rate, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.quality', { val: att.dab.quality, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.tune_aid', { val: att.dab.tune_aid, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.off_air', { val: att.dab.off_air, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.dab_plus', { val: att.dab.dab_plus, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.program_type', { val: att.dab.program_type, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.ch_label', { val: att.dab.ch_label, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.service_label', { val: att.dab.service_label, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.dls', { val: att.dab.dls, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.ensemble_label', { val: att.dab.ensemble_label, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.initial_scan_progress', { val: att.dab.initial_scan_progress, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.total_station_num', { val: att.dab.total_station_num, ack: true });
            }
            if (att.band == 'rds') {
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.rds.program_type', { val: att.rds.program_type, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.rds.program_service', { val: att.rds.program_service, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.rds.radio_text_a', { val: att.rds.radio_text_a, ack: true });
                adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.rds.radio_text_b', { val: att.rds.radio_text_b, ack: true });
            }
        }
        else { adapter.log.debug('failure getting Tuner playinfo from  ' + devip + ' : ' + responseFailLog(result)); }

    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicTunerInfo] error: ${err.message}, stack: ${err.stack}`);
        }
    });
}
function getMusicTunerPreset(ip, type, uid) {
    var devip = ip;
    var devtype = type;
    var devuid = uid;
    yamaha = new YamahaYXC(ip);

    yamaha.getTunerPresetInfo(common).then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            adapter.log.debug('got Common Tuner preset info succesfully from ' + devip + 'with  ' + JSON.stringify(result));

            var resp = { "device": devtype + '_' + devuid, "request": '/tuner/getPresetInfo', "responses": att }
            if (!responses.find(o => o.device === devtype + '_' + devuid && o.request === '/tuner/getPrestInfo')) responses.push(resp)

            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.common_preset_info', { val: att.preset_info, ack: true });
            //adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.tuner.preset_info', {val: JSON.stringify(att.preset_info), ack: true});                                      
        }
        else { adapter.log.debug('failure getting Common Tuner preset info from  ' + devip + ' : ' + responseFailLog(result)); }
    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicTunerPreset] error: ${err.message}, stack: ${err.stack}`);
        }
    });
    //if (FM)
    yamaha.getTunerPresetInfo(fm).then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            adapter.log.debug('got FM Tuner preset info succesfully from ' + devip + 'with  ' + JSON.stringify(result));
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.fm.preset_info', { val: att.preset_info, ack: true });
            //adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.tuner.preset_info', {val: JSON.stringify(att.preset_info), ack: true});                                      
        }
        else { adapter.log.debug('failure getting FM Tuner preset info from  ' + devip + ' : ' + responseFailLog(result)); }
    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicTunerPreset error: ${err.message}, stack: ${err.stack}`);
        }
    });
    //if (AM)
    yamaha.getTunerPresetInfo(am).then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            adapter.log.debug('got AM Tuner preset info succesfully from ' + devip + 'with  ' + JSON.stringify(result));
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.am.preset_info', { val: att.preset_info, ack: true });
            //adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.tuner.preset_info', {val: JSON.stringify(att.preset_info), ack: true});                                      
        }
        else { adapter.log.debug('failure getting AM Tuner preset info from  ' + devip + ' : ' + responseFailLog(result)); }
    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicTunerPreset error: ${err.message}, stack: ${err.stack}`);
        }
    });
    //if (DAB)    
    yamaha.getTunerPresetInfo(dab).then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            adapter.log.debug('got DAB Tuner preset info succesfully from ' + devip + 'with  ' + JSON.stringify(result));
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.tuner.dab.preset_info', { val: att.preset_info, ack: true });
            //adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.tuner.preset_info', {val: JSON.stringify(att.preset_info), ack: true});                                      
        }
        else { adapter.log.debug('failure getting DAB Tuner preset info from  ' + devip + ' : ' + responseFailLog(result)); }
    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicTunerPreset error: ${err.message}, stack: ${err.stack}`);
        }
    });
}
function getMusicClockSettings(ip, type, uid) {
    var devip = ip;
    var devtype = type;
    var devuid = uid;
    yamaha = new YamahaYXC(ip);
    yamaha.getClockSettings().then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            adapter.log.debug('got Clock settings succesfully from ' + devip + 'with  ' + JSON.stringify(result));

            var resp = { "device": devtype + '_' + devuid, "request": '/clock/getSettings', "responses": att }
            if (!responses.find(o => o.device === devtype + '_' + devuid && o.request === '/clock/getSettings')) responses.push(resp)
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.getSettings', { val: att, ack: true });
            /*
            for (var key in att){
                hier muss noch die . von der Rückmeldung und die _ in objekte ausgetauscht werden
                adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.clock' + '.'+ key, {val: att[key], ack: true});
            }
            */
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.auto_sync', { val: att.auto_sync, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.format', { val: att.format, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.alarm_on', { val: att.alarm_on, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.volume', { val: att.volume, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.fade_interval', { val: att.fade_interval, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.fade_type', { val: att.fade_type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.mode', { val: att.mode, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.repeat', { val: att.repeat, ack: true });

            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.oneday.enable', { val: att.oneday.enable, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.oneday.time', { val: att.oneday.time, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.oneday.beep', { val: att.oneday.beep, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.oneday.playback_type', { val: att.oneday.playback_type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.oneday.resume_input', { val: att.oneday.resume.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.oneday.preset_type', { val: att.oneday.preset.type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.oneday.preset_num', { val: att.oneday.preset.num, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.oneday.preset_netusb_input', { val: att.oneday.preset.netusb_info.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.oneday.preset_netusb_text', { val: att.oneday.preset.netusb_info.text, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.oneday.preset_tuner_band', { val: att.oneday.preset.tuner_info.band, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.oneday.preset_tuner_number', { val: att.oneday.preset.tuner_info.number, ack: true });

            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.sunday.enable', { val: att.sunday.enable, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.sunday.time', { val: att.sunday.time, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.sunday.beep', { val: att.sunday.beep, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.sunday.playback_type', { val: att.sunday.playback_type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.sunday.resume_input', { val: att.sunday.resume.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.sunday.preset_type', { val: att.sunday.preset.type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.sunday.preset_num', { val: att.sunday.preset.num, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.sunday.preset_netusb_input', { val: att.sunday.preset.netusb_info.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.sunday.preset_netusb_text', { val: att.sunday.preset.netusb_info.text, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.sunday.preset_tuner_band', { val: att.sunday.preset.tuner_info.band, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.sunday.preset_tuner_number', { val: att.sunday.preset.tuner_info.number, ack: true });

            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.monday.enable', { val: att.monday.enable, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.monday.time', { val: att.monday.time, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.monday.beep', { val: att.monday.beep, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.monday.playback_type', { val: att.monday.playback_type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.monday.resume_input', { val: att.monday.resume.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.monday.preset_type', { val: att.monday.preset.type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.monday.preset_num', { val: att.monday.preset.num, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.monday.preset_netusb_input', { val: att.monday.preset.netusb_info.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.monday.preset_netusb_text', { val: att.monday.preset.netusb_info.text, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.monday.preset_tuner_band', { val: att.monday.preset.tuner_info.band, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.monday.preset_tuner_number', { val: att.monday.preset.tuner_info.number, ack: true });

            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.tuesday.enable', { val: att.tuesday.enable, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.tuesday.time', { val: att.tuesday.time, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.tuesday.beep', { val: att.tuesday.beep, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.tuesday.playback_type', { val: att.tuesday.playback_type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.tuesday.resume_input', { val: att.tuesday.resume.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.tuesday.preset_type', { val: att.tuesday.preset.type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.tuesday.preset_num', { val: att.tuesday.preset.num, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.tuesday.preset_netusb_input', { val: att.tuesday.preset.netusb_info.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.tuesday.preset_netusb_text', { val: att.tuesday.preset.netusb_info.text, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.tuesday.preset_tuner_band', { val: att.tuesday.preset.tuner_info.band, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.tuesday.preset_tuner_number', { val: att.tuesday.preset.tuner_info.number, ack: true });

            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.wednesday.enable', { val: att.wednesday.enable, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.wednesday.time', { val: att.wednesday.time, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.wednesday.beep', { val: att.wednesday.beep, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.wednesday.playback_type', { val: att.wednesday.playback_type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.wednesday.resume_input', { val: att.wednesday.resume.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.wednesday.preset_type', { val: att.wednesday.preset.type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.wednesday.preset_num', { val: att.wednesday.preset.num, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.wednesday.preset_netusb_input', { val: att.wednesday.preset.netusb_info.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.wednesday.preset_netusb_text', { val: att.wednesday.preset.netusb_info.text, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.wednesday.preset_tuner_band', { val: att.wednesday.preset.tuner_info.band, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.wednesday.preset_tuner_number', { val: att.wednesday.preset.tuner_info.number, ack: true });

            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.thursday.enable', { val: att.thursday.enable, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.thursday.time', { val: att.thursday.time, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.thursday.beep', { val: att.thursday.beep, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.thursday.playback_type', { val: att.thursday.playback_type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.thursday.resume_input', { val: att.thursday.resume.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.thursday.preset_type', { val: att.thursday.preset.type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.thursday.preset_num', { val: att.thursday.preset.num, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.thursday.preset_netusb_input', { val: att.thursday.preset.netusb_info.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.thursday.preset_netusb_text', { val: att.thursday.preset.netusb_info.text, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.thursday.preset_tuner_band', { val: att.thursday.preset.tuner_info.band, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.thursday.preset_tuner_number', { val: att.thursday.preset.tuner_info.number, ack: true });

            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.friday.enable', { val: att.friday.enable, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.friday.time', { val: att.friday.time, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.friday.beep', { val: att.friday.beep, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.friday.playback_type', { val: att.friday.playback_type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.friday.resume_input', { val: att.friday.resume.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.friday.preset_type', { val: att.friday.preset.type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.friday.preset_num', { val: att.friday.preset.num, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.friday.preset_netusb_input', { val: att.friday.preset.netusb_info.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.friday.preset_netusb_text', { val: att.friday.preset.netusb_info.text, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.friday.preset_tuner_band', { val: att.friday.preset.tuner_info.band, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.friday.preset_tuner_number', { val: att.friday.preset.tuner_info.number, ack: true });

            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.saturday.enable', { val: att.saturday.enable, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.saturday.time', { val: att.saturday.time, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.saturday.beep', { val: att.saturday.beep, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.saturday.playback_type', { val: att.saturday.playback_type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.saturday.resume_input', { val: att.saturday.resume.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.saturday.preset_type', { val: att.saturday.preset.type, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.saturday.preset_num', { val: att.saturday.preset.num, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.saturday.preset_netusb_input', { val: att.saturday.preset.netusb_info.input, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.saturday.preset_netusb_text', { val: att.saturday.preset.netusb_info.text, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.saturday.preset_tuner_band', { val: att.saturday.preset.tuner_info.band, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.clock.saturday.preset_tuner_number', { val: att.saturday.preset.tuner_info.number, ack: true });

        }
        else { adapter.log.debug('failure getting Clock settings from  ' + devip + ' : ' + responseFailLog(result)); }

    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicClockSettings] error: ${err.message}, stack: ${err.stack}`);
        }
    });
}
function getMusicDistInfo(ip, type, uid) {
    var devip = ip;
    var devtype = type;
    var devuid = uid;
    yamaha = new YamahaYXC(ip);
    yamaha.getDistributionInfo().then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            adapter.log.debug('got Distribution info succesfully from ' + devip + 'with  ' + JSON.stringify(result));
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.main.group_id', { val: att.group_id, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.main.group_name', { val: att.group_name, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.main.role', { val: att.role, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.main.server_zone', { val: att.server_zone, ack: true });
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.main.client_list', { val: att.client_list, ack: true }); //array ip_address and data_type
            /*
            if (att.group_name === "00000000000000000000000000000000")
                {
                    adapter.setForeignState('musiccast.0.'+ devtype + '_' + devuid + '.main.distr_state', {val: false, ack: true});
                }
            */
        }
        else { adapter.log.debug('failure getting Distibution info from  ' + devip + ' : ' + responseFailLog(result)); }

    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[getMusicDistInfo] error: ${err.message}, stack: ${err.stack}`);
        }
    });
}
// init of device
function defineMusicDeviceFeatures(ip, type, uid) {
    var devip = ip;
    var devtype = type;
    var devuid = uid;
    yamaha = new YamahaYXC(ip);
    yamaha.getFeatures().then(function (result) {
        var att = JSON.parse(result);
        if (att.response_code === 0) {
            adapter.log.debug('got features succesfully from ' + devip);
            adapter.log.debug('number of zones ' + att.system.zone_num);

            var resp = { "device": devtype + '_' + devuid, "request": '/system/getFeatures', "responses": att }
            if (!responses.find(o => o.device === devtype + '_' + devuid && o.request === '/system/getFeatures')) responses.push(resp)
            adapter.setForeignState('musiccast.0.' + devtype + '_' + devuid + '.system.getFeatures', { val: att, ack: true });

            for (var i = 0; i < att.zone.length; i++) {
                adapter.log.debug(' setup loop # ' + i + ' name ' + JSON.stringify(att.zone[i]));

                var zone_name = att.zone[i].id;
                defineMusicZoneNew(devtype, devuid, zone_name, att.zone[i]);
                // Zone input list
                defineMusicInputs(devtype, devuid, zone_name, att.zone[i].input_list);
                // Zone link control
                if (att.zone[i].func_list.indexOf("link_control") !== -1) {
                    defineMusicLinkCtrl(devtype, devuid, zone_name, att.zone[i].link_control_list);
                }
                // Zone link audio delay
                if (att.zone[i].func_list.indexOf("link_audio_delay") !== -1) {
                    defineMusicLinkAudioDelay(devtype, devuid, zone_name, att.zone[i].func_list, att.zone[i].link_audio_delay_list);
                }
                // Zone link audio quality
                if (att.zone[i].func_list.indexOf("link_audio_quality") !== -1) {
                    defineMusicLinkAudioQuality(devtype, devuid, zone_name, att.zone[i].func_list, att.zone[i].link_audio_quality_list);
                }
                // Zone Sound program
                if (att.zone[i].func_list.indexOf("sound_program") !== -1) {
                    defineMusicSoundProg(devtype, devuid, zone_name, att.zone[i].func_list, att.zone[i].sound_program_list);
                }
                // Zone Surround_decoder_type
                if (att.zone[i].func_list.indexOf("surr_decoder_type") !== -1) {
                    defineMusicSurroundDec(devtype, devuid, zone_name, att.zone[i].func_list, att.zone[i].surr_decoder_type_list);
                }
                // Zone Audio Select
                if (att.zone[i].func_list.indexOf("audio_select") !== -1) {
                    defineMusicAudioSelect(devtype, devuid, zone_name, att.zone[i].func_list, att.zone[i].audio_select_list);
                }
                // Zone Actual Volume
                if (att.zone[i].func_list.indexOf("actual_volume") !== -1) {
                    defineMusicActualVolume(devtype, devuid, zone_name, att.zone[i].func_list, att.zone[i].actual_volume_mode_list, att.zone[i].range_step);
                }
                // Zone Party Mode
                if (att.system.func_list.indexOf("party_mode") !== -1) { //hier globale func_list, aber object in jeder Zone
                    defineMusicPartyMode(devtype, devuid, zone_name);
                }
            }
            // input services and their attributes
            defineMusicSystemInputs(devtype, devuid, att.system.input_list);

            //CD player objects
            if (att.zone[0].input_list.indexOf('cd') !== -1) {
                defineMusicCD(devtype, devuid);
            }
            //Tuner objects
            if (att.tuner) {
                defineMusicTuner(devtype, devuid, att.tuner.func_list, att.tuner.range_step, att.tuner.preset);
            }
            //Clock objects
            if (att.clock) {
                defineMusicClock(devtype, devuid, att.clock.func_list, att.clock.range_step, att.clock.alarm_fade_type_num, att.clock.alarm_mode_list, att.clock.alarm_input_list, att.clock.alarm_preset_list);
            }

        }
        else { adapter.log.debug('failure getting features from  ' + devip + ' : ' + responseFailLog(result)); }
    }).catch(function (err) {
        if (err.message.includes('connect EHOSTUNREACH')) {
            adapter.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!')
        } else {
            adapter.log.error(`[defineMusicDeviceFeatures] error: ${err.message}, stack: ${err.stack}`);
        }
    });
}
//UDP update
function gotUpdate(msg, devIp) {
    try {
        var dev = getConfigObjects(adapter.config.devices, 'ip', devIp);
        adapter.log.debug('processing update from: ' + dev + ' with ' + JSON.stringify(msg));
        if (msg.netusb) {
            if (msg.netusb.play_time && adapter.config.netusbplaytime) {
                adapter.setForeignState('musiccast.0.' + dev[0].type + '_' + dev[0].uid + '.netusb.playtime', { val: msg.netusb.play_time, ack: true });
            }
            if (msg.netusb.play_info_updated) {
                getMusicNetusbInfo(devIp, dev[0].type, dev[0].uid);
            }
            if (msg.netusb.recent_info_updated) {
                getMusicNetusbRecent(devIp, dev[0].type, dev[0].uid);
            }
            if (msg.netusb.preset_info_updated) {
                getMusicNetusbPreset(devIp, dev[0].type, dev[0].uid);
            }
            //if play_error todo

            if (msg.netusb.preset_control) {
                if (msg.netusb.preset_control.result === 'success') {
                    adapter.setForeignState('musiccast.0.' + dev[0].type + '_' + dev[0].uid + '.netusb.presetrecallnumber', { val: msg.netusb.preset_control.num, ack: true });
                }
            }
        }
        if (msg.main) {
            //if signal_info_updated /main/getSignalInfo
            //if status_updated /main/getStatus
            getMusicZoneInfo(devIp, dev[0].type, dev[0].uid, 'main');
        }
        if (msg.zone2) {
            //if signal_info_updated /main/getSignalInfo
            //if status_updated /main/getStatus
            getMusicZoneInfo(devIp, dev[0].type, dev[0].uid, 'zone2');
        }
        if (msg.zone3) {
            //if signal_info_updated /main/getSignalInfo
            //if status_updated /main/getStatus
            getMusicZoneInfo(devIp, dev[0].type, dev[0].uid, 'zone3');
        }
        if (msg.zone4) {
            //if signal_info_updated /main/getSignalInfo
            //if status_updated /main/getStatus
            getMusicZoneInfo(devIp, dev[0].type, dev[0].uid, 'zone4');
        }
        if (msg.system) {
            //if func_status_updated
            //if bluetooth_status_updated
            //if name_text_updated
            //if location_info_updated
        }
        if (msg.cd) {
            //if device_status
            if (msg.cd.play_time && adapter.config.cdplaytime) {
                adapter.setForeignState('musiccast.0.' + dev[0].type + '_' + dev[0].uid + '.cd.playtime', { val: msg.cd.play_time, ack: true });
            }
            if (msg.cd.play_info_updated) {
                getMusicCdInfo(devIp, dev[0].type, dev[0].uid);
            }
        }
        if (msg.tuner) {
            //if play_info_updated
            if (msg.tuner.play_info_updated) {
                getMusicTunerInfo(devIp, dev[0].type, dev[0].uid);
            }
            //if preset_info_updated
            if (msg.tuner.preset_info_updated) {
                getMusicTunerPreset(devIp, dev[0].type, dev[0].uid);
            }
            //if name_text_updated
            //if location_info_updated

        }
        if (msg.dist) {
            //  /dist/getDistributionInfo
            getMusicDistInfo(devIp, dev[0].type, dev[0].uid);
        }
        if (msg.clock) {
            // /clock/getSettings
            getMusicClockSettings(devIp, dev[0].type, dev[0].uid);
        }

    } catch (error) {
        adapter.log.error(`[gotUpdate] error: ${err.message}, stack: ${err.stack}`);
    }
}

process.on('SIGINT', function () {
    if (mcastTimeout) clearTimeout(mcastTimeout);
})

function main() {
    try {

        //yamaha.discover
        //yamaha.discoverYSP 
        //found devices crosscheck with config.devices
        //new found devices to adapter.confg.devices //quit adapter and restart with found config

        var obj = adapter.config.devices;

        //check if something is not configured

        for (var anz in obj) {

            //general structure setup        
            defineMusicDevice(obj[anz].type, obj[anz].uid, obj[anz].name); //contains also the structure to musiccast.0._id_type_.
            defineMusicNetUsb(obj[anz].type, obj[anz].uid); //all devices are supporting netusb
            //defineMClink basic structure

            //some reading from the devices
            // get system data
            getMusicDeviceInfo(obj[anz].ip, obj[anz].type, obj[anz].uid);

            //get the inout list and create object
            defineMusicDeviceFeatures(obj[anz].ip, obj[anz].type, obj[anz].uid);
            //yamaha.getNameText() evtl. um enum_room für die Zone zu setzen oder über setNameText enum_room aus admin setzen

            //yamaha.getStatus('main'); initial status of device

            // get main status
            getMusicZoneInfo(obj[anz].ip, obj[anz].type, obj[anz].uid, 'main');  //must be looped if more than main zone

            /*      
            adapter.getStatesOf(adapter.namespace + "." + obj[anz].type + "_" + obj[anz].uid + ".zone2",function (err, channel) {
                if (err) {
                    adapter.log.info('zone2 nicht existent für ');
                }
                else {
                    getMusicZoneInfo(obj[anz].ip, obj[anz].type, obj[anz].uid, 'zone2');
                } 
            });
            adapter.getStatesOf(adapter.namespace + "." + obj[anz].type + "_" + obj[anz].uid + ".zone3",function (err, channel) {
                if (err){
                    adapter.log.info('zone3 nicht existent für ');}
                else {
                    getMusicZoneInfo(obj[anz].ip, obj[anz].type, obj[anz].uid, 'zone3');
                }
            });
            adapter.getStatesOf(adapter.namespace + "." + obj[anz].type + "_" + obj[anz].uid + ".zone4",function (err, channel) {
                if (err) {
                    adapter.log.info('zone4 nicht existent für ');}
                else {
                    getMusicZoneInfo(obj[anz].ip, obj[anz].type, obj[anz].uid, 'zone4');
                }
            });
            */

            // get main lists status
            getMusicZoneLists(obj[anz].ip, obj[anz].type, obj[anz].uid);  // 
            // get netusb status
            getMusicNetusbInfo(obj[anz].ip, obj[anz].type, obj[anz].uid);
            getMusicNetusbRecent(obj[anz].ip, obj[anz].type, obj[anz].uid);
            getMusicNetusbPreset(obj[anz].ip, obj[anz].type, obj[anz].uid);

            //get CD initially
            //get Clock initially
            //get tuner initially

        }
        const dgram = require('dgram');
        const server = dgram.createSocket('udp4');

        server.on('error', (err) => {
            adapter.log.error('server error:' + err.stack);
            server.close();
        });

        server.on('message', (msg, rinfo) => {
            adapter.log.debug('server got:' + msg.toString() + ' from ' + rinfo.address);
            //adapter.log.debug('server got:' + JSON.parse(msg.toString()) + 'from ' + rinfo.address );
            var foundip = getConfigObjects(adapter.config.devices, 'ip', rinfo.address);
            if (foundip.length === 0 || foundip.length !== 1) { //nix oder mehr als eine Zuordnung
                adapter.log.error('received telegram can not be processed, no config for this IP');
            }
            else {
                //try catch
                gotUpdate(JSON.parse(msg.toString()), rinfo.address); //erstmal noch IP, device_id ist eine andere als die in ssdp übermittelte (letze Teil von UDN)            
            }
        });

        server.on('listening', () => {
            adapter.log.info('socket listening ');
        });
        server.bind(41100);

        //everything is configured, make cyclic updates

        // make some artifical request to overcome the 20min autostop on updating
        /* 
        function pollData() {
            var interval = 300; // 5min
            for (var anz in obj) { // für alle Objekte
                adapter.getForeignState()
                getMusicDeviceInfo(obj[anz].ip, obj[anz].type, obj[anz].uid);
            }
            adapter.log.debug("polling! keeping musiccast alive");
            mcastTimeout = setTimeout(pollData, interval * 1000);
        }
        */
        // if(adapter.config.keepalive){pollData()}

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
    } catch (error) {
        adapter.log.error(`[main] error: ${err.message}, stack: ${err.stack}`);
    }
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 
