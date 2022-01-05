const path = require('path');
const { tests } = require('@iobroker/testing');

const server = require('../lib/musiccast/yxc_mockserver.js');

const expect = require('chai').expect;

function delay(t, val) {
	return new Promise(function(resolve) {
		setTimeout(function() {
			resolve(val);
		}, t);
	});
}

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, '..'), {
	// This should be the adapter's root directory

	// If the adapter may call process.exit during startup, define here which exit codes are allowed.
	// By default, termination during startup is not allowed.
	allowedExitCodes: [ 11 ],

	// Define your own tests inside defineAdditionalTests
	// Since the tests are heavily instrumented, you need to create and use a so called "harness" to control the tests.
	defineAdditionalTests(getHarness) {
		describe('Test creation of devices', () => {
			before('start the emulation', () => {
				server.setupHttpServer(function() {});
			});
			it('YSP1600 should be created', () => {
				return new Promise((resolve) => {
					// Create a fresh harness instance each test!
					const harness = getHarness();
					// modification of some starting values

					//schon Teil des iobroker/testing :-)
					//config.common.enabled = true;
					//config.common.loglevel = 'debug';
					// systemConfig.native.secret ='Zgfr56gFe87jJOM'

					//await delay (15000);

					//man könnte auch je device ein json array der datenpunkte und der erwarteten Werte anlegen und dann eine loop

					//this refers to https://github.com/ioBroker/testing/issues/218
					harness._objects.getObject('system.adapter.musiccast.0', async (err, obj) => {
						obj.native.devices = [
							{
								ip: 'localhost:3311',
								type: 'YSP-1600',
								uid: '00112233',
								sid: '00A0FED15025',
								name: 'TestGerät'
							}
						];
						await harness._objects.setObjectAsync(obj._id, obj);

						// Start the adapter and wait until it has started
						await harness.startAdapterAndWait();
						await delay(5000);

						harness.states.getState('musiccast.0.YSP-1600_00112233.system.device_id', function(err, state) {
							if (err) console.error(err);
							expect(state).to.exist;
							if (!state) {
								console.error('state "musiccast.0.YSP-1600_00112233.system.device_id" not set');
							} else {
								console.log('musiccast.0.YSP-1600_00112233.system.device_id      ... ' + state.val);
							}
							expect(state.val).to.exist;
							expect(state.val).to.be.equal('00A0DED15025');
							harness.states.getState('musiccast.0.YSP-1600_00112233.main.volume', function(err, state) {
								if (err) console.error(err);
								expect(state).to.exist;
								if (!state) {
									console.error('state "musiccast.0.YSP-1600_00112233.main.volume" not set');
								} else {
									console.log('musiccast.0.YSP-1600_00112233.main.volume  ... ' + state.val);
								}
								expect(state.val).to.exist;
								expect(state.val).to.be.equal(67);
								harness.states.getState('musiccast.0.YSP-1600_00112233.main.input', function(
									err,
									state
								) {
									if (err) console.error(err);
									expect(state).to.exist;
									if (!state) {
										console.error('state "musiccast.0.YSP-1600_00112233.main.input" not set');
									} else {
										console.log('musiccast.0.YSP-1600_00112233.main.input    ... ' + state.val);
									}
									expect(state.val).to.exist;
									expect(state.val).to.be.equal('hdmi');
									harness.states.getState(
										'musiccast.0.YSP-1600_00112233.main.sound_program',
										function(err, state) {
											if (err) console.error(err);
											expect(state).to.exist;
											if (!state) {
												console.error(
													'state "musiccast.0.YSP-1600_00112233.main.sound_program" not set'
												);
											} else {
												console.log(
													'musiccast.0.YSP-1600_00112233.main.sound_program           ... ' +
														state.val
												);
											}
											expect(state.val).to.exist;
											expect(state.val).to.be.equal('movie');
											harness.states.getState(
												'musiccast.0.YSP-1600_00112233.main.clear_voice',
												function(err, state) {
													if (err) console.error(err);
													expect(state).to.exist;
													if (!state) {
														console.error(
															'state "musiccast.0.YSP-1600_00112233.main.clear_voice" not set'
														);
													} else {
														console.log(
															'musiccast.0.YSP-1600_00112233.main.clear_voice          ... ' +
																state.val
														);
													}
													expect(state.val).to.exist;
													expect(state.val).to.be.equal(true);
													harness.states.getState(
														'musiccast.0.YSP-1600_00112233.main.power',
														function(err, state) {
															if (err) console.error(err);
															expect(state).to.exist;
															if (!state) {
																console.error(
																	'state "musiccast.0.YSP-1600_00112233.main.power" not set'
																);
															} else {
																console.log(
																	'musiccast.0.YSP-1600_00112233.main.power        ... ' +
																		state.val
																);
															}
															expect(state.val).to.exist;
															expect(state.val).to.be.equal(true);
															harness.states.getState(
																'musiccast.0.YSP-1600_00112233.main.mute',
																function(err, state) {
																	if (err) console.error(err);
																	expect(state).to.exist;
																	if (!state) {
																		console.error(
																			'state "musiccast.0.YSP-1600_00112233.main.mute" not set'
																		);
																	} else {
																		console.log(
																			'musiccast.0.YSP-1600_00112233.main.mute         ... ' +
																				state.val
																		);
																	}
																	expect(state.val).to.exist;
																	expect(state.val).to.be.equal(false);
																	harness.states.getState(
																		'musiccast.0.YSP-1600_00112233.netusb.input',
																		function(err, state) {
																			if (err) console.error(err);
																			expect(state).to.exist;
																			if (!state) {
																				console.error(
																					'state "musiccast.0.YSP-1600_00112233.netusb.input" not set'
																				);
																			} else {
																				console.log(
																					'musiccast.0.YSP-1600_00112233.netusb.input      ... ' +
																						state.val
																				);
																			}
																			expect(state.val).to.exist;
																			expect(state.val).to.be.equal('server');
																			harness.states.getState(
																				'musiccast.0.YSP-1600_00112233.netusb.playback',
																				function(err, state) {
																					if (err) console.error(err);
																					expect(state).to.exist;
																					if (!state) {
																						console.error(
																							'state "musiccast.0.YSP-1600_00112233.netusb.playback" not set'
																						);
																					} else {
																						console.log(
																							'musiccast.0.YSP-1600_00112233.netusb.playback        ... ' +
																								state.val
																						);
																					}
																					expect(state.val).to.exist;
																					expect(state.val).to.be.equal(
																						'stop'
																					);
																					harness.states.getState(
																						'musiccast.0.YSP-1600_00112233.netusb.play_time',
																						function(err, state) {
																							if (err) console.error(err);
																							expect(state).to.exist;
																							if (!state) {
																								console.error(
																									'state "musiccast.0.YSP-1600_00112233.netusb.play_time" not set'
																								);
																							} else {
																								console.log(
																									'musiccast.0.YSP-1600_00112233.netusb.play_time       ... ' +
																										state.val
																								);
																								expect(state.val).to
																									.exist;
																								expect(
																									state.val
																								).to.be.equal(0);
																								resolve();
																							}
																						}
																					);
																				}
																			);
																		}
																	);
																}
															);
														}
													);
												}
											);
										}
									);
								});
							});
						});
					});
				});
			}).timeout(20000);
		});
	}
});
