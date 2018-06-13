/* jshint -W097 */// jshint strict:false
/*jslint node: true */
var expect = require('chai').expect;
var setup  = require(__dirname + '/lib/setup');
var http = require('http');

var objects = null;
var states  = null;
var onStateChanged = null;
var onObjectChanged = null;
var sendToID = 1;

var adapterShortName = setup.adapterName.substring(setup.adapterName.indexOf('.')+1);

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    console.log('Try check #' + counter);
    if (counter > 30) {
        if (cb) cb('Cannot check connection');
        return;
    }

    states.getState('system.adapter.' + adapterShortName + '.0.alive', function (err, state) {
        if (err) console.error(err);
        if (state && state.val) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkConnectionOfAdapter(cb, counter + 1);
            }, 1000);
        }
    });
}

function checkValueOfState(id, value, cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        if (cb) cb('Cannot check value Of State ' + id);
        return;
    }

    states.getState(id, function (err, state) {
        if (err) console.error(err);
        if (value === null && !state) {
            if (cb) cb();
        } else
        if (state && (value === undefined || state.val === value)) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkValueOfState(id, value, cb, counter + 1);
            }, 500);
        }
    });
}

function sendTo(target, command, message, callback) {
    onStateChanged = function (id, state) {
        if (id === 'messagebox.system.adapter.test.0') {
            callback(state.message);
        }
    };

    states.pushMessage('system.adapter.' + target, {
        command:    command,
        message:    message,
        from:       'system.adapter.test.0',
        callback: {
            message: message,
            id:      sendToID++,
            ack:     false,
            time:    (new Date()).getTime()
        }
    });
}
//MusicCast Gerät mit http Server Emulieren
var server;

function setupHttpServer(callback) {
    //We need a function which handles requests and send response
    //Create a server
    server = http.createServer(handleHttpRequest);
    //Lets start our server
    server.listen(8080, function() {
        //Callback triggered when server is successfully listening. Hurray!
        console.log("HTTP-Server listening on: http://localhost:%s", 8080);
        callback();
    });
}

//Antworten des MusicCast Gerätes

