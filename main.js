'use strict';

/*
 * Created with @iobroker/create-adapter v1.31.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require("fs");
const md5 = require('md5');
const YamahaYXC = require('yamaha-yxc-nodejs');
let yamaha = null;
let yamaha2 = null;
const responses = [ {} ];

const dpZoneCommands = {
	power: 'power',
	mute: 'mute',
	surround: 'surround',
	volume: 'setVolumeTo',
	input: 'setInput',
	bass_extension: 'setBassExtension',
	enhancer: 'setEnhancer',
	direct: 'setDirect',
	pure_direct: 'setPureDirect',
	sound_program: 'setSound',
	bass: 'setBassTo',
	treble: 'setTrebleTo',
	balance: 'setBalance',
	sleep: 'sleep',
	clearVoice: 'setClearVoice',
	link_control: 'setLinkControl',
	link_audio_delay: 'setLinkAudioDelay',
	link_audio_quality: 'setLinkAudioQuality'
};
const dpCommands = {
	subwoofer_volume: 'setSubwooferVolumeTo',
	presetrecallnumber: 'recallPreset'
};

const dpToggleCommands = {
	shuffle: 'toggleShuffle',
	repeat: 'toggleRepeat'
};

class Musiccast extends utils.Adapter {
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'musiccast'
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here
		try {
			//yamaha.discover
			//yamaha.discoverYSP
			//found devices crosscheck with config.devices
			//new found devices to adapter.confg.devices //quit adapter and restart with found config

			const obj = this.config.devices;

			//check if something is not configured

			for (const anz in obj) {
				//general structure setup
				await this.defineMusicDevice(obj[anz].type, obj[anz].uid, obj[anz].name); //contains also the structure to musiccast.0._id_type_.
				await this.defineMusicNetUsb(obj[anz].type, obj[anz].uid); //all devices are supporting netusb
				//defineMClink basic structure

				//get the inout list and create object
				await this.defineMusicDeviceFeatures(obj[anz].ip, obj[anz].type, obj[anz].uid);
				//yamaha.getNameText() evtl. um enum_room für die Zone zu setzen oder über setNameText enum_room aus admin setzen

				//yamaha.getStatus('main'); initial status of device

				//some reading from the devices
				// get system data
				await this.getMusicDeviceInfo(obj[anz].ip, obj[anz].type, obj[anz].uid);

				// get main status
				await this.getMusicZoneInfo(obj[anz].ip, obj[anz].type, obj[anz].uid, 'main'); //must be looped if more than main zone

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
				await this.getMusicZoneLists(obj[anz].ip, obj[anz].type, obj[anz].uid); //
				// get netusb status
				await this.getMusicNetusbInfo(obj[anz].ip, obj[anz].type, obj[anz].uid);
				await this.getMusicNetusbRecent(obj[anz].ip, obj[anz].type, obj[anz].uid);
				await this.getMusicNetusbPreset(obj[anz].ip, obj[anz].type, obj[anz].uid);

				//get CD initially
				//get Clock initially
				//get tuner initially
			}
			const dgram = require('dgram');
			const server = dgram.createSocket('udp4');

			server.on('error', (err) => {
				this.log.error('server error:' + err.stack);
				server.close();
			});

			server.on('message', (msg, rinfo) => {
				this.log.debug('server got:' + msg.toString() + ' from ' + rinfo.address);
				//adapter.log.debug('server got:' + JSON.parse(msg.toString()) + 'from ' + rinfo.address );
				const foundip = this.getConfigObjects(this.config.devices, 'ip', rinfo.address);
				if (foundip.length === 0 || foundip.length !== 1) {
					//nix oder mehr als eine Zuordnung
					this.log.error('received telegram can not be processed, no config for this IP' + rinfo.address);
				} else {
					//try catch
					this.gotUpdate(JSON.parse(msg.toString()), rinfo.address); //erstmal noch IP, device_id ist eine andere als die in ssdp übermittelte (letze Teil von UDN)
				}
			});

			server.on('listening', () => {
				this.log.info('musiccast socket listening ');
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
			this.subscribeStates('*');
		} catch (err) {
			this.log.error(`[main] error: ${err.message}, stack: ${err.stack}`);
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	async onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
			if (state && !state.ack) {
				//hier erkennung einbauen um festzustellen ob 2 oder 3 stufige Objekthierarchie

				const tmp = id.split('.');
				const dp = tmp.pop(); //is the instance we are working on
				const idx = tmp.pop(); //is zone, system or other item
				const idy = tmp.pop(); // the device "type"_"uid"
				this.log.info('MusicCast: ' + id + ' identified for command with ' + state.val);

				//ermitteln der IP aus config
				this.log.debug('device with uid = ' + idy.split('_')[1]);
				const uid = idy.split('_')[1];
				const IP = this.getConfigObjects(this.config.devices, 'uid', uid);
				this.log.debug('config items : ' + JSON.stringify(this.config.devices));
				this.log.debug('IP configured : ' + IP[0].ip + ' for UID ' + uid);

				yamaha = new YamahaYXC(IP[0].ip);

				const zone = idx;
				// possible commands not yet implemented
				//			"extra_bass",
				//			"adaptive_drc",
				//			"dts_dialogue_control",
				//			"adaptive_dsp_level"

				// work with boolCMD
				switch (dp) {
					// calls with zone
					case 'power':
					case 'mute':
					case 'surround':
					case 'volume':
					case 'input':
					case 'bass_extension':
					case 'enhancer':
					case 'direct':
					case 'pure_direct':
					case 'sound_program':
					case 'bass':
					case 'treble':
					case 'balance':
					case 'sleep':
					case 'clearVoice':
					case 'link_control':
					case 'link_audio_delay':
					case 'link_audio_quality':
						//command with Zone
						try {
							let value = state.val;
							if (dp === 'power') {
								value = state.val ? 'on' : 'standby';
							}
							const result = await yamaha[dpZoneCommands[dp]](value, zone);
							if (result.response_code === 0) {
								this.log.debug('sent ' + dp + ' succesfully to ' + zone + ' with ' + value);
								//await this.setStateAsync(id, true, true);
							} else {
								this.log.debug('failure ' + dp + '  cmd ' + this.responseFailLog(result));
							}
						} catch (err) {
							this.log.debug('API call failure ' + dp + ' cmd ' + err);
						}
						break;
					//calls without zone
					case 'subwoofer_volume':
						try {
							let value = state.val;
							const result = await yamaha[dpZoneCommands[dp]](value);
							if (result.response_code === 0) {
								this.log.debug('sent ' + dp + ' succesfully with ' + value);
								//await this.setStateAsync(id, true, true);
							} else {
								this.log.debug('failure ' + dp + '  cmd ' + this.responseFailLog(result));
							}
						} catch (err) {
							this.log.debug('API call failure ' + dp + ' cmd ' + err);
						}
					case 'presetrecallnumber':
						/* angeblich soll mit zone der Aufruf gehen, dann muß der Datenpunkt aber in die zonen, ansonsten hat zone=netusb

								yamaha.recallPreset(state.val, zone).then((result) => {
									if (JSON.parse(result).response_code === 0 ){
										this.log.debug('recalled the Preset succesfully in zone  ' + zone + ' to ' + state.val);
										//await this.setStateAsync(id, true, true);
									}
									else {this.log.debug('failure recalling Preset' +  this.responseFailLog(result));}
								});
							
							*/
						try {
							const result = await yamaha[dpCommands[dp]](state.val);
							if (result.response_code === 0) {
								this.log.debug('sent ' + dp + ' succesfully with ' + state.val);
								//await this.setStateAsync(id, true, true);
							} else {
								this.log.debug('failure ' + dp + '  cmd ' + this.responseFailLog(result));
							}
						} catch (err) {
							this.log.debug('API call failure ' + dp + ' cmd ' + err);
						}
						break;
					case 'low':
						try {
							const result = await yamaha.setEqualizer(state.val, '', '', zone);
							if (result.response_code === 0) {
								this.log.debug('set equalizer LOW succesfully  to ' + zone + ' with ' + state.val);
								//await this.setStateAsync(id, true, true);
							} else {
								this.log.debug('failure setting EQ LOW ' + this.responseFailLog(result));
							}
						} catch (err) {
							this.log.debug('API call failure ' + dp + ' cmd ' + err);
						}
						break;
					case 'mid':
						try {
							const result = await yamaha.setEqualizer('', state.val, '', zone);
							if (result.response_code === 0) {
								this.log.debug('set equalizer MID succesfully  to ' + zone + ' with ' + state.val);
								//await this.setStateAsync(id, true, true);
							} else {
								this.log.debug('failure setting EQ MID ' + this.responseFailLog(result));
							}
						} catch (err) {
							this.log.debug('API call failure ' + dp + ' cmd ' + err);
						}
						break;
					case 'high':
						try {
							const result = await yamaha.setEqualizer('', '', state.val, zone);
							if (result.response_code === 0) {
								this.log.debug('set equalizer HIGH succesfully  to ' + zone + ' with ' + state.val);
								//await this.setStateAsync(id, true, true);
							} else {
								this.log.debug('failure setting EQ HIGH ' + this.responseFailLog(result));
							}
						} catch (err) {
							this.log.debug('API call failure ' + dp + ' cmd ' + err);
						}
						break;
					//playback calls with netusb or cd and the action
					case 'prev':
					case 'next':
					case 'stop':
					case 'play':
					case 'pause':
					case 'playPause':
						try {
							let action = dp;
							if (dp === 'prev') action = 'previous';
							if (dp === 'playPause') {
								//ppstate can be 'stop' or 'play'
								const ppstate = await this.getStateAsync(id.replace('playPause', 'playback'));
								if (ppstate.val == 'stop') {
									action = 'play';
								} else {
									action = 'stop';
								}
							}
							const result = await yamaha.setPlayback(action, idx);
							if (result.response_code === 0) {
								this.log.debug('sent ' + dp + ' succesfully to ' + idx);
								//await this.setStateAsync(id, true, true); at playback
							} else {
								this.log.debug('failure ' + dp + ' ' + action + ' cmd ' + this.responseFailLog(result));
							}
						} catch (err) {
							this.log.debug('API call failure ' + dp + ' cmd ' + err);
						}
						break;
					// calls with with netusb or cd
					case 'repeat':
					case 'shuffle':
						try {
							const result = await yamaha[dpToggleCommands[dp]](state.val, zone);
							if (result.response_code === 0) {
								this.log.debug('sent ' + dp + ' succesfully to ' + zone + ' with ' + state.val);
								//await this.setStateAsync(id, true, true);
							} else {
								this.log.debug('failure ' + dp + ' cmd ' + this.responseFailLog(result));
							}
						} catch (err) {
							this.log.debug('API call failure ' + dp + ' cmd ' + err);
						}
						break;
					//distribution
					case 'distr_state':
						//Start/Stop distribution
						//startDistribution(num) als Funktion aufrufen oder hier als
						if (state.val === true || state.val === 'true' || state.val === 'on') {
							var num = 0;
							await yamaha.startDistribution(num).then((result) => {
								if (JSON.parse(result).response_code === 0) {
									this.log.debug('sent Start Distribution');
									//await this.setStateAsync(id, true, true);
								} else {
									this.log.debug('failure sending Start Distribution' + this.responseFailLog(result));
								}
							});
						}
						if (state.val === false || state.val === 'false' || state.val === 'off') {
							var num = 0;
							await yamaha.stopDistribution(num).then((result) => {
								if (JSON.parse(result).response_code === 0) {
									this.log.debug('sent Stop Distribution');
									//await this.setStateAsync(id, true, true);
								} else {
									this.log.debug('failure sending Stop Distribution' + this.responseFailLog(result));
								}
							});
						}
						break;
					case 'add_to_group':
					case 'remove_from_group':
						//state.val enthält die IP des Masters
						const groupID = md5(state.val);
						var clientIP = null;
						let clientpayload = null;
						let masterpayload = null;
						if (dp === 'add_to_group') {
							//addToGroup(state.val, IP[0].ip);
							clientIP = IP[0].ip;
							this.log.debug('clientIP ' + clientIP + 'ID ' + groupID);

							clientpayload = { group_id: groupID, zone: [ 'main' ] };
							masterpayload = {
								group_id: groupID,
								zone: 'main',
								type: 'add',
								client_list: [ clientIP ]
							};
							yamaha2 = new YamahaYXC(state.val);

							await yamaha.setClientInfo(JSON.stringify(clientpayload)).then((result) => {
								if (JSON.parse(result).response_code === 0) {
									this.log.debug('sent ClientInfo : ' + clientIP);
									//await this.setStateAsync(id, true, true);
								} else {
									this.log.debug('failure sending ClientInfo' + this.responseFailLog(result));
								}
							});

							await yamaha2.setServerInfo(JSON.stringify(masterpayload)).then((result) => {
								if (JSON.parse(result).response_code === 0) {
									this.log.debug('sent ServerInfo ' + state.val);
									//await this.setStateAsync(id, true, true);
								} else {
									this.log.debug('failure sending ServerInfo' + this.responseFailLog(result));
								}
							});
							//Übergabewert soll der Nummer des links entsprechen?!
							await yamaha2.startDistribution(0).then((result) => {
								if (JSON.parse(result).response_code === 0) {
									this.log.debug('sent start ServerInfo ' + state.val);
									//await this.setStateAsync(id, true, true);
								} else {
									this.log.debug('failure sending ServerInfo' + this.responseFailLog(result));
								}
							});
						}
						if (dp === 'remove_from_group') {
							//removeFromGroup(state.val, IP[0].ip);
							clientIP = IP[0].ip;
							this.log.debug('clientIP ' + clientIP);
							clientpayload = { group_id: '', zone: [ 'main' ] };
							masterpayload = {
								group_id: groupID,
								zone: 'main',
								type: 'remove',
								client_list: [ clientIP ]
							};

							yamaha2 = new YamahaYXC(state.val);
							//Übergabewert soll der Nummer des links entsprechen?!
							await yamaha2.stopDistribution(0).then((result) => {
								if (JSON.parse(result).response_code === 0) {
									this.log.debug('sent Stop Distribution');
									//await this.setStateAsync(id, true, true);
								} else {
									this.log.debug('failure sending Stop Distribution' + this.responseFailLog(result));
								}
							});

							await yamaha.setClientInfo(JSON.stringify(clientpayload)).then((result) => {
								if (JSON.parse(result).response_code === 0) {
									this.log.debug('sent Client disconnect to : ' + clientIP);
									//await this.setStateAsync(id, true, true);
								} else {
									this.log.debug('failure sending disconnect' + this.responseFailLog(result));
								}
							});

							await yamaha2.setServerInfo(JSON.stringify(masterpayload)).then((result) => {
								if (JSON.parse(result).response_code === 0) {
									this.log.debug('sent ServerInfo to ' + state.val);
									//await this.setStateAsync(id, true, true);
								} else {
									this.log.debug('failure sending ServerInfo' + this.responseFailLog(result));
								}
							});
						}

					default:
						this.log.warn('Warning command is not processed (no case created for it) ' + dp);
				}
			} //if status
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	async onMessage(obj) {
		let wait = false;
		this.log.debug('messagebox received ' + JSON.stringify(obj));
		if (typeof obj === 'object' && obj.message) {
			if (obj.command === 'send') {
				// e.g. send email or pushover or whatever
				this.log.info('msg with obj.command for test received');

				// Send response in callback if required
				if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
			}
		} else if (obj) {
			let result = [];
			switch (obj.command) {
				case 'browse':
					yamaha = new YamahaYXC();
					try {
						const res = await yamaha.discover();
						this.log.debug('result ' + JSON.stringify(res));
						result = res;
						//result.push({ ip: res[0], name: res[1], type: res[2], uid: res[3] });
						this.log.debug('result ' + JSON.stringify(result));

						if (obj.callback) this.sendTo(obj.from, obj.command, result, obj.callback);
					} catch (error) {
						this.log.info('error in sendTo discover()');
						if (obj.callback) this.sendTo(obj.from, obj.command, result, obj.callback);
					}
					wait = true;
					break;

				case 'jsonreq':
					try {
						this.log.info('Message SendTo: jsonreq');
						const devarray = this.config.devices;
						const res = await this.discoverAndGet(devarray);
						result.push(res);
						this.log.debug('result ' + JSON.stringify(result));
						if (obj.callback) this.sendTo(obj.from, obj.command, result, obj.callback);
					} catch (error) {
						this.log.info('error in sendTo jsonreq()');
						if (obj.callback) this.sendTo(obj.from, obj.command, result, obj.callback);
					}
					if (obj.callback) this.sendTo(obj.from, obj.command, responses, obj.callback); //responses wird sukzessive mit den get-Aufrufen befüllt
					wait = true;
					break;
				default:
					this.log.warn('Received Mesage with Unknown command: ' + obj.command);
					break;
			}
		}
		if (!wait && obj.callback) {
			this.log.debug('messagebox landed in last evaluation wait=false and callback');
			this.sendTo(obj.from, obj.command, obj.message, obj.callback);
		}
		return true;
	}
	async discoverAndGet(devicearray) {
		let found = [];
		try {
			if (devicearray) {
				await Promise.all(
					devicearray.map(async (device) => {
						let data = {};
						data[device.name] = {};
						const yamaha = new YamahaYXC(device.ip);
						data[device.name]['system'] = {};
						const getDeviceInfo = await yamaha.getDeviceInfo();
						data[device.name]['system']['getDeviceInfo'] = getDeviceInfo;
						const getNetworkStatus = await yamaha.getNetworkStatus();
						data[device.name]['system']['getNetworkStatus'] = getNetworkStatus;
						const getFuncStatus = await yamaha.getFuncStatus();
						data[device.name]['system']['getFuncStatus'] = getFuncStatus;
						const getLocationInfo = await yamaha.getLocationInfo();
						data[device.name]['system']['getLocationInfo'] = getLocationInfo;
						const getFeatures = await yamaha.getFeatures();
						data[device.name]['system']['getFeatures'] = getFeatures;
						data[device.name]['dist'] = {};
						const getDistributionInfo = await yamaha.getDistributionInfo();
						data[device.name]['dist']['getFeatures'] = getDistributionInfo;
						if (getFeatures['netusb']) {
							data[device.name]['netusb'] = {};
							const getNetPlayInfo = await yamaha.getPlayInfo();
							data[device.name]['netusb']['getPlayInfo'] = getNetPlayInfo;
							const getPresetInfo = await yamaha.getPresetInfo();
							data[device.name]['netusb']['getPresetInfo'] = getPresetInfo;
							const getSettings = await yamaha.getSettings();
							data[device.name]['netusb']['getSettings'] = getSettings;
							const getRecentInfo = await yamaha.getRecentInfo();
							data[device.name]['netusb']['getRecentInfo'] = getRecentInfo;
						}
						if (getFeatures['tuner']) {
							data[device.name]['tuner'] = {};
							const getTunerPlayInfo = await yamaha.getTunerPlayInfo();
							data[device.name]['tuner']['getPlayInfo'] = getTunerPlayInfo;
							const getTunerPresetInfo = await yamaha.getTunerPresetInfo();
							data[device.name]['tuner']['getPresetInfo'] = getTunerPresetInfo;
						}
						if (getFeatures['cd']) {
							data[device.name]['cd'] = {};
							const getCdPlayInfo = await yamaha.getPlayInfo('cd');
							data[device.name]['cd']['getPlayInfo'] = getCdPlayInfo;
						}
						if (getFeatures['clock']) {
							data[device.name]['clock'] = {};
							const getClockSettings = await yamaha.getClockSettings();
							data[device.name]['clock']['getSettings'] = getClockSettings;
						}
						if (getFeatures['zone']) {
							await Promise.all(
								getFeatures['zone'].map(async (zone) => {
									data[device.name][zone.id] = {};
									const getStatus = await yamaha.getStatus(zone.id);
									data[device.name][zone.id]['getStatus'] = getStatus;
									const getSoundProgramList = await yamaha.getSoundProgramList(zone.id);
									data[device.name][zone.id]['getSoundProgramList'] = getSoundProgramList;
									const getSignalInfo = await yamaha.getSignalInfo(zone.id);
									data[device.name][zone.id]['getSignalInfo'] = getSignalInfo;
								})
							);
						}

						found.push(data);
					})
				);
				return Promise.resolve(found);
			}
		} catch (error) {
			return Promise.reject(error);
		}
	}

	responseFailLog(fail) {
		let errcode = '';

		switch (JSON.parse(fail).response_code) {
			case 1:
				errcode = 'Response : 1 Initializing';
				break;
			case 2:
				errcode = 'Response : 2 Internal Error';
				break;
			case 3:
				errcode = 'Response : 3 Invalid Request (A method did not exist, a method wasn’t appropriate etc.)';
				break;
			case 4:
				errcode = 'Response : 4 Invalid Parameter (Out of range, invalid characters etc.)';
				break;
			case 5:
				errcode = 'Response : 5 Guarded (Unable to setup in current status etc.)';
				break;
			case 6:
				errcode = 'Response : 6 Time Out';
				break;
			case 99:
				errcode = 'Response : 99 Firmware Updating';
				break;
			//Streaming Service Errors
			case 100:
				errcode = 'Response : 100 Access Error Streaming Service';
				break;
			case 101:
				errcode = 'Response : 101 Other Errors Streaming Service';
				break;
			case 102:
				errcode = 'Response : 102 Wrong User Name Streaming Service';
				break;
			case 103:
				errcode = 'Response : 103 Wrong Password Streaming Service';
				break;
			case 104:
				errcode = 'Response : 104 Account Expired Streaming Service';
				break;
			case 105:
				errcode = 'Response : 105 Account Disconnected/Gone Off/Shut Down Streaming Service';
				break;
			case 106:
				errcode = 'Response : 106 Account Number Reached to the Limit Streaming Service';
				break;
			case 107:
				errcode = 'Response : 107 Server Maintenance Streaming Service';
				break;
			case 108:
				errcode = 'Response : 108 Invalid Account Streaming Service';
				break;
			case 109:
				errcode = 'Response : 109 License Error Streaming Service';
				break;
			case 110:
				errcode = 'Response : 110 Read Only Mode Streaming Service';
				break;
			case 111:
				errcode = 'Response : 111 Max Stations Streaming Service';
				break;
			case 112:
				errcode = 'Response : 112 Access Denied Streaming Service';
				break;
			case 113:
				errcode = 'Response : 113 There is a need to specify the additional destination Playlist';
				break;
			case 114:
				errcode = 'Response : 114 There is a need to create a new Playlist';
				break;
			case 115:
				errcode = 'Response : 115 Simultaneous logins has reached the upper limit';
				break;
			case 200:
				errcode = 'Response : 200 Linking in progress';
				break;
			case 201:
				errcode = 'Response : 115 Unlinking in progress';
				break;
			default:
				errcode = 'unknown code';
		}

		return errcode;
	}
	/*
	browse(callback) {
		const result = [];
		result.push({ ip: '192.168.178.52', name: 'Wohnzimmer', type: 'YSP-1600', uid: '0B587073' });
		result.push({ ip: '192.168.178.56', name: 'Küche', type: 'WX-030', uid: '0E257883' });
		if (callback) callback(result);
	}
	*/
	getConfigObjects(Obj, where, what) {
		const foundObjects = [];
		for (const prop in Obj) {
			if (Obj[prop][where] == what) {
				foundObjects.push(Obj[prop]);
			}
		}
		return foundObjects;
	}

	async defineMusicDevice(type, uid, name) {
		this.log.info('Setting up System :' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid, {
			type: 'device',
			common: {
				name: 'MusicCast ' + type + ' ' + name,
				role: 'device'
			},
			native: {
				addr: uid
			}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.system', {
			type: 'channel',
			common: {
				name: 'MusicCast System Info',
				role: 'sensor'
			},
			native: {
				addr: uid
			}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.system.api_version', {
			type: 'state',
			common: {
				name: 'API Version',
				type: 'number',
				read: true,
				write: false,
				role: 'value',
				desc: 'API Version'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.system.system_version', {
			type: 'state',
			common: {
				name: 'System Version',
				type: 'number',
				read: true,
				write: false,
				role: 'value',
				desc: 'System Version'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.system.system_id', {
			type: 'state',
			common: {
				name: 'System ID',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'System ID'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.system.device_id', {
			type: 'state',
			common: {
				name: 'Device ID',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'Device ID'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.system.getDeviceInfo', {
			type: 'state',
			common: {
				name: 'Feedback of getDeviceInfo',
				type: 'object',
				read: true,
				write: false,
				role: 'list',
				desc: 'Feedback of getDeviceInfo'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.system.getFeatures', {
			type: 'state',
			common: {
				name: 'Feedback of getFeatures',
				type: 'object',
				read: true,
				write: false,
				role: 'list',
				desc: 'Feedback of getFeatures'
			},
			native: {}
		});
	}
	async defineMusicZoneNew(type, uid, zone, zone_arr) {
		this.log.info('Setting up Zone:' + zone + ' of ' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone, {
			type: 'channel',
			common: {
				name: 'MusicCast Zone ' + type,
				role: 'sensor'
			},
			native: {
				addr: uid
			}
		});
		this.log.info('Setting up Zone:' + zone + ' of ' + type + '-' + uid);
		/*
		if (zone_arr.zone_b){
			this.log.debug('zone b dabei');
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.zone_b', {
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
		} else this.log.debug('zone b nicht dabei');
		*/
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.getStatus', {
			type: 'state',
			common: {
				name: 'Feedback of getStatus',
				type: 'object',
				read: true,
				write: false,
				role: 'list',
				desc: 'Feedback of getStatus'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.disable_flags', {
			type: 'state',
			common: {
				name: 'disable_flags',
				type: 'number',
				read: true,
				write: false,
				role: 'level',
				desc: 'disable_flags'
			},
			native: {}
		});
		if (zone_arr.func_list.indexOf('volume') !== -1) {
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.volume', {
				type: 'state',
				common: {
					name: 'Volume',
					type: 'number',
					min:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'volume';
							})
						].min,
					max:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'volume';
							})
						].max,
					read: true,
					write: true,
					role: 'level.volume',
					desc: 'State and Control of Volume'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.max_volume', {
				type: 'state',
				common: {
					name: 'max Volume',
					type: 'number',
					max:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'volume';
							})
						].max,
					read: true,
					write: false,
					role: 'level',
					desc: 'max Volume'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('mute') !== -1) {
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.mute', {
				type: 'state',
				common: {
					name: 'Mute',
					type: 'boolean',
					read: true,
					write: true,
					role: 'media.mute',
					desc: 'Mute'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('power') !== -1) {
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.power', {
				type: 'state',
				common: {
					name: 'Power ON/OFF(Standby)',
					type: 'boolean',
					read: true,
					write: true,
					role: 'value',
					desc: 'Power ON/OFF(Standby)'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('equalizer') !== -1) {
			this.log.info('Setting up Equalizer in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.low', {
				type: 'state',
				common: {
					name: 'EQ Low',
					type: 'number',
					min:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'equalizer';
							})
						].min,
					max:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'equalizer';
							})
						].max,
					read: true,
					write: true,
					role: 'level',
					desc: 'EQ Low'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.mid', {
				type: 'state',
				common: {
					name: 'EQ Mid',
					type: 'number',
					min:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'equalizer';
							})
						].min,
					max:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'equalizer';
							})
						].max,
					read: true,
					write: true,
					role: 'level',
					desc: 'EQ Mid'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.high', {
				type: 'state',
				common: {
					name: 'EQ High',
					type: 'number',
					min:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'equalizer';
							})
						].min,
					max:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'equalizer';
							})
						].max,
					read: true,
					write: true,
					role: 'level',
					desc: 'EQ High'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.eq_mode', {
				type: 'state',
				common: {
					name: 'EQ Mode',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'EQ Mode'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('sleep') !== -1) {
			this.log.info('Setting up sleep timer in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.sleep', {
				type: 'state',
				common: {
					name: 'Sleep Timer',
					type: 'number',
					read: true,
					write: true,
					min: 0,
					max: 120,
					role: 'level',
					desc: 'Sleep Timer'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('clear_voice') !== -1) {
			this.log.info('Setting up Clear Voice in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.clearVoice', {
				type: 'state',
				common: {
					name: 'Clear Voice cmd',
					type: 'boolean',
					read: true,
					write: true,
					role: 'button',
					desc: 'Clear Voice cmd'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.clear_voice', {
				type: 'state',
				common: {
					name: 'Clear Voice status',
					type: 'boolean',
					read: true,
					write: false,
					role: 'indicator',
					desc: 'Clear Voice status'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('direct') !== -1) {
			this.log.info('Setting up direct in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.direct', {
				type: 'state',
				common: {
					name: 'direct',
					type: 'boolean',
					read: true,
					write: true,
					role: 'button',
					desc: 'direct'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('pure_direct') !== -1) {
			this.log.info('Setting up pure_direct in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.pure_direct', {
				type: 'state',
				common: {
					name: 'pure direct',
					type: 'boolean',
					read: true,
					write: true,
					role: 'button',
					desc: 'pure direct'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('enhancer') !== -1) {
			this.log.info('Setting up pure_direct in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.enhancer', {
				type: 'state',
				common: {
					name: 'enhancer',
					type: 'boolean',
					read: true,
					write: true,
					role: 'button',
					desc: 'enhancer'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('tone_control') !== -1) {
			this.log.info('Setting up tone_control in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.treble', {
				type: 'state',
				common: {
					name: 'treble', //name from system/get Features
					type: 'number',
					min:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'tone_control';
							})
						].min,
					max:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'tone_control';
							})
						].max,
					read: true,
					write: true,
					role: 'level',
					desc: 'treble'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.bass', {
				type: 'state',
				common: {
					name: 'bass',
					type: 'number',
					min:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'tone_control';
							})
						].min,
					max:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'tone_control';
							})
						].max,
					read: true,
					write: true,
					role: 'level',
					desc: 'bass'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.tone_control_mode_list', {
				type: 'state',
				common: {
					name: 'Tone Control Mode options',
					type: 'array',
					read: true,
					write: false,
					role: 'list',
					desc: 'Tone Control Mode options'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.tone_mode', {
				type: 'state',
				common: {
					name: 'Tone control mode',
					type: 'string',
					read: true,
					write: true,
					value: zone_arr.tone_control_mode_list,
					role: 'text',
					desc: 'Tone control mode'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('balance') !== -1) {
			this.log.info('Setting up balance in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.balance', {
				type: 'state',
				common: {
					name: 'balance',
					type: 'number',
					min:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'balance';
							})
						].min,
					max:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'balance';
							})
						].max,
					read: true,
					write: true,
					role: 'level',
					desc: 'balance'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('dialogue_level') !== -1) {
			this.log.info('Setting up dialogue_level in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.dialogue_level', {
				type: 'state',
				common: {
					name: 'dialogue_level',
					type: 'number',
					min:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'dialogue_level';
							})
						].min,
					max:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'dialogue_level';
							})
						].max,
					read: true,
					write: true,
					role: 'level',
					desc: 'dialogue_level'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('dialogue_lift') !== -1) {
			this.log.info('Setting up dialogue_lift in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.dialogue_lift', {
				type: 'state',
				common: {
					name: 'dialogue_lift',
					type: 'number',
					min:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'dialogue_lift';
							})
						].min,
					max:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'dialogue_lift';
							})
						].max,
					read: true,
					write: true,
					role: 'level',
					desc: 'dialogue_lift'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('subwoofer_volume') !== -1) {
			this.log.info('Setting up subwoofer_volume in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.subwoofer_volume', {
				type: 'state',
				common: {
					name: 'subwoofer_volume',
					type: 'number',
					min:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'subwoofer_volume';
							})
						].min,
					max:
						zone_arr.range_step[
							zone_arr.range_step.findIndex(function(row) {
								return row.id == 'subwoofer_volume';
							})
						].max,
					read: true,
					write: true,
					role: 'level',
					desc: 'subwoofer_volume'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('bass_extension') !== -1) {
			this.log.info('Setting up bass_extension in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.bass_extension', {
				type: 'state',
				common: {
					name: 'bass_extension',
					type: 'boolean',
					read: true,
					write: true,
					role: 'button',
					desc: 'bass_extension'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('scene') !== -1) {
			this.log.info('Setting up scene in Zone:' + zone + ' of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.scene_num', {
				type: 'state',
				common: {
					name: 'scene #',
					type: 'number',
					read: true,
					write: false,
					role: 'indicator',
					desc: 'scene #'
				},
				native: {}
			});
			await this.setStateAsync(type + '_' + uid + '.' + zone + '.scene_num', {
				val: zone_arr.scene_num,
				ack: true
			});
		}
		if (zone_arr.func_list.indexOf('contents_display') !== -1) {
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.contents_display', {
				type: 'state',
				common: {
					name: 'contents_display',
					type: 'boolean',
					read: true,
					write: false,
					role: 'indicator',
					desc: 'contents_display'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('signal_info') !== -1) {
			// signal info audio ....
		}
		if (zone_arr.func_list.indexOf('extra_bass') !== -1) {
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.extra_bass', {
				type: 'state',
				common: {
					name: 'extra_bass',
					type: 'boolean',
					read: true,
					write: true,
					role: 'media.extra_bass',
					desc: 'extra_bass'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('adaptive_drc') !== -1) {
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.adaptive_drc', {
				type: 'state',
				common: {
					name: 'adaptive_drce',
					type: 'boolean',
					read: true,
					write: true,
					role: 'media.adaptive_drc',
					desc: 'adaptive_drc'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('adaptive_dsp_level') !== -1) {
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.adaptive_dsp_level', {
				type: 'state',
				common: {
					name: 'adaptive_dsp_level',
					type: 'boolean',
					read: true,
					write: true,
					role: 'media.adaptive_dsp_level',
					desc: 'adaptive_dsp_level'
				},
				native: {}
			});
		}
		if (zone_arr.func_list.indexOf('dts_dialogue_control') !== -1) {
			await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.dts_dialogue_control', {
				type: 'state',
				common: {
					name: 'dts_dialogue_control',
					type: 'number',
					read: true,
					write: true,
					role: 'level',
					desc: 'dts_dialogue_control'
				},
				native: {}
			});
		}
	}
	async defineMusicInputs(type, uid, zone, inputs) {
		this.log.info('Setting up Inputs in Zone:' + zone + ' of ' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.input_list', {
			type: 'state',
			common: {
				name: 'list of inputs',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'list of inputs'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.input', {
			type: 'state',
			common: {
				name: 'Input selection',
				type: 'string',
				read: true,
				write: true,
				values: inputs,
				role: 'text',
				desc: 'Input selection'
			},
			native: {}
		});
		// evtl. muss das zu getStatus
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.input_text', {
			type: 'state',
			common: {
				name: 'Input selection as text',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'Input selection as text'
			},
			native: {}
		});
	}
	async defineMusicLinkCtrl(type, uid, zone, ctrl) {
		this.log.info('Setting up Link Control in Zone:' + zone + ' of ' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.link_control_list', {
			type: 'state',
			common: {
				name: 'link control options',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'link control options'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.link_control', {
			type: 'state',
			common: {
				name: 'link control selection',
				type: 'string',
				read: true,
				write: true,
				values: ctrl,
				role: 'text',
				desc: 'link control selection'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.distribution_enable', {
			type: 'state',
			common: {
				name: 'distribution enable',
				type: 'boolean',
				read: true,
				write: false,
				role: 'indicator',
				desc: 'distribution enable'
			},
			native: {}
		});
		/**zusatzobjekte für mc_link
		*/
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.group_id', {
			type: 'state',
			common: {
				name: 'MC Link group ID',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'MC Link group ID'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.group_name', {
			type: 'state',
			common: {
				name: 'MC Link group name',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'MC Link group name'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.role', {
			type: 'state',
			common: {
				name: 'MC Link group role',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'MC Link group role'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.server_zone', {
			type: 'state',
			common: {
				name: 'MC Link server zone',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'MC Link server zone'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.client_list', {
			type: 'state',
			common: {
				name: 'MC Link client list',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'MC Link client list'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.add_to_group', {
			type: 'state',
			common: {
				name: 'MC Link add client',
				type: 'string',
				read: false,
				write: true,
				role: 'text',
				desc: 'Add a Zone to MClink distribution'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.remove_from_group', {
			type: 'state',
			common: {
				name: 'MC Link remove client',
				type: 'string',
				read: false,
				write: true,
				role: 'text',
				desc: 'Remove a Zone from MClink distribution'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.distr_state', {
			type: 'state',
			common: {
				name: 'MC Link distribution start/stop',
				type: 'boolean',
				read: false,
				write: true,
				role: 'switch',
				desc: 'Start/stop MC Link distribution'
			},
			native: {}
		});
	}
	async defineMusicSoundProg(type, uid, zone, func_list, soundoptions) {
		this.log.info('Setting up SoundProgramm in Zone:' + zone + ' of ' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.sound_program_list', {
			type: 'state',
			common: {
				name: 'Sound Program options',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'Sound Program'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.sound_program', {
			type: 'state',
			common: {
				name: 'Sound Program selection',
				type: 'string',
				read: true,
				write: true,
				values: soundoptions,
				role: 'text',
				desc: 'Sound Program selection'
			},
			native: {}
		});
	}
	async defineMusicSurroundDec(type, uid, zone, func_list, surroundoptions) {
		this.log.info('Setting up Surround in Zone:' + zone + ' of ' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.surr_decoder_type_list', {
			type: 'state',
			common: {
				name: 'Surround options',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'Surround options'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.surr_decoder_type', {
			type: 'state',
			common: {
				name: 'Surround selection',
				type: 'string',
				read: true,
				write: true,
				values: surroundoptions,
				role: 'text',
				desc: 'Surround selection'
			},
			native: {}
		});
	}
	async defineMusicAudioSelect(type, uid, zone, func_list, audiooptions) {
		this.log.info('Setting up Audio Selection in Zone:' + zone + ' of ' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.audio_select_list', {
			type: 'state',
			common: {
				name: 'Audio Selcetion options',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'Audio Selcetion options'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.audio_select', {
			type: 'state',
			common: {
				name: 'Audio selection',
				type: 'string',
				read: true,
				write: true,
				values: audiooptions,
				role: 'text',
				desc: 'Audio selection'
			},
			native: {}
		});
	}
	async defineMusicPartyMode(type, uid, zone) {
		this.log.info('Setting up Party Mode in Zone:' + zone + ' of ' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.party_enable', {
			type: 'state',
			common: {
				name: 'party_enable',
				type: 'boolean',
				read: true,
				write: false,
				role: 'indicator',
				desc: 'party_enable'
			},
			native: {}
		});
	}
	async defineMusicActualVolume(type, uid, zone, func_list, actvolumeoptions, range_step) {
		this.log.info('Setting up Actual Volume in Zone:' + zone + ' of ' + type + '-' + uid);
		this.log.info('Setting up Actual Volume in Zone:' + zone + ' of ' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.actual_volume_mode_list', {
			type: 'state',
			common: {
				name: 'Actual volume mode options',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'Actual volume mode options'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.act_vol_mode', {
			type: 'state',
			common: {
				name: 'Actual Volume Mode',
				type: 'string',
				read: true,
				write: true,
				values: actvolumeoptions,
				role: 'text',
				desc: 'Actual Volume Mode'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.act_vol_val', {
			type: 'state',
			common: {
				name: 'Actual Volume db',
				type: 'number',
				min:
					range_step[
						range_step.findIndex(function(row) {
							return row.id == 'actual_volume_db';
						})
					].min,
				max:
					range_step[
						range_step.findIndex(function(row) {
							return row.id == 'actual_volume_db';
						})
					].max,
				read: true,
				write: true,
				role: 'level.volume',
				desc: 'State and Control of Volume db'
			},
			native: {}
		});

		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.act_vol_unit', {
			type: 'state',
			common: {
				name: 'Actual Volume Unit',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'Actual Volume Unit'
			},
			native: {}
		});
	}
	async defineMusicLinkAudioDelay(type, uid, zone, func_list, linkaudiolist) {
		this.log.info('Setting up link_audio_delay in Zone:' + zone + ' of ' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.link_audio_delay', {
			type: 'state',
			common: {
				name: 'link_audio_delay',
				type: 'string',
				read: true,
				write: true,
				values: linkaudiolist,
				role: 'text',
				desc: 'link_audio_delay'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.link_audio_delay_list', {
			type: 'state',
			common: {
				name: 'link_audio_delay_list',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'link_audio_delay_list'
			},
			native: {}
		});
	}
	async defineMusicLinkAudioQuality(type, uid, zone, func_list, linkaudiolist) {
		this.log.info('Setting up link_audio_quality in Zone:' + zone + ' of ' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.link_audio_quality', {
			type: 'state',
			common: {
				name: 'link_audio_quality',
				type: 'string',
				read: true,
				write: true,
				values: linkaudiolist,
				role: 'text',
				desc: 'link_audio_quality'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.' + zone + '.link_audio_quality_list', {
			type: 'state',
			common: {
				name: 'link_audio_quality_list',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'link_audio_quality_list'
			},
			native: {}
		});
	}
	async defineMusicSystemInputs(type, uid, sysinputs) {
		this.log.debug(type + ' has number of system inputs : ' + sysinputs.length);
		for (let i = 0; i < sysinputs.length; i++) {
			this.log.info(type + ' setting up input : ' + sysinputs[i].id);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.system.inputs.' + sysinputs[i].id, {
				type: 'channel',
				common: {
					name: 'Input ' + sysinputs[i].id,
					role: 'sensor'
				},
				native: {
					addr: uid
				}
			});
			await this.setObjectNotExistsAsync(
				type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.distribution_enable',
				{
					type: 'state',
					common: {
						name: 'distribution enabled',
						type: 'boolean',
						read: true,
						write: false,
						role: 'indicator',
						desc: 'distribution enabled'
					},
					native: {}
				}
			);
			await this.setObjectNotExistsAsync(
				type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.account_enable',
				{
					type: 'state',
					common: {
						name: 'account to be enabled',
						type: 'boolean',
						read: true,
						write: false,
						role: 'indicator',
						desc: 'account to be enabled'
					},
					native: {}
				}
			);
			await this.setObjectNotExistsAsync(
				type + '_' + uid + '.system.inputs.' + sysinputs[i].id + '.play_info_type',
				{
					type: 'state',
					common: {
						name: 'play info type',
						type: 'string',
						read: true,
						write: false,
						role: 'indicator',
						desc: 'play info type'
					},
					native: {}
				}
			);
		}
	}
	async defineMusicNetUsb(type, uid) {
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb', {
			type: 'channel',
			common: {
				name: 'MusicCast NetUSB ' + type,
				role: 'sensor'
			},
			native: {
				addr: uid
			}
		});
		this.log.info('Setting up NetUSB of :' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.getPlayInfo', {
			type: 'state',
			common: {
				name: 'Feedback of getPlayInfo',
				type: 'object',
				read: true,
				write: false,
				role: 'list',
				desc: 'Feedback of getPlayInfo'
			},
			native: {}
		});

		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.playPause', {
			type: 'state',
			common: {
				name: 'play',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button.play',
				desc: 'play'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.playback', {
			type: 'state',
			common: {
				name: 'playback status',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'playback status'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.stop', {
			type: 'state',
			common: {
				name: 'Stop',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button.stop',
				desc: 'Stop'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.next', {
			type: 'state',
			common: {
				name: 'next',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button.next',
				desc: 'next'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.prev', {
			type: 'state',
			common: {
				name: 'prev',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button.prev',
				desc: 'next'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.shuffle', {
			type: 'state',
			common: {
				name: 'shuffle toggle button',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button',
				desc: 'shuffle toggle button'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.shuffle_stat', {
			type: 'state',
			common: {
				name: 'shuffle status',
				type: 'string',
				read: true,
				write: false,
				role: 'text', //can be toggled off, on, songs, album
				desc: 'shuffle status'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.repeat', {
			type: 'state',
			common: {
				name: 'repeat toggle button',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button',
				desc: 'repeat toggle button'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.repeat_stat', {
			type: 'state',
			common: {
				name: 'repeat status',
				type: 'string',
				read: true,
				write: false,
				role: 'text', //can be toggled off, one, all
				desc: 'repeat status'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.artist', {
			type: 'state',
			common: {
				name: 'artist',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'artist'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.album', {
			type: 'state',
			common: {
				name: 'album',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'album'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.track', {
			type: 'state',
			common: {
				name: 'track',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'track'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.albumart_url', {
			type: 'state',
			common: {
				name: 'albumart url', //ip of device + albumarturl
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'albumart url'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.input', {
			type: 'state',
			common: {
				name: 'active input netusb',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'active input on netusb'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.play_queue_type', {
			type: 'state',
			common: {
				name: 'queue type netusb',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'queue type netusb'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.play_time', {
			type: 'state',
			common: {
				name: 'played  time',
				type: 'number',
				read: true,
				write: false,
				unit: 's',
				role: 'value',
				desc: 'played time'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.total_time', {
			type: 'state',
			common: {
				name: 'total time played',
				type: 'number',
				read: true,
				write: false,
				unit: 's',
				role: 'value',
				desc: 'total time played'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.recent_info', {
			type: 'state',
			common: {
				name: 'netusb playback history',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'netusb playback history'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.preset_info', {
			type: 'state',
			common: {
				name: 'netusb favourites',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'netusb favourites'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.presetrecallnumber', {
			type: 'state',
			common: {
				name: 'recall preset number',
				type: 'number',
				read: true,
				write: true,
				role: 'level',
				desc: 'recall preset number' //wie wird die zone abgeleitet, wenn mehr als main?
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.usb_devicetype', {
			type: 'state',
			common: {
				name: 'type of USB device',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'type of USB device' // "msc" / "ipod" / "unknown"
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.attribute', {
			type: 'state',
			common: {
				name: 'service attribute',
				type: 'number',
				read: true,
				write: false,
				role: 'value',
				desc: 'service attribute' // must be decoded for detection which possibilities come with the service
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.auto_stopped', {
			type: 'state',
			common: {
				name: 'automatically stopped',
				type: 'boolean',
				read: true,
				write: false,
				role: 'value',
				desc: 'automatically stopped'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.repeat_available', {
			type: 'state',
			common: {
				name: 'netusb array repeat',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'netusb array repeat'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.netusb.shuffle_available', {
			type: 'state',
			common: {
				name: 'netusb array shuffle',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'netusb array shuffle'
			},
			native: {}
		});
	}
	async defineMusicCD(type, uid) {
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd', {
			type: 'channel',
			common: {
				name: 'MusicCast CD ' + type,
				role: 'sensor'
			},
			native: {
				addr: uid
			}
		});
		this.log.info('Setting up CD of :' + type + '-' + uid);
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.getPlayInfo', {
			type: 'state',
			common: {
				name: 'Feedback of getPlayInfo',
				type: 'object',
				read: true,
				write: false,
				role: 'list',
				desc: 'Feedback of getPlayInfo'
			},
			native: {}
		});

		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.playPause', {
			type: 'state',
			common: {
				name: 'play',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button.play',
				desc: 'play'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.stop', {
			type: 'state',
			common: {
				name: 'Stop',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button.stop',
				desc: 'Stop'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.next', {
			type: 'state',
			common: {
				name: 'next',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button.next',
				desc: 'next'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.prev', {
			type: 'state',
			common: {
				name: 'prev',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button.prev',
				desc: 'next'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.shuffle', {
			type: 'state',
			common: {
				name: 'shuffle',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button', // can be false = off / true = on
				desc: 'shuffle'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.shuffle_stat', {
			type: 'state',
			common: {
				name: 'shuffle status',
				type: 'string',
				read: true,
				write: false,
				role: 'text', //can return "off" / "on" / "folder" / "program"
				desc: 'shuffle status'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.repeat', {
			type: 'state',
			common: {
				name: 'repeat toggle button',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button',
				desc: 'repeat toggle button'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.repeat_stat', {
			type: 'state',
			common: {
				name: 'repeat status',
				type: 'string',
				read: true,
				write: false,
				role: 'text', //can be toggled off, one, all
				desc: 'repeat status'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.device_status', {
			type: 'state',
			common: {
				name: 'device status',
				type: 'string',
				read: true,
				write: false,
				role: 'text', //"open" / "close" / "ready" / "not_ready"
				desc: 'device status'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.playback', {
			type: 'state',
			common: {
				name: 'playback status',
				type: 'string',
				read: true,
				write: false,
				role: 'text', // "play" / "stop" / "pause" / "fast_reverse" / "fast_forward"
				desc: 'playback status'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.play_time', {
			type: 'state',
			common: {
				name: 'current playback time',
				type: 'number',
				read: true,
				write: false,
				unit: 's',
				role: 'value',
				desc: 'current playback time'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.total_time', {
			type: 'state',
			common: {
				name: 'total track playback time',
				type: 'number',
				read: true,
				write: false,
				unit: 's',
				role: 'value',
				desc: 'current track total playback time'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.disc_time', {
			type: 'state',
			common: {
				name: 'CD total playback time',
				type: 'number',
				read: true,
				write: false,
				unit: 's',
				role: 'value',
				desc: 'CD total playback time'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.track_number', {
			type: 'state',
			common: {
				name: 'track current in playback',
				type: 'number',
				read: true,
				write: false,
				role: 'value', // If no track, or playback status is complete stop, returns -1.
				desc: 'track current in playback'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.total_tracks', {
			type: 'state',
			common: {
				name: 'total CD tracks',
				type: 'number',
				read: true,
				write: false,
				role: 'value',
				desc: 'total CD tracks'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.artist', {
			type: 'state',
			common: {
				name: 'CD artist name',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'CD artist name'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.album', {
			type: 'state',
			common: {
				name: 'CD album title',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'CD album title'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.cd.track', {
			type: 'state',
			common: {
				name: 'CD track title',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'CD track title'
			},
			native: {}
		});
	}
	async defineMusicTuner(type, uid, func_list, range_step, preset) {
		await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner', {
			type: 'channel',
			common: {
				name: 'MusicCast Tuner ' + type,
				role: 'sensor'
			},
			native: {
				addr: uid
			}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.getPlayInfo', {
			type: 'state',
			common: {
				name: 'Feedback of getPlayInfo',
				type: 'object',
				read: true,
				write: false,
				role: 'list',
				desc: 'Feedback of getPlayInfo'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.common_preset_info', {
			type: 'state',
			common: {
				name: 'Tuner Common favourites',
				type: 'array',
				read: true,
				write: false,
				role: 'list',
				desc: 'Tuner Common favourites'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.band', {
			type: 'state',
			common: {
				name: 'Tuner band',
				type: 'string',
				read: true,
				write: false,
				role: 'text',
				desc: 'Tuner band'
			},
			native: {}
		});
		if (func_list.indexOf('am') !== -1) {
			this.log.info('Setting up AM Tuner of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.am.preset_info', {
				type: 'state',
				common: {
					name: 'Tuner AM favourites',
					type: 'array',
					read: true,
					write: false,
					role: 'list',
					desc: 'Tuner AM favourites'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.am.preset', {
				type: 'state',
				common: {
					name: 'AM Preset number',
					type: 'number',
					min: 0,
					max: 40, //eigentlich von getFeatures range_step[range_step.indexOf(preset)].max
					read: true,
					write: true,
					role: 'level',
					desc: 'AM preset number'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.am.freq', {
				type: 'state',
				common: {
					name: 'AM Frequency',
					type: 'number',
					min:
						range_step[
							range_step.findIndex(function(row) {
								return row.id == 'am';
							})
						].min,
					max:
						range_step[
							range_step.findIndex(function(row) {
								return row.id == 'am';
							})
						].max,
					step: 9,
					unit: 'kHz',
					read: true,
					write: true,
					role: 'level',
					desc: 'AM Frequency'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.am.tuned', {
				type: 'state',
				common: {
					name: 'AM tuned',
					type: 'boolean',
					read: true,
					write: false,
					role: 'switch',
					desc: 'AM tuned'
				},
				native: {}
			});
		}
		if (func_list.indexOf('fm') !== -1) {
			this.log.info('Setting up FM Tuner of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.fm.preset_info', {
				type: 'state',
				common: {
					name: 'Tuner FM favourites',
					type: 'array',
					read: true,
					write: false,
					role: 'list',
					desc: 'Tuner FM favourites'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.fm.preset', {
				type: 'state',
				common: {
					name: 'FM Preset number',
					type: 'number',
					min: 0,
					max: 40, //eigentlich von getFeatures range_step[range_step.indexOf(preset)].max
					read: true,
					write: true,
					role: 'level',
					desc: 'FM preset number'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.fm.freq', {
				type: 'state',
				common: {
					name: 'FM Frequency',
					type: 'number',
					min:
						range_step[
							range_step.findIndex(function(row) {
								return row.id == 'fm';
							})
						].min,
					max:
						range_step[
							range_step.findIndex(function(row) {
								return row.id == 'fm';
							})
						].max,
					step: 50,
					unit: 'kHz',
					read: true,
					write: true,
					role: 'level',
					desc: 'FM Frequency'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.fm.tuned', {
				type: 'state',
				common: {
					name: 'FM tuned',
					type: 'boolean',
					read: true,
					write: false,
					role: 'switch',
					desc: 'FM tuned'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.fm.audio_mode', {
				type: 'state',
				common: {
					name: 'FM audio_mode',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'FM audio_mode'
				},
				native: {}
			});
		}
		if (func_list.indexOf('rds') !== -1) {
			this.log.info('Setting up RDS Tuner of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.rds.program_type', {
				type: 'state',
				common: {
					name: 'RDS program type',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'RDS program type'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.rds.program_service', {
				type: 'state',
				common: {
					name: 'RDS program_service',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'RDS program_service'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.rds.radio_text_a', {
				type: 'state',
				common: {
					name: 'RDS Radio Text A',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'RDS Radio Text A'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.rds.radio_text_b', {
				type: 'state',
				common: {
					name: 'RDS Radio Text B',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'RDS Radio Text B'
				},
				native: {}
			});
		}
		if (func_list.indexOf('dab') !== -1) {
			this.log.info('Setting up DAB Tuner of ' + type + '-' + uid);
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.preset_info', {
				type: 'state',
				common: {
					name: 'Tuner DAB favourites',
					type: 'array',
					read: true,
					write: false,
					role: 'list',
					desc: 'Tuner DAB favourites'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.preset', {
				type: 'state',
				common: {
					name: 'DAB Preset number',
					type: 'number',
					min: 0,
					max: 40, //eigentlich von getFeatures
					read: true,
					write: true,
					role: 'level',
					desc: 'DAB preset number'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.id', {
				type: 'state',
				common: {
					name: 'DAB Station ID',
					type: 'number',
					read: true,
					write: false,
					role: 'indicator',
					desc: 'DAB Station ID'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.status', {
				type: 'state',
				common: {
					name: 'DAB Status',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'DAB Status'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.freq', {
				type: 'state',
				common: {
					name: 'DAB Frequency',
					type: 'number',
					min: 174000,
					max: 240000,
					unit: 'kHz',
					read: true,
					write: false,
					role: 'indicator',
					desc: 'DAB Frequency'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.category', {
				type: 'state',
				common: {
					name: 'DAB Category',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'DAB category'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.audio_mode', {
				type: 'state',
				common: {
					name: 'DAB audio_mode',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'DAB audio_mode'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.bit_rate', {
				type: 'state',
				common: {
					name: 'DAB Bit Rate',
					type: 'number',
					min: 32,
					max: 256,
					unit: 'kbps',
					read: true,
					write: false,
					role: 'indicator',
					desc: 'DAB Bit Rate'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.quality', {
				type: 'state',
				common: {
					name: 'DAB quality',
					type: 'number',
					min: 0,
					max: 100,
					read: true,
					write: false,
					role: 'indicator',
					desc: 'DAB quality'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.tune_aid', {
				type: 'state',
				common: {
					name: 'DAB signal strength',
					type: 'number',
					min: 0,
					max: 100,
					read: true,
					write: false,
					role: 'indicator',
					desc: 'DAB signal strength'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.off_air', {
				type: 'state',
				common: {
					name: 'DAB Off Air Status',
					type: 'boolean',
					read: true,
					write: false,
					role: 'switch',
					desc: 'DAB Off Air Status'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.dab_plus', {
				type: 'state',
				common: {
					name: 'DAB+ Status',
					type: 'boolean',
					read: true,
					write: false,
					role: 'switch',
					desc: 'DAB+ Status'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.audio_mode', {
				type: 'state',
				common: {
					name: 'DAB Audio Mode', //mono/stereo
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'DAB Audio Mode'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.program_type', {
				type: 'state',
				common: {
					name: 'DAB Program Type',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'DAB Program Type'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.ch_label', {
				type: 'state',
				common: {
					name: 'DAB CH label',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'DAB CH label'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.service_label', {
				type: 'state',
				common: {
					name: 'DAB Service label',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'DAB Service label'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.dls', {
				type: 'state',
				common: {
					name: 'DAB DLS',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'DAB DLS'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.ensemble_label', {
				type: 'state',
				common: {
					name: 'DAB ensemble label',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'DAB ensemble label'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.initial_scan_progress', {
				type: 'state',
				common: {
					name: 'DAB initial scan progress',
					type: 'number',
					min: 0,
					max: 100,
					read: true,
					write: false,
					role: 'indicator',
					desc: 'DAB initial scan progress'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.tuner.dab.total_station_num', {
				type: 'state',
				common: {
					name: 'DAB total station number',
					type: 'number',
					min: 0,
					max: 255,
					read: true,
					write: false,
					role: 'indicator',
					desc: 'DAB total station number'
				},
				native: {}
			});
		}
	}
	async defineMusicClock(
		type,
		uid,
		func_list,
		range_step,
		alarm_fade_type_num,
		alarm_mode_list,
		alarm_input_list,
		alarm_preset_list
	) {
		await this.setObjectNotExistsAsync(type + '_' + uid + '.clock', {
			type: 'channel',
			common: {
				name: 'MusicCast Clock ' + type,
				role: 'sensor'
			},
			native: {
				addr: uid
			}
		});
		this.log.info('Setting up Clock of :' + type + '-' + uid);
		//generic clock objects
		await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.getSettings', {
			type: 'state',
			common: {
				name: 'Feedback of getStatus',
				type: 'object',
				read: true,
				write: false,
				role: 'list',
				desc: 'Feedback of getStatus'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.auto_sync', {
			type: 'state',
			common: {
				name: 'Clock time auto sync',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button',
				desc: 'Clock time auto sync'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.format', {
			type: 'state',
			common: {
				name: 'Clock format time display',
				type: 'string',
				read: true,
				write: true,
				role: 'text',
				desc: 'Clock format time display'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.alarm_on', {
			type: 'state',
			common: {
				name: 'Clock Alarm function on/off',
				type: 'boolean',
				read: true,
				write: true,
				role: 'button',
				desc: 'Clock Alarm function on/off'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.volume', {
			type: 'state',
			common: {
				name: 'Clock Alarm volume',
				type: 'number',
				min:
					range_step[
						range_step.findIndex(function(row) {
							return row.id == 'alarm_volume';
						})
					].min,
				max:
					range_step[
						range_step.findIndex(function(row) {
							return row.id == 'alarm_volume';
						})
					].max,
				step: 1, //eigentlich von getFeatures range_step[range_step.indexOf(alarm_volume)].step
				read: true,
				write: true,
				role: 'level',
				desc: 'Clock Alarm volume'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.fade_interval', {
			type: 'state',
			common: {
				name: 'Clock Alarm Fade Interval',
				type: 'number',
				min:
					range_step[
						range_step.findIndex(function(row) {
							return row.id == 'alarm_fade';
						})
					].min,
				max:
					range_step[
						range_step.findIndex(function(row) {
							return row.id == 'alarm_fade';
						})
					].max,
				read: true,
				write: true,
				role: 'level',
				desc: 'Clock Alarm Fade Interval'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.fade_type', {
			type: 'state',
			common: {
				name: 'Clock Fade Type',
				type: 'number',
				min: 0, //eigentlich von getFeatures
				max: 9, //eigentlich von getFeatures alarm_fade_type_numbers
				read: true,
				write: true,
				role: 'level',
				desc: 'Clock Alarm Fade Type'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.mode', {
			type: 'state',
			common: {
				name: 'Clock Alarm Mode', // oneday/weekly
				type: 'string',
				read: true,
				write: true,
				role: 'text',
				desc: 'Clock Alarm Mode'
			},
			native: {}
		});

		//day related clock objects
		if (alarm_mode_list.indexOf('oneday') !== -1) {
			await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.oneday.enable', {
				type: 'state',
				common: {
					name: 'Clock Oneday Alarm Enable',
					type: 'boolean',
					read: true,
					write: true,
					role: 'button',
					desc: 'Clock Oneday Alarm Enable'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.oneday.time', {
				type: 'state',
				common: {
					name: 'Clock Oneday Alarm Time',
					type: 'string',
					read: true,
					write: true,
					role: 'text',
					desc: 'Clock Oneday Alarm Time'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.oneday.beep', {
				type: 'state',
				common: {
					name: 'Clock Oneday Alarm Beep',
					type: 'boolean',
					read: true,
					write: true,
					role: 'button',
					desc: 'Clock Oneday Alarm Beep'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.oneday.playback_type', {
				type: 'state',
				common: {
					name: 'Clock Oneday Alarm Playback Type',
					type: 'string',
					read: true,
					write: true,
					role: 'text',
					desc: 'Clock Oneday Alarm Playback Type'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.oneday.resume_input', {
				type: 'state',
				common: {
					name: 'Clock Oneday Alarm Resume Input',
					type: 'string',
					read: true,
					write: true,
					role: 'text',
					desc: 'Clock Oneday Alarm Resume Input'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.oneday.preset_type', {
				type: 'state',
				common: {
					name: 'Clock Oneday Alarm Preset Type',
					type: 'string',
					read: true,
					write: true,
					role: 'text',
					desc: 'Clock Oneday Alarm Preset Type'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.oneday.preset_num', {
				type: 'state',
				common: {
					name: 'Clock Oneday Alarm Preset Number',
					type: 'number',
					min: 0, //eigentlich von getFeatures
					max: 40, //eigentlich von getFeatures
					read: true,
					write: true,
					role: 'level',
					desc: 'Clock Oneday Alarm Preset Number'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.oneday.preset_netusb_input', {
				type: 'state',
				common: {
					name: 'Clock Oneday Alarm Netusb input ID',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'Clock Oneday Alarm Netusb input ID'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.oneday.preset_netusb_text', {
				type: 'state',
				common: {
					name: 'Clock Oneday Alarm Netusb input text',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'Clock Oneday Alarm Netusb input text'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.oneday.preset_tuner_band', {
				type: 'state',
				common: {
					name: 'Clock Oneday Alarm Tuner Band',
					type: 'string',
					read: true,
					write: false,
					role: 'text',
					desc: 'Clock Oneday Alarm Tuner Band'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.oneday.preset_tuner_number', {
				type: 'state',
				common: {
					name: 'Clock Oneday Alarm Preset Tuner Freq od ID',
					type: 'number',
					min: 0, //eigentlich von getFeatures
					max: 40, //eigentlich von getFeatures
					read: true,
					write: true,
					role: 'level',
					desc: 'Clock Oneday Alarm Preset Tuner Freq or ID'
				},
				native: {}
			});
		}

		if (alarm_mode_list.indexOf('weekly') !== -1) {
			const days = [ 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday' ];
			for (const anz in days) {
				//loop days[anz]
				await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.' + days[anz] + '.enable', {
					type: 'state',
					common: {
						name: 'Clock' + days[anz] + 'Alarm Enable',
						type: 'boolean',
						read: true,
						write: true,
						role: 'button',
						desc: 'Clock' + days[anz] + 'Alarm Enable'
					},
					native: {}
				});
				await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.' + days[anz] + '.time', {
					type: 'state',
					common: {
						name: 'Clock' + days[anz] + 'Alarm Time',
						type: 'string',
						read: true,
						write: true,
						role: 'text',
						desc: 'Clock' + days[anz] + 'Alarm Time'
					},
					native: {}
				});
				await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.' + days[anz] + '.beep', {
					type: 'state',
					common: {
						name: 'Clock' + days[anz] + 'Alarm Beep',
						type: 'boolean',
						read: true,
						write: true,
						role: 'button',
						desc: 'Clock' + days[anz] + 'Alarm Beep'
					},
					native: {}
				});
				await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.' + days[anz] + '.playback_type', {
					type: 'state',
					common: {
						name: 'Clock' + days[anz] + 'Alarm Playback Type',
						type: 'string',
						read: true,
						write: true,
						role: 'text',
						desc: 'Clock' + days[anz] + 'Alarm Playback Type'
					},
					native: {}
				});
				await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.' + days[anz] + '.resume_input', {
					type: 'state',
					common: {
						name: 'Clock' + days[anz] + 'Alarm Resume Input',
						type: 'string',
						read: true,
						write: true,
						role: 'text',
						desc: 'Clock' + days[anz] + 'Alarm Resume Input'
					},
					native: {}
				});
				await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.' + days[anz] + '.preset_type', {
					type: 'state',
					common: {
						name: 'Clock' + days[anz] + 'Alarm Preset Type',
						type: 'string',
						read: true,
						write: true,
						role: 'text',
						desc: 'Clock' + days[anz] + 'Alarm Preset Type'
					},
					native: {}
				});
				await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.' + days[anz] + '.preset_num', {
					type: 'state',
					common: {
						name: 'Clock' + days[anz] + 'Alarm Preset Number',
						type: 'number',
						min: 0, //eigentlich von getFeatures
						max: 40, //eigentlich von getFeatures
						read: true,
						write: true,
						role: 'level',
						desc: 'Clock' + days[anz] + 'Alarm Preset Number'
					},
					native: {}
				});
				await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.' + days[anz] + '.preset_netusb_input', {
					type: 'state',
					common: {
						name: 'Clock' + days[anz] + 'Alarm Netusb input ID',
						type: 'string',
						read: true,
						write: false,
						role: 'text',
						desc: 'Clock' + days[anz] + 'Alarm Netusb input ID'
					},
					native: {}
				});
				await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.' + days[anz] + '.preset_netusb_text', {
					type: 'state',
					common: {
						name: 'Clock' + days[anz] + 'Alarm Netusb input text',
						type: 'string',
						read: true,
						write: false,
						role: 'text',
						desc: 'Clock' + days[anz] + 'Alarm Netusb input text'
					},
					native: {}
				});
				await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.' + days[anz] + '.preset_tuner_band', {
					type: 'state',
					common: {
						name: 'Clock' + days[anz] + 'Alarm Tuner Band',
						type: 'string',
						read: true,
						write: false,
						role: 'text',
						desc: 'Clock' + days[anz] + 'Alarm Tuner Band'
					},
					native: {}
				});
				await this.setObjectNotExistsAsync(type + '_' + uid + '.clock.' + days[anz] + '.preset_tuner_number', {
					type: 'state',
					common: {
						name: 'Clock' + days[anz] + 'Alarm Preset Tuner Freq od ID',
						type: 'number',
						min: 0, //eigentlich von getFeatures
						max: 40, //eigentlich von getFeatures
						read: true,
						write: true,
						role: 'level',
						desc: 'Clock' + days[anz] + 'Alarm Preset Tuner Freq or ID'
					},
					native: {}
				});
			}
		}
	}
	// status requests
	async getMusicDeviceInfo(ip, type, uid) {
		const devip = ip;
		const devtype = type;
		const devuid = uid;
		yamaha = new YamahaYXC(ip);
		try {
			const result = await yamaha.getDeviceInfo();
			const att = result;
			if (att.response_code === 0) {
				this.log.debug('got device info succesfully from ' + devip);

				const resp = { device: devtype + '_' + devuid, request: '/system/getDeviceInfo', responses: att };
				if (
					!responses.find((o) => o.device === devtype + '_' + devuid && o.request === '/system/getDeviceInfo')
				)
					responses.push(resp);

				await this.setStateAsync(devtype + '_' + devuid + '.system.getDeviceInfo', {
					val: att,
					ack: true
				});

				await this.setStateAsync(devtype + '_' + devuid + '.system.api_version', {
					val: att.api_version,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.system.system_version', {
					val: att.system_version,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.system.system_id', {
					val: att.system_id,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.system.device_id', {
					val: att.device_id,
					ack: true
				});
			} else {
				this.log.debug('failure getting device info from  ' + devip + ' : ' + this.responseFailLog(result));
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicDeviceInfo] error: ${err.message}, stack: ${err.stack}`);
			}
		}
	}
	async getMusicZoneInfo(ip, type, uid, zone) {
		const devip = ip;
		const devtype = type;
		const devuid = uid;
		const zone_name = zone || 'main';
		yamaha = new YamahaYXC(ip);
		try {
			const result = await yamaha.getStatus(zone_name);
			const att = result;
			if (att.response_code === 0) {
				this.log.debug('got status info succesfully from ' + devip + ' for ' + zone_name);

				const resp = {
					device: devtype + '_' + devuid,
					request: '/' + zone_name + '/getStatus',
					responses: att
				};
				if (
					!responses.find(
						(o) => o.device === devtype + '_' + devuid && o.request === '/' + zone_name + '/getStatus'
					)
				)
					responses.push(resp);
				await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.getStatus', {
					val: JSON.stringify(att),
					ack: true
				});

				for (const key in att) {
					if (key == 'tone_control') {
						const tone = att[key];
						for (var id in tone) {
							this.log.debug('Zone Status Update ' + key + ' ' + id + '  at ' + tone[id]);
							if (id == 'mode') {
								await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.tone_mode', {
									val: tone[id],
									ack: true
								});
							} else {
								await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.' + id, {
									val: tone[id],
									ack: true
								});
							}
						}
					} else if (key == 'equalizer') {
						const eq = att[key];
						for (var id in eq) {
							this.log.debug('Zone Status Update ' + key + ' ' + id + '  at ' + eq[id]);
							if (id == 'mode') {
								await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.eq_mode', {
									val: eq[id],
									ack: true
								});
							} else {
								await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.' + id, {
									val: eq[id],
									ack: true
								});
							}
						}
					} else if (key == 'actual_volume') {
						this.log.debug('Zone Status Update ' + key + '  at ' + att[key]);
						await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.act_vol_mode', {
							val: att[key].mode,
							ack: true
						});
						await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.act_vol_val', {
							val: att[key].value,
							ack: true
						});
						await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.act_vol_unit', {
							val: att[key].unit,
							ack: true
						});
					} else if (key == 'power') {
						const convertValue = att[key] === 'on' ? true : false;

						this.log.debug('Zone Status Update ' + key + '  at ' + att[key] + ' (' + convertValue + ')');
						await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.' + key, {
							val: convertValue,
							ack: true
						});
					} else if (key == 'response_code') {
						// prevent writing on non existing object
					} else {
						this.log.debug('Zone Status Update ' + key + '  at ' + att[key]);
						await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.' + key, {
							val: att[key],
							ack: true
						});
					}
				}
			} else {
				this.log.debug('failure getting status info from  ' + devip + ' : ' + this.responseFailLog(result));
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH') || err.message.includes('connect ETIMEDOUT')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicZoneInfo] error: ${err.message}, stack: ${err.stack}`);
			}
		}
	}
	//mehr als Liste, auch die inputs mit ihren werten
	async getMusicZoneLists(ip, type, uid) {
		const devip = ip;
		const devtype = type;
		const devuid = uid;
		yamaha = new YamahaYXC(ip);
		try {
			const result = await yamaha.getFeatures();
			const att = result;
			if (att.response_code === 0) {
				for (let i = 0; i < att.system.zone_num; i++) {
					const zone_name = att.zone[i].id;
					//inputs gibts immer
					await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.input_list', {
						val: JSON.stringify(att.zone[i].input_list),
						ack: true
					});

					if (att.zone[i].func_list.indexOf('tone_control') !== -1) {
						await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.tone_control_mode_list', {
							val: JSON.stringify(att.zone[i].tone_control_mode_list),
							ack: true
						});
					}
					if (att.zone[i].func_list.indexOf('link_control') !== -1) {
						await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.link_control_list', {
							val: JSON.stringify(att.zone[i].link_control_list),
							ack: true
						});
					}
					if (att.zone[i].func_list.indexOf('link_audio_delay') !== -1) {
						await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.link_audio_delay_list', {
							val: JSON.stringify(att.zone[i].link_audio_delay_list),
							ack: true
						});
					}
					if (att.zone[i].func_list.indexOf('link_audio_quality') !== -1) {
						await this.setStateAsync(
							devtype + '_' + devuid + '.' + zone_name + '.link_audio_quality_list',
							{ val: JSON.stringify(att.zone[i].link_audio_quality_list), ack: true }
						);
					}
					if (att.zone[i].func_list.indexOf('sound_program') !== -1) {
						await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.sound_program_list', {
							val: JSON.stringify(att.zone[i].sound_program_list),
							ack: true
						});
					}
					if (att.zone[i].func_list.indexOf('audio_select') !== -1) {
						await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.audio_select_list', {
							val: JSON.stringify(att.zone[i].audio_select_list),
							ack: true
						});
					}
					if (att.zone[i].func_list.indexOf('surr_decoder_type') !== -1) {
						await this.setStateAsync(devtype + '_' + devuid + '.' + zone_name + '.surr_decoder_type_list', {
							val: JSON.stringify(att.zone[i].surr_decoder_type_list),
							ack: true
						});
					}
					if (att.zone[i].func_list.indexOf('actual_volume') !== -1) {
						await this.setStateAsync(
							devtype + '_' + devuid + '.' + zone_name + '.actual_volume_mode_list',
							{ val: JSON.stringify(att.zone[i].actual_volume_mode_list), ack: true }
						);
					}
				}
				//die inputs in system befüllen
				for (let i = 0; i < att.system.input_list.length; i++) {
					this.log.info(type + ' actual value filling up input : ' + att.system.input_list[i].id);
					//setindef
					await this.setStateAsync(
						devtype +
							'_' +
							devuid +
							'.system.inputs.' +
							att.system.input_list[i].id +
							'.distribution_enable',
						{ val: att.system.input_list[i].distribution_enable, ack: true }
					);
					await this.setStateAsync(
						devtype + '_' + devuid + '.system.inputs.' + att.system.input_list[i].id + '.account_enable',
						{ val: att.system.input_list[i].account_enable, ack: true }
					);
					await this.setStateAsync(
						devtype + '_' + devuid + '.system.inputs.' + att.system.input_list[i].id + '.play_info_type',
						{ val: att.system.input_list[i].play_info_type, ack: true }
					);
				}
			} else {
				this.log.debug('failure getting status info from  ' + devip + ' : ' + this.responseFailLog(result));
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH') || err.message.includes('connect ETIMEDOUT')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicZoneLists] error: ${err.message}, stack: ${err.stack}`);
			}
		}
	}
	async getMusicNetusbInfo(ip, type, uid) {
		const devip = ip;
		const devtype = type;
		const devuid = uid;
		yamaha = new YamahaYXC(ip);
		try {
			const result = await yamaha.getPlayInfo();
			const att = result;
			if (att.response_code === 0) {
				let albumurl = att.albumart_url;
				if (albumurl.substr(0, 20) === '/YamahaRemoteControl') {
					albumurl = 'http://' + devip + att.albumart_url;
				}
				this.log.debug('got Netusb playinfo succesfully from ' + devip + 'with  ' + JSON.stringify(result));

				const resp = { device: devtype + '_' + devuid, request: '/netusb/getPlayInfo', responses: att };
				if (!responses.find((o) => o.device === devtype + '_' + devuid && o.request === '/netusb/getPlayInfo'))
					responses.push(resp);
				await this.setStateAsync(devtype + '_' + devuid + '.netusb.getPlayInfo', {
					val: JSON.stringify(att),
					ack: true
				});

				for (const key in att) {
					if (key == 'albumart_url') {
						let albumurl = att.albumart_url;
						if (albumurl.substr(0, 20) === '/YamahaRemoteControl') {
							albumurl = 'http://' + devip + att.albumart_url;
						}
						this.log.debug('albumart ' + albumurl);
						await this.setStateAsync(devtype + '_' + devuid + '.netusb' + '.' + key, {
							val: albumurl,
							ack: true
						});
					} else if (key == 'repeat') {
						await this.setStateAsync(devtype + '_' + devuid + '.netusb.repeat_stat', {
							val: att[key],
							ack: true
						});
					} else if (key == 'shuffle') {
						await this.setStateAsync(devtype + '_' + devuid + '.netusb.shuffle_stat', {
							val: att[key],
							ack: true
						});
					} else if (key == 'response_code') {
						// prevent writing on non existing object
					} else if (key == 'albumart_id') {
						// prevent writing on non existing object
					} else {
						await this.setStateAsync(devtype + '_' + devuid + '.netusb' + '.' + key, {
							val: att[key],
							ack: true
						});
					}
				}
			} else {
				this.log.debug('failure getting Netusb playinfo from  ' + devip + ' : ' + this.responseFailLog(result));
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicNetusbInfo] error: ${err.message}, stack: ${err.stack}`);
			}
		}
	}

	async getMusicNetusbRecent(ip, type, uid) {
		const devip = ip;
		const devtype = type;
		const devuid = uid;
		yamaha = new YamahaYXC(ip);
		try {
			const result = await yamaha.getRecentInfo();
			const att = result;
			if (att.response_code === 0) {
				this.log.debug('got Netusb recent info succesfully from ' + devip + 'with  ' + JSON.stringify(result));
				const resp = { device: devtype + '_' + devuid, request: '/netusb/getRecentInfo', responses: att };
				if (
					!responses.find((o) => o.device === devtype + '_' + devuid && o.request === '/netusb/getRecentInfo')
				)
					responses.push(resp);
				await this.setStateAsync(devtype + '_' + devuid + '.netusb.recent_info', {
					val: JSON.stringify(att.recent_info),
					ack: true
				});
			} else {
				this.log.debug(
					'failure getting Netusb recent info from  ' + devip + ' : ' + this.responseFailLog(result)
				);
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicNetusbRecent] error: ${err.message}, stack: ${err.stack}`);
			}
		}
	}

	async getMusicNetusbPreset(ip, type, uid) {
		const devip = ip;
		const devtype = type;
		const devuid = uid;
		yamaha = new YamahaYXC(ip);
		try {
			const result = await yamaha.getPresetInfo();
			const att = result;
			if (att.response_code === 0) {
				this.log.debug('got Netusb preset info succesfully from ' + devip + 'with  ' + JSON.stringify(result));
				const resp = { device: devtype + '_' + devuid, request: '/netusb/getPresetInfo', responses: att };
				if (
					!responses.find((o) => o.device === devtype + '_' + devuid && o.request === '/netusb/getPresetInfo')
				)
					responses.push(resp);
				await this.setStateAsync(devtype + '_' + devuid + '.netusb.preset_info', {
					val: JSON.stringify(att.preset_info),
					ack: true
				});
			} else {
				this.log.debug(
					'failure getting Netusb preset info from  ' + devip + ' : ' + this.responseFailLog(result)
				);
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicNetusbPreset] error: ${err.message}, stack: ${err.stack}`);
			}
		}
	}
	async getMusicCdInfo(ip, type, uid) {
		const devip = ip;
		const devtype = type;
		const devuid = uid;
		yamaha = new YamahaYXC(ip);
		try {
			const result = await yamaha.getPlayInfo('cd');
			const att = result;
			if (att.response_code === 0) {
				this.log.debug('got CD playinfo succesfully from ' + devip + 'with  ' + JSON.stringify(result));

				const resp = { device: devtype + '_' + devuid, request: '/cd/getPlayInfo', responses: att };
				if (!responses.find((o) => o.device === devtype + '_' + devuid && o.request === '/cd/getPlayInfo'))
					responses.push(resp);

				await this.setStateAsync(devtype + '_' + devuid + '.cd.getPlayInfo', {
					val: JSON.stringify(att),
					ack: true
				});
				for (const key in att) {
					if (key == 'repeat') {
						await this.setStateAsync(devtype + '_' + devuid + '.cd.repeat_stat', {
							val: att[key],
							ack: true
						});
					} else if (key == 'shuffle') {
						await this.setStateAsync(devtype + '_' + devuid + '.cd.shuffle_stat', {
							val: att[key],
							ack: true
						});
					} else
						await this.setStateAsync(devtype + '_' + devuid + '.cd' + '.' + key, {
							val: att[key],
							ack: true
						});
				}
				/*
				await this.setStateAsync(devtype + '_' + devuid + '.cd.device_status', {val: att.device_status, ack: true});
				await this.setStateAsync(devtype + '_' + devuid + '.cd.playback', {val: att.playback, ack: true});
				await this.setStateAsync(devtype + '_' + devuid + '.cd.repeat_stat', {val: att.repeat, ack: true});
				await this.setStateAsync(devtype + '_' + devuid + '.cd.shuffle_stat', {val: att.shuffle, ack: true});
				await this.setStateAsync(devtype + '_' + devuid + '.cd.playtime', {val: att.play_time, ack: true});
				await this.setStateAsync(devtype + '_' + devuid + '.cd.totaltime', {val: att.total_time, ack: true});
				await this.setStateAsync(devtype + '_' + devuid + '.cd.disctime', {val: att.disc_time, ack: true});
				await this.setStateAsync(devtype + '_' + devuid + '.cd.tracknumber', {val: att.track_number, ack: true});
				await this.setStateAsync(devtype + '_' + devuid + '.cd.totaltracks', {val: att.total_tracks, ack: true});
				await this.setStateAsync(devtype + '_' + devuid + '.cd.artist', {val: att.artist, ack: true});
				await this.setStateAsync(devtype + '_' + devuid + '.cd.album', {val: att.album, ack: true});
				await this.setStateAsync(devtype + '_' + devuid + '.cd.track', {val: att.track, ack: true});
				*/
			} else {
				this.log.debug('failure getting CD playinfo from  ' + devip + ' : ' + this.responseFailLog(result));
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicCdInfo] error: ${err.message}, stack: ${err.stack}`);
			}
		}
	}
	async getMusicTunerInfo(ip, type, uid) {
		const devip = ip;
		const devtype = type;
		const devuid = uid;
		yamaha = new YamahaYXC(ip);
		try {
			const result = await yamaha.getTunerPlayInfo();
			const att = result;
			if (att.response_code === 0) {
				this.log.debug('got Tuner playinfo succesfully from ' + devip + 'with  ' + JSON.stringify(result));

				const resp = { device: devtype + '_' + devuid, request: '/tuner/getPlayInfo', responses: att };
				if (!responses.find((o) => o.device === devtype + '_' + devuid && o.request === '/tuner/getPlayInfo'))
					responses.push(resp);
				await this.setStateAsync(devtype + '_' + devuid + '.tuner.getPlayInfo', {
					val: JSON.stringify(att),
					ack: true
				});

				await this.setStateAsync(devtype + '_' + devuid + '.tuner.band', {
					val: att.band,
					ack: true
				});
				if (att.band == 'am') {
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.am.preset', {
						val: att.am.preset,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.am.freq', {
						val: att.am.freq,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.am.tuned', {
						val: att.am.tuned,
						ack: true
					});
				}
				if (att.band == 'fm') {
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.fm.preset', {
						val: att.fm.preset,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.fm.freq', {
						val: att.fm.freq,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.fm.tuned', {
						val: att.fm.tuned,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.fm.audio_mode', {
						val: att.fm.audio_mode,
						ack: true
					});
				}
				if (att.band == 'dab') {
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.preset', {
						val: att.dab.preset,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.id', {
						val: att.dab.id,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.status', {
						val: att.dab.status,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.freq', {
						val: att.dab.freq,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.category', {
						val: att.dab.category,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.audio_mode', {
						val: att.dab.audio_mode,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.bit_rate', {
						val: att.dab.bit_rate,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.quality', {
						val: att.dab.quality,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.tune_aid', {
						val: att.dab.tune_aid,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.off_air', {
						val: att.dab.off_air,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.dab_plus', {
						val: att.dab.dab_plus,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.program_type', {
						val: att.dab.program_type,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.ch_label', {
						val: att.dab.ch_label,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.service_label', {
						val: att.dab.service_label,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.dls', {
						val: att.dab.dls,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.ensemble_label', {
						val: att.dab.ensemble_label,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.initial_scan_progress', {
						val: att.dab.initial_scan_progress,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.total_station_num', {
						val: att.dab.total_station_num,
						ack: true
					});
				}
				if (att.band == 'rds') {
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.rds.program_type', {
						val: att.rds.program_type,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.rds.program_service', {
						val: att.rds.program_service,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.rds.radio_text_a', {
						val: att.rds.radio_text_a,
						ack: true
					});
					await this.setStateAsync(devtype + '_' + devuid + '.tuner.rds.radio_text_b', {
						val: att.rds.radio_text_b,
						ack: true
					});
				}
			} else {
				this.log.debug('failure getting Tuner playinfo from  ' + devip + ' : ' + this.responseFailLog(result));
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicTunerInfo] error: ${err.message}, stack: ${err.stack}`);
			}
		}
	}
	async getMusicTunerPreset(ip, type, uid) {
		const devip = ip;
		const devtype = type;
		const devuid = uid;
		yamaha = new YamahaYXC(ip);
		try {
			const result = yamaha.getTunerPresetInfo('common');

			const att = result;
			if (att.response_code === 0) {
				this.log.debug(
					'got Common Tuner preset info succesfully from ' + devip + 'with  ' + JSON.stringify(result)
				);

				const resp = {
					device: devtype + '_' + devuid,
					request: '/tuner/getPresetInfo?band=common',
					responses: att
				};
				if (
					!responses.find(
						(o) => o.device === devtype + '_' + devuid && o.request === '/tuner/getPresetInfo?band=common'
					)
				)
					responses.push(resp);

				await this.setStateAsync(devtype + '_' + devuid + '.tuner.common_preset_info', {
					val: JSON.stringify(att.preset_info),
					ack: true
				});
				//await this.setStateAsync(devtype + '_' + devuid + '.tuner.preset_info', {val: JSON.stringify(att.preset_info), ack: true});
			} else {
				this.log.debug(
					'failure getting Common Tuner preset info from  ' + devip + ' : ' + this.responseFailLog(result)
				);
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicTunerPreset] error: ${err.message}, stack: ${err.stack}`);
			}
		}
		//if (FM)
		try {
			const result1 = await yamaha.getTunerPresetInfo('fm');

			const att = result1;
			if (att.response_code === 0) {
				this.log.debug(
					'got FM Tuner preset info succesfully from ' + devip + 'with  ' + JSON.stringify(result1)
				);
				const resp = {
					device: devtype + '_' + devuid,
					request: '/tuner/getPresetInfo?band=fm',
					responses: att
				};
				if (
					!responses.find(
						(o) => o.device === devtype + '_' + devuid && o.request === '/tuner/getPresetInfo?band=fm'
					)
				)
					responses.push(resp);
				await this.setStateAsync(devtype + '_' + devuid + '.tuner.fm.preset_info', {
					val: JSON.stringify(att.preset_info),
					ack: true
				});
				//await this.setStateAsync(devtype + '_' + devuid + '.tuner.preset_info', {val: JSON.stringify(att.preset_info), ack: true});
			} else {
				this.log.debug(
					'failure getting FM Tuner preset info from  ' + devip + ' : ' + this.responseFailLog(result1)
				);
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicTunerPreset error: ${err.message}, stack: ${err.stack}`);
			}
		}
		//if (AM)
		try {
			const result2 = await yamaha.getTunerPresetInfo('am');
			const att = result2;
			if (att.response_code === 0) {
				this.log.debug(
					'got AM Tuner preset info succesfully from ' + devip + 'with  ' + JSON.stringify(result2)
				);
				const resp = {
					device: devtype + '_' + devuid,
					request: '/tuner/getPresetInfo?band=am',
					responses: att
				};
				if (
					!responses.find(
						(o) => o.device === devtype + '_' + devuid && o.request === '/tuner/getPresetInfo?band=am'
					)
				)
					responses.push(resp);
				await this.setStateAsync(devtype + '_' + devuid + '.tuner.am.preset_info', {
					val: JSON.stringify(att.preset_info),
					ack: true
				});
				//await this.setStateAsync(devtype + '_' + devuid + '.tuner.preset_info', {val: JSON.stringify(att.preset_info), ack: true});
			} else {
				this.log.debug(
					'failure getting AM Tuner preset info from  ' + devip + ' : ' + this.responseFailLog(result2)
				);
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicTunerPreset error: ${err.message}, stack: ${err.stack}`);
			}
		}
		//if (DAB)
		try {
			const result3 = await yamaha.getTunerPresetInfo('dab');
			const att = result3;
			if (att.response_code === 0) {
				this.log.debug(
					'got DAB Tuner preset info succesfully from ' + devip + 'with  ' + JSON.stringify(result3)
				);
				const resp = {
					device: devtype + '_' + devuid,
					request: '/tuner/getPresetInfo?band=dab',
					responses: att
				};
				if (
					!responses.find(
						(o) => o.device === devtype + '_' + devuid && o.request === '/tuner/getPresetInfo?band=dab'
					)
				)
					responses.push(resp);
				await this.setStateAsync(devtype + '_' + devuid + '.tuner.dab.preset_info', {
					val: JSON.stringify(att.preset_info),
					ack: true
				});
				//await this.setStateAsync(devtype + '_' + devuid + '.tuner.preset_info', {val: JSON.stringify(att.preset_info), ack: true});
			} else {
				this.log.debug(
					'failure getting DAB Tuner preset info from  ' + devip + ' : ' + this.responseFailLog(result3)
				);
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicTunerPreset error: ${err.message}, stack: ${err.stack}`);
			}
		}
	}
	async getMusicClockSettings(ip, type, uid) {
		const devip = ip;
		const devtype = type;
		const devuid = uid;
		yamaha = new YamahaYXC(ip);
		try {
			const result = await yamaha.getClockSettings();

			const att = result;
			if (att.response_code === 0) {
				this.log.debug('got Clock settings succesfully from ' + devip + 'with  ' + JSON.stringify(result));

				const resp = { device: devtype + '_' + devuid, request: '/clock/getSettings', responses: att };
				if (!responses.find((o) => o.device === devtype + '_' + devuid && o.request === '/clock/getSettings'))
					responses.push(resp);
				await this.setStateAsync(devtype + '_' + devuid + '.clock.getSettings', {
					val: att,
					ack: true
				});
				/*
				for (var key in att){
					hier muss noch die . von der Rückmeldung und die _ in objekte ausgetauscht werden
					await this.setStateAsync(devtype + '_' + devuid + '.clock' + '.'+ key, {val: att[key], ack: true});
				}
				*/
				await this.setStateAsync(devtype + '_' + devuid + '.clock.auto_sync', {
					val: att.auto_sync,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.format', {
					val: att.format,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.alarm_on', {
					val: att.alarm_on,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.volume', {
					val: att.volume,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.fade_interval', {
					val: att.fade_interval,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.fade_type', {
					val: att.fade_type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.mode', {
					val: att.mode,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.repeat', {
					val: att.repeat,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.oneday.enable', {
					val: att.oneday.enable,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.oneday.time', {
					val: att.oneday.time,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.oneday.beep', {
					val: att.oneday.beep,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.oneday.playback_type', {
					val: att.oneday.playback_type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.oneday.resume_input', {
					val: att.oneday.resume.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.oneday.preset_type', {
					val: att.oneday.preset.type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.oneday.preset_num', {
					val: att.oneday.preset.num,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.oneday.preset_netusb_input', {
					val: att.oneday.preset.netusb_info.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.oneday.preset_netusb_text', {
					val: att.oneday.preset.netusb_info.text,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.oneday.preset_tuner_band', {
					val: att.oneday.preset.tuner_info.band,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.oneday.preset_tuner_number', {
					val: att.oneday.preset.tuner_info.number,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.sunday.enable', {
					val: att.sunday.enable,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.sunday.time', {
					val: att.sunday.time,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.sunday.beep', {
					val: att.sunday.beep,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.sunday.playback_type', {
					val: att.sunday.playback_type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.sunday.resume_input', {
					val: att.sunday.resume.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.sunday.preset_type', {
					val: att.sunday.preset.type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.sunday.preset_num', {
					val: att.sunday.preset.num,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.sunday.preset_netusb_input', {
					val: att.sunday.preset.netusb_info.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.sunday.preset_netusb_text', {
					val: att.sunday.preset.netusb_info.text,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.sunday.preset_tuner_band', {
					val: att.sunday.preset.tuner_info.band,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.sunday.preset_tuner_number', {
					val: att.sunday.preset.tuner_info.number,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.monday.enable', {
					val: att.monday.enable,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.monday.time', {
					val: att.monday.time,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.monday.beep', {
					val: att.monday.beep,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.monday.playback_type', {
					val: att.monday.playback_type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.monday.resume_input', {
					val: att.monday.resume.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.monday.preset_type', {
					val: att.monday.preset.type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.monday.preset_num', {
					val: att.monday.preset.num,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.monday.preset_netusb_input', {
					val: att.monday.preset.netusb_info.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.monday.preset_netusb_text', {
					val: att.monday.preset.netusb_info.text,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.monday.preset_tuner_band', {
					val: att.monday.preset.tuner_info.band,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.monday.preset_tuner_number', {
					val: att.monday.preset.tuner_info.number,
					ack: true
				});

				await this.setStateAsync(devtype + '_' + devuid + '.clock.tuesday.enable', {
					val: att.tuesday.enable,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.tuesday.time', {
					val: att.tuesday.time,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.tuesday.beep', {
					val: att.tuesday.beep,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.tuesday.playback_type', {
					val: att.tuesday.playback_type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.tuesday.resume_input', {
					val: att.tuesday.resume.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.tuesday.preset_type', {
					val: att.tuesday.preset.type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.tuesday.preset_num', {
					val: att.tuesday.preset.num,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.tuesday.preset_netusb_input', {
					val: att.tuesday.preset.netusb_info.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.tuesday.preset_netusb_text', {
					val: att.tuesday.preset.netusb_info.text,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.tuesday.preset_tuner_band', {
					val: att.tuesday.preset.tuner_info.band,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.tuesday.preset_tuner_number', {
					val: att.tuesday.preset.tuner_info.number,
					ack: true
				});

				await this.setStateAsync(devtype + '_' + devuid + '.clock.wednesday.enable', {
					val: att.wednesday.enable,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.wednesday.time', {
					val: att.wednesday.time,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.wednesday.beep', {
					val: att.wednesday.beep,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.wednesday.playback_type', {
					val: att.wednesday.playback_type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.wednesday.resume_input', {
					val: att.wednesday.resume.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.wednesday.preset_type', {
					val: att.wednesday.preset.type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.wednesday.preset_num', {
					val: att.wednesday.preset.num,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.wednesday.preset_netusb_input', {
					val: att.wednesday.preset.netusb_info.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.wednesday.preset_netusb_text', {
					val: att.wednesday.preset.netusb_info.text,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.wednesday.preset_tuner_band', {
					val: att.wednesday.preset.tuner_info.band,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.wednesday.preset_tuner_number', {
					val: att.wednesday.preset.tuner_info.number,
					ack: true
				});

				await this.setStateAsync(devtype + '_' + devuid + '.clock.thursday.enable', {
					val: att.thursday.enable,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.thursday.time', {
					val: att.thursday.time,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.thursday.beep', {
					val: att.thursday.beep,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.thursday.playback_type', {
					val: att.thursday.playback_type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.thursday.resume_input', {
					val: att.thursday.resume.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.thursday.preset_type', {
					val: att.thursday.preset.type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.thursday.preset_num', {
					val: att.thursday.preset.num,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.thursday.preset_netusb_input', {
					val: att.thursday.preset.netusb_info.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.thursday.preset_netusb_text', {
					val: att.thursday.preset.netusb_info.text,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.thursday.preset_tuner_band', {
					val: att.thursday.preset.tuner_info.band,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.thursday.preset_tuner_number', {
					val: att.thursday.preset.tuner_info.number,
					ack: true
				});

				await this.setStateAsync(devtype + '_' + devuid + '.clock.friday.enable', {
					val: att.friday.enable,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.friday.time', {
					val: att.friday.time,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.friday.beep', {
					val: att.friday.beep,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.friday.playback_type', {
					val: att.friday.playback_type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.friday.resume_input', {
					val: att.friday.resume.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.friday.preset_type', {
					val: att.friday.preset.type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.friday.preset_num', {
					val: att.friday.preset.num,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.friday.preset_netusb_input', {
					val: att.friday.preset.netusb_info.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.friday.preset_netusb_text', {
					val: att.friday.preset.netusb_info.text,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.friday.preset_tuner_band', {
					val: att.friday.preset.tuner_info.band,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.friday.preset_tuner_number', {
					val: att.friday.preset.tuner_info.number,
					ack: true
				});

				await this.setStateAsync(devtype + '_' + devuid + '.clock.saturday.enable', {
					val: att.saturday.enable,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.saturday.time', {
					val: att.saturday.time,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.saturday.beep', {
					val: att.saturday.beep,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.saturday.playback_type', {
					val: att.saturday.playback_type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.saturday.resume_input', {
					val: att.saturday.resume.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.saturday.preset_type', {
					val: att.saturday.preset.type,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.saturday.preset_num', {
					val: att.saturday.preset.num,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.saturday.preset_netusb_input', {
					val: att.saturday.preset.netusb_info.input,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.saturday.preset_netusb_text', {
					val: att.saturday.preset.netusb_info.text,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.saturday.preset_tuner_band', {
					val: att.saturday.preset.tuner_info.band,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.clock.saturday.preset_tuner_number', {
					val: att.saturday.preset.tuner_info.number,
					ack: true
				});
			} else {
				this.log.debug('failure getting Clock settings from  ' + devip + ' : ' + this.responseFailLog(result));
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicClockSettings] error: ${err.message}, stack: ${err.stack}`);
			}
		}
	}
	async getMusicDistInfo(ip, type, uid) {
		const devip = ip;
		const devtype = type;
		const devuid = uid;
		yamaha = new YamahaYXC(ip);
		try {
			const result = await yamaha.getDistributionInfo();
			const att = result;
			if (att.response_code === 0) {
				this.log.debug('got Distribution info succesfully from ' + devip + 'with  ' + JSON.stringify(result));
				await this.setStateAsync(devtype + '_' + devuid + '.main.group_id', {
					val: att.group_id,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.main.group_name', {
					val: att.group_name,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.main.role', {
					val: att.role,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.main.server_zone', {
					val: att.server_zone,
					ack: true
				});
				await this.setStateAsync(devtype + '_' + devuid + '.main.client_list', {
					val: att.client_list,
					ack: true
				}); //array ip_address and data_type
				/*
				if (att.group_name === "00000000000000000000000000000000")
					{
						await this.setStateAsync(devtype + '_' + devuid + '.main.distr_state', {val: false, ack: true});
					}
				*/
			} else {
				this.log.debug(
					'failure getting Distibution info from  ' + devip + ' : ' + this.responseFailLog(result)
				);
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[getMusicDistInfo] error: ${err.message}, stack: ${err.stack}`);
			}
		}
	}
	// init of device
	async defineMusicDeviceFeatures(ip, type, uid) {
		const devip = ip;
		const devtype = type;
		const devuid = uid;
		yamaha = new YamahaYXC(ip);
		try {
			const result = await yamaha.getFeatures();

			const att = result;
			if (att.response_code === 0) {
				this.log.debug('got features succesfully from ' + devip);
				this.log.debug('number of zones ' + att.system.zone_num);

				const resp = { device: devtype + '_' + devuid, request: '/system/getFeatures', responses: att };
				if (!responses.find((o) => o.device === devtype + '_' + devuid && o.request === '/system/getFeatures'))
					responses.push(resp);
				await this.setStateAsync(devtype + '_' + devuid + '.system.getFeatures', {
					val: JSON.stringify(att),
					ack: true
				});

				for (let i = 0; i < att.zone.length; i++) {
					this.log.debug(' zone setup loop # ' + i + ' name ' + JSON.stringify(att.zone[i]));

					const zone_name = att.zone[i].id;
					await this.defineMusicZoneNew(devtype, devuid, zone_name, att.zone[i]);
					// Zone input list
					await this.defineMusicInputs(devtype, devuid, zone_name, att.zone[i].input_list);
					// Zone link control
					if (att.zone[i].func_list.indexOf('link_control') !== -1) {
						await this.defineMusicLinkCtrl(devtype, devuid, zone_name, att.zone[i].link_control_list);
					}
					// Zone link audio delay
					if (att.zone[i].func_list.indexOf('link_audio_delay') !== -1) {
						await this.defineMusicLinkAudioDelay(
							devtype,
							devuid,
							zone_name,
							att.zone[i].func_list,
							att.zone[i].link_audio_delay_list
						);
					}
					// Zone link audio quality
					if (att.zone[i].func_list.indexOf('link_audio_quality') !== -1) {
						await this.defineMusicLinkAudioQuality(
							devtype,
							devuid,
							zone_name,
							att.zone[i].func_list,
							att.zone[i].link_audio_quality_list
						);
					}
					// Zone Sound program
					if (att.zone[i].func_list.indexOf('sound_program') !== -1) {
						await this.defineMusicSoundProg(
							devtype,
							devuid,
							zone_name,
							att.zone[i].func_list,
							att.zone[i].sound_program_list
						);
					}
					// Zone Surround_decoder_type
					if (att.zone[i].func_list.indexOf('surr_decoder_type') !== -1) {
						await this.defineMusicSurroundDec(
							devtype,
							devuid,
							zone_name,
							att.zone[i].func_list,
							att.zone[i].surr_decoder_type_list
						);
					}
					// Zone Audio Select
					if (att.zone[i].func_list.indexOf('audio_select') !== -1) {
						await this.defineMusicAudioSelect(
							devtype,
							devuid,
							zone_name,
							att.zone[i].func_list,
							att.zone[i].audio_select_list
						);
					}
					// Zone Actual Volume
					if (att.zone[i].func_list.indexOf('actual_volume') !== -1) {
						await this.defineMusicActualVolume(
							devtype,
							devuid,
							zone_name,
							att.zone[i].func_list,
							att.zone[i].actual_volume_mode_list,
							att.zone[i].range_step
						);
					}
					// Zone Party Mode
					if (att.system.func_list.indexOf('party_mode') !== -1) {
						//hier globale func_list, aber object in jeder Zone
						await this.defineMusicPartyMode(devtype, devuid, zone_name);
					}
				}
				// input services and their attributes
				await this.defineMusicSystemInputs(devtype, devuid, att.system.input_list);

				//CD player objects
				if (att.zone[0].input_list.indexOf('cd') !== -1) {
					await this.defineMusicCD(devtype, devuid);
				}
				//Tuner objects
				if (att.tuner) {
					await this.defineMusicTuner(
						devtype,
						devuid,
						att.tuner.func_list,
						att.tuner.range_step,
						att.tuner.preset
					);
				}
				//Clock objects
				if (att.clock) {
					await this.defineMusicClock(
						devtype,
						devuid,
						att.clock.func_list,
						att.clock.range_step,
						att.clock.alarm_fade_type_num,
						att.clock.alarm_mode_list,
						att.clock.alarm_input_list,
						att.clock.alarm_preset_list
					);
				}
			} else {
				this.log.debug('failure getting features from  ' + devip + ' : ' + this.responseFailLog(result));
			}
		} catch (err) {
			if (err.message.includes('connect EHOSTUNREACH')) {
				this.log.warn(err.message.replace('connect EHOSTUNREACH', '') + ' not reachable!');
			} else {
				this.log.error(`[defineMusicDeviceFeatures] error: ${err.message}, stack: ${err.stack}`);
			}
		}
	}
	//UDP update
	async gotUpdate(msg, devIp) {
		try {
			const dev = await this.getConfigObjects(this.config.devices, 'ip', devIp);
			this.log.debug('processing update from: ' + dev + ' with ' + JSON.stringify(msg));
			if (msg.netusb) {
				if (msg.netusb.play_time && this.config.netusbplaytime) {
					await this.setStateAsync(dev[0].type + '_' + dev[0].uid + '.netusb.play_time', {
						val: msg.netusb.play_time,
						ack: true
					});
				}
				if (msg.netusb.play_info_updated) {
					await this.getMusicNetusbInfo(devIp, dev[0].type, dev[0].uid);
				}
				if (msg.netusb.recent_info_updated) {
					await this.getMusicNetusbRecent(devIp, dev[0].type, dev[0].uid);
				}
				if (msg.netusb.preset_info_updated) {
					await this.getMusicNetusbPreset(devIp, dev[0].type, dev[0].uid);
				}
				//if play_error todo

				if (msg.netusb.preset_control) {
					if (msg.netusb.preset_control.result === 'success') {
						await this.setStateAsync(dev[0].type + '_' + dev[0].uid + '.netusb.presetrecallnumber', {
							val: msg.netusb.preset_control.num,
							ack: true
						});
					}
				}
			}
			if (msg.main) {
				//if signal_info_updated /main/getSignalInfo
				//if status_updated /main/getStatus
				await this.getMusicZoneInfo(devIp, dev[0].type, dev[0].uid, 'main');
			}
			if (msg.zone2) {
				//if signal_info_updated /main/getSignalInfo
				//if status_updated /main/getStatus
				await this.getMusicZoneInfo(devIp, dev[0].type, dev[0].uid, 'zone2');
			}
			if (msg.zone3) {
				//if signal_info_updated /main/getSignalInfo
				//if status_updated /main/getStatus
				await this.getMusicZoneInfo(devIp, dev[0].type, dev[0].uid, 'zone3');
			}
			if (msg.zone4) {
				//if signal_info_updated /main/getSignalInfo
				//if status_updated /main/getStatus
				await this.getMusicZoneInfo(devIp, dev[0].type, dev[0].uid, 'zone4');
			}
			if (msg.system) {
				//if func_status_updated
				//if bluetooth_status_updated
				//if name_text_updated
				//if location_info_updated
			}
			if (msg.cd) {
				//if device_status
				if (msg.cd.play_time && this.config.cdplaytime) {
					await this.setStateAsync(dev[0].type + '_' + dev[0].uid + '.cd.play_time', {
						val: msg.cd.play_time,
						ack: true
					});
				}
				if (msg.cd.play_info_updated) {
					await this.getMusicCdInfo(devIp, dev[0].type, dev[0].uid);
				}
			}
			if (msg.tuner) {
				//if play_info_updated
				if (msg.tuner.play_info_updated) {
					await this.getMusicTunerInfo(devIp, dev[0].type, dev[0].uid);
				}
				//if preset_info_updated
				if (msg.tuner.preset_info_updated) {
					await this.getMusicTunerPreset(devIp, dev[0].type, dev[0].uid);
				}
				//if name_text_updated
				//if location_info_updated
			}
			if (msg.dist) {
				//  /dist/getDistributionInfo
				await this.getMusicDistInfo(devIp, dev[0].type, dev[0].uid);
			}
			if (msg.clock) {
				// /clock/getSettings
				await this.getMusicClockSettings(devIp, dev[0].type, dev[0].uid);
			}
		} catch (err) {
			this.log.error(`[gotUpdate] error: ${err.message}, stack: ${err.stack}`);
		}
	}
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Musiccast(options);
} else {
	// otherwise start the instance directly
	new Musiccast();
}