function handleHttpRequest(request, response) {
    console.log('HTTP-Server: Request: ' + request.method + ' ' + request.url);
    
    if (request.url == '/YamahaExtendedControl/v1/system/getFeatures') { //check the URL of the current request
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify({"response_code":0,"system":{"func_list":["wired_lan","wireless_lan","wireless_direct","network_standby","auto_power_standby","bluetooth_tx_setting","airplay","speaker_settings","disklavier_settings"],"zone_num":1,"input_list":[{"id":"napster","distribution_enable":true,"rename_enable":false,"account_enable":true,"play_info_type":"netusb"},{"id":"spotify","distribution_enable":true,"rename_enable":false,"account_enable":false,"play_info_type":"netusb"},{"id":"juke","distribution_enable":true,"rename_enable":false,"account_enable":true,"play_info_type":"netusb"},{"id":"tidal","distribution_enable":true,"rename_enable":false,"account_enable":true,"play_info_type":"netusb"},{"id":"deezer","distribution_enable":true,"rename_enable":false,"account_enable":true,"play_info_type":"netusb"},{"id":"airplay","distribution_enable":false,"rename_enable":false,"account_enable":false,"play_info_type":"netusb"},{"id":"mc_link","distribution_enable":false,"rename_enable":true,"account_enable":false,"play_info_type":"netusb"},{"id":"server","distribution_enable":true,"rename_enable":true,"account_enable":false,"play_info_type":"netusb"},{"id":"net_radio","distribution_enable":true,"rename_enable":true,"account_enable":false,"play_info_type":"netusb"},{"id":"bluetooth","distribution_enable":true,"rename_enable":false,"account_enable":false,"play_info_type":"netusb"},{"id":"hdmi","distribution_enable":true,"rename_enable":true,"account_enable":false,"play_info_type":"none"},{"id":"tv","distribution_enable":true,"rename_enable":true,"account_enable":false,"play_info_type":"none"},{"id":"analog","distribution_enable":true,"rename_enable":true,"account_enable":false,"play_info_type":"none"}],"speaker_settings":{"type":"beam","common":{"attribute":2,"range_step":[{"id":"ysp_pos_width","min":300,"max":900,"step":1},{"id":"ysp_pos_length","min":300,"max":900,"step":1},{"id":"ysp_pos_position","min":100,"max":800,"step":1},{"id":"ysp_pos_distance","min":250,"max":850,"step":1}]},"front_l":{"attribute":3,"range_step":[{"id":"level","min":-10,"max":10,"step":1}]},"front_r":{"attribute":3,"range_step":[{"id":"level","min":-10,"max":10,"step":1}]},"center":{"attribute":3,"range_step":[{"id":"level","min":-10,"max":10,"step":1}]},"surr_l":{"attribute":3,"range_step":[{"id":"level","min":-10,"max":10,"step":1}]},"surr_r":{"attribute":3,"range_step":[{"id":"level","min":-10,"max":10,"step":1}]},"swfr":{"attribute":3,"range_step":[{"id":"level","min":-10,"max":10,"step":1}]}},"ymap_list":["vtuner"]},"zone":[{"id":"main","func_list":["power","volume","mute","sound_program","clear_voice","subwoofer_volume","signal_info","prepare_input_change","link_control","link_audio_delay"],"input_list":["napster","spotify","juke","tidal","deezer","airplay","mc_link","server","net_radio","bluetooth","hdmi","tv","analog"],"sound_program_list":["sports","game","music","tv_program","movie","stereo"],"link_control_list":["speed","standard","stability"],"link_audio_delay_list":["audio_sync","lip_sync"],"range_step":[{"id":"volume","min":0,"max":100,"step":1},{"id":"subwoofer_volume","min":-10,"max":10,"step":1}]}],"netusb":{"func_list":["recent_info","play_queue","mc_playlist"],"preset":{"num":40},"recent_info":{"num":40},"play_queue":{"size":200},"mc_playlist":{"size":200,"num":5},"net_radio_type":"vtuner","vtuner_fver":"A","pandora":{"sort_option_list":["date","alphabet"]}},"distribution":{"server_zone_list":["main"]}}));
        response.end(); 
    }
    else if (request.url == '/YamahaExtendedControl/v1/system/getDeviceInfo') { //check the URL of the current request
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify({"response_code":0,"model_name":"YSP-1600","destination":"BG","device_id":"00A0DED15025","system_id":"0B587073","system_version":2.52,"api_version":1.18,"netmodule_version":"1428    ","netmodule_checksum":"A693CC12","operation_mode":"normal","update_error_code":"00000000"}    ));
        response.end(); 
    }
    else if (request.url == '/YamahaExtendedControl/v1/netusb/getPlayInfo') { //check the URL of the current request
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify({"response_code":0,"input":"server","play_queue_type":"system","playback":"stop","repeat":"off","shuffle":"off","play_time":0,"total_time":0,"artist":"","album":"","track":"","albumart_url":"","albumart_id":9777,"usb_devicetype":"unknown","auto_stopped":false,"attribute":83902583}));
        response.end(); 
    }   
    else if (request.url == '/YamahaExtendedControl/v1/netusb/getRecentInfo') { //check the URL of the current request
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify({"response_code":0,"recent_info":[{"input":"net_radio","text":"rbb radioeins","albumart_url":"http:\/\/item.radio456.com:80\/007452\/logo\/logo-4716.jpg","play_count":19,"attribute":0},{"input":"net_radio","text":"1LIVE","albumart_url":"http:\/\/item.radio456.com:80\/007452\/logo\/logo-531.jpg","play_count":15,"attribute":0},{"input":"net_radio","text":"BBC Radio 2","albumart_url":"http:\/\/item.radio456.com:80\/007452\/logo\/logo-3159.jpg","play_count":3,"attribute":0},{"input":"net_radio","text":"Antenne Thüringen 97.9 FM","albumart_url":"http:\/\/item.radio456.com:80\/007452\/logo\/logo-6813.jpg","play_count":10,"attribute":0},{"input":"server","text":"   5. you and me","albumart_url":"","play_count":2,"attribute":30},{"input":"server","text":"   7. making a memory","albumart_url":"","play_count":2,"attribute":30},{"input":"server","text":"   6. friends don't let friends dial drunk","albumart_url":"","play_count":1,"attribute":30},{"input":"server","text":"   4. hate (i really don't like you)","albumart_url":"","play_count":1,"attribute":30},{"input":"server","text":"   3. come back to me","albumart_url":"","play_count":2,"attribute":30},{"input":"server","text":"   2. our time now","albumart_url":"","play_count":2,"attribute":30},{"input":"server","text":"   1. hey there delilah","albumart_url":"","play_count":1,"attribute":30},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0},{"input":"unknown","text":"","albumart_url":"","play_count":0,"attribute":0}]}));
        response.end(); 
    }  
    else if (request.url == '/YamahaExtendedControl/v1/netusb/getPresetInfo') { //check the URL of the current request
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify({"response_code":0,"preset_info":[{"input":"net_radio","text":"Antenne Thüringen 97.9 FM","attribute":0},{"input":"net_radio","text":"rbb radioeins","attribute":0},{"input":"net_radio","text":"1LIVE","attribute":0},{"input":"unknown","text":""},{"input":"net_radio","text":"Deutschlandfunk","attribute":0},{"input":"net_radio","text":"BBC Radio 2","attribute":0},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""},{"input":"unknown","text":""}],"func_list":["clear","move"]}));
        response.end(); 
    }
    else if (request.url == '/YamahaExtendedControl/v1/main/getStatus') { //check the URL of the current request
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify({"response_code":0,"power":"on","volume":67,"mute":false,"max_volume":100,"input":"hdmi","distribution_enable":true,"sound_program":"movie","clear_voice":true,"subwoofer_volume":-10,"link_control":"standard","link_audio_delay":"audio_sync","disable_flags":0}));
        response.end(); 
    }
    else if (request.url == '/YamahaExtendedControl/v1/zone2/getStatus') { //check the URL of the current request
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify({"response_code" :3 }));
        response.end(); 
    } 
    else {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify({"response_code" :3 }));
        response.end(); 
    }    
}

describe('Test ' + adapterShortName + ' adapter', function() {
    before('Test ' + adapterShortName + ' adapter: Start js-controller', function (_done) {
        this.timeout(600000); // because of first install from npm

        setup.setupController(function () {
            var config = setup.getAdapterConfig();
            // enable adapter
            config.common.enabled  = true;
            config.common.loglevel = 'debug';

            //config.native.dbtype   = 'sqlite';
            
            // nur ein Gerät im Setup           
            config.native.devices = [ip: '127.0.0.1:8080'; type = 'YSP-1600'; uid = '00112233'; name = 'TestGerät';]
            
            setup.setAdapterConfig(config.common, config.native);
            
            setupHttpServer(function() {
                setup.startController(true, function (id, obj) { }, function (id, state) {
                    if (onStateChanged) onStateChanged(id, state);
                },
                    function (_objects, _states) {
                        objects = _objects;
                        states = _states;
                        _done();
                    });
            });
        });
    });

/*
    ENABLE THIS WHEN ADAPTER RUNS IN DEAMON MODE TO CHECK THAT IT HAS STARTED SUCCESSFULLY
*/
    it('Test ' + adapterShortName + ' adapter: Check if adapter started', function (done) {
        this.timeout(60000);
        checkConnectionOfAdapter(function (res) {
            if (res) console.log(res);
            expect(res).not.to.be.equal('Cannot check connection');
            objects.setObject('system.adapter.test.0', {
                    common: {

                    },
                    type: 'instance'
                },
                function () {
                    states.subscribeMessage('system.adapter.test.0');
                    done();
                });
        });
    });
/**/

/*
    PUT YOUR OWN TESTS HERE USING
    it('Testname', function ( done) {
        ...
    });

    You can also use "sendTo" method to send messages to the started adapter
*/
    // anfang von eigenen Tests
    it('Test ' + adapterShortName + ' adapter: Check values', function (done) {
        console.log('START CHECK VALUES');
        this.timeout(90000);
        checkValueOfState('musiccast.0.main.volume', 67, function() {
            setTimeout(function() {
                checkValueOfState('musiccast.0.main.volume', 67, function() {
                    done();
                });
            }, 70000);
        });
    });


    /*
    it('Test ' + adapterShortName + ' adapter: Set values', function (done) {
        console.log('START SET VALUES');
        this.timeout(90000);
        states.setState('musiccast.0.main.volume', {val: 20, ack: false, from: 'test.0'}, function (err) {
            if (err) {
                console.log(err);
            }
            checkValueOfState('musiccast.0.main.volume', 20, function() {
                done();
            });
        });
    });
    */


    // schluss mit eigenen Tests
    after('Test ' + adapterShortName + ' adapter: Stop js-controller', function (done) {
        this.timeout(10000);

        setup.stopController(function (normalTerminated) {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});
