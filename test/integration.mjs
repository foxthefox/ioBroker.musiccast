// const YamahaYXCEmu = require('yamaha-yxc-nodejs').YamahaYXCEmu;

import { tests } from '@iobroker/testing';
import pkg from 'yamaha-yxc-nodejs';
const { YamahaYXCEmu } = pkg;

import { expect } from 'chai';
import fs from 'fs';

import path from 'path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

console.log(`PATH ist ${path.join(__dirname, './data/')}`);

let port = 3311;
let testfile = 'YSP1600_312_208.json';
let testdevice = 'YSP-1600';
const YXCresponses = fs.readFileSync(new URL(`./data/${testfile}`, import.meta.url));
const deviceresp = JSON.parse(String(YXCresponses))[testdevice];

function delay(t, val) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve(val);
        }, t);
    });
}

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, '..'), {
    // This should be the adapter's root directory

    // If the adapter may call process.exit during startup, define here which exit codes are allowed.
    // By default, termination during startup is not allowed.
    allowedExitCodes: [11],

    // Define your own tests inside defineAdditionalTests
    // Since the tests are heavily instrumented, you need to create and use a so called "harness" to control the tests.
    defineAdditionalTests({ suite }) {
        suite('Test creation of devices', getHarness => {
            let harness;
            let port = 3311;
            before('start the emulation', async () => {
                const emulation = new YamahaYXCEmu(deviceresp, port, false);
                emulation.setupHttpServer(function () {});
                harness = getHarness();
                // modification of some starting values
                const obj = {
                    native: {
                        devices: [
                            {
                                ip: 'localhost:3311',
                                type: 'YSP-1600',
                                uid: '00A0DED15025',
                                sid: '0B587073',
                                name: 'TestGerät',
                            },
                        ],
                    },
                };
                await harness.changeAdapterConfig('musiccast', obj);
            });
            it('start Adapter and read musiccast Object', () => {
                return new Promise(async resolve => {
                    // Create a fresh harness instance each test!
                    // modification of some starting values

                    //schon Teil des iobroker/testing :-)
                    //config.common.enabled = true;
                    //config.common.loglevel = 'debug';
                    // systemConfig.native.secret ='Zgfr56gFe87jJOM'

                    //await harness.startAdapterAndWait();
                    //await delay(3000);
                    harness.objects.getObject('system.adapter.musiccast.0', async (err, obj) => {
                        console.log(' ADAPTER SETTINGS ', JSON.stringify(obj));
                        // Start the adapter and wait until it has started
                        await harness.startAdapterAndWait();
                        await delay(3000);
                        resolve();
                    });
                });
            }).timeout(5000);
            it('YSP-1600 should be created', () => {
                return new Promise(async resolve => {
                    // Create a fresh harness instance each test!

                    harness.states.getState(
                        'musiccast.0.YSP-1600_00A0DED15025.system.device_id',
                        function (err, state) {
                            if (err) {
                                console.error(err);
                            }
                            expect(state).to.exist;
                            if (!state) {
                                console.error('state "musiccast.0.YSP-1600_00A0DED15025.system.device_id" not set');
                            } else {
                                console.log(`musiccast.0.YSP-1600_00A0DED15025.system.device_id      ... ${state.val}`);
                            }
                            expect(state.val).to.exist;
                            expect(state.val).to.be.equal('00A0DED15025');
                            harness.states.getState(
                                'musiccast.0.YSP-1600_00A0DED15025.main.volume',
                                function (err, state) {
                                    if (err) {
                                        console.error(err);
                                    }
                                    expect(state).to.exist;
                                    if (!state) {
                                        console.error('state "musiccast.0.YSP-1600_00A0DED15025.main.volume" not set');
                                    } else {
                                        console.log(`musiccast.0.YSP-1600_00A0DED15025.main.volume  ... ${state.val}`);
                                    }
                                    expect(state.val).to.exist;
                                    expect(state.val).to.be.equal(30);
                                    harness.states.getState(
                                        'musiccast.0.YSP-1600_00A0DED15025.main.input',
                                        function (err, state) {
                                            if (err) {
                                                console.error(err);
                                            }
                                            expect(state).to.exist;
                                            if (!state) {
                                                console.error(
                                                    'state "musiccast.0.YSP-1600_00A0DED15025.main.input" not set',
                                                );
                                            } else {
                                                console.log(
                                                    `musiccast.0.YSP-1600_00A0DED15025.main.input    ... ${state.val}`,
                                                );
                                            }
                                            expect(state.val).to.exist;
                                            expect(state.val).to.be.equal('hdmi');
                                            harness.states.getState(
                                                'musiccast.0.YSP-1600_00A0DED15025.main.sound_program',
                                                function (err, state) {
                                                    if (err) {
                                                        console.error(err);
                                                    }
                                                    expect(state).to.exist;
                                                    if (!state) {
                                                        console.error(
                                                            'state "musiccast.0.YSP-1600_00A0DED15025.main.sound_program" not set',
                                                        );
                                                    } else {
                                                        console.log(
                                                            `musiccast.0.YSP-1600_00A0DED15025.main.sound_program           ... ${
                                                                state.val
                                                            }`,
                                                        );
                                                    }
                                                    expect(state.val).to.exist;
                                                    expect(state.val).to.be.equal('stereo');
                                                    harness.states.getState(
                                                        'musiccast.0.YSP-1600_00A0DED15025.main.clear_voice',
                                                        function (err, state) {
                                                            if (err) {
                                                                console.error(err);
                                                            }
                                                            expect(state).to.exist;
                                                            if (!state) {
                                                                console.error(
                                                                    'state "musiccast.0.YSP-1600_00A0DED15025.main.clear_voice" not set',
                                                                );
                                                            } else {
                                                                console.log(
                                                                    `musiccast.0.YSP-1600_00A0DED15025.main.clear_voice          ... ${
                                                                        state.val
                                                                    }`,
                                                                );
                                                            }
                                                            expect(state.val).to.exist;
                                                            expect(state.val).to.be.equal(false);
                                                            harness.states.getState(
                                                                'musiccast.0.YSP-1600_00A0DED15025.main.power',
                                                                function (err, state) {
                                                                    if (err) {
                                                                        console.error(err);
                                                                    }
                                                                    expect(state).to.exist;
                                                                    if (!state) {
                                                                        console.error(
                                                                            'state "musiccast.0.YSP-1600_00A0DED15025.main.power" not set',
                                                                        );
                                                                    } else {
                                                                        console.log(
                                                                            `musiccast.0.YSP-1600_00A0DED15025.main.power        ... ${
                                                                                state.val
                                                                            }`,
                                                                        );
                                                                    }
                                                                    expect(state.val).to.exist;
                                                                    expect(state.val).to.be.equal(false);
                                                                    harness.states.getState(
                                                                        'musiccast.0.YSP-1600_00A0DED15025.main.mute',
                                                                        function (err, state) {
                                                                            if (err) {
                                                                                console.error(err);
                                                                            }
                                                                            expect(state).to.exist;
                                                                            if (!state) {
                                                                                console.error(
                                                                                    'state "musiccast.0.YSP-1600_00A0DED15025.main.mute" not set',
                                                                                );
                                                                            } else {
                                                                                console.log(
                                                                                    `musiccast.0.YSP-1600_00A0DED15025.main.mute         ... ${
                                                                                        state.val
                                                                                    }`,
                                                                                );
                                                                            }
                                                                            expect(state.val).to.exist;
                                                                            expect(state.val).to.be.equal(false);
                                                                            harness.states.getState(
                                                                                'musiccast.0.YSP-1600_00A0DED15025.netusb.input',
                                                                                function (err, state) {
                                                                                    if (err) {
                                                                                        console.error(err);
                                                                                    }
                                                                                    expect(state).to.exist;
                                                                                    if (!state) {
                                                                                        console.error(
                                                                                            'state "musiccast.0.YSP-1600_00A0DED15025.netusb.input" not set',
                                                                                        );
                                                                                    } else {
                                                                                        console.log(
                                                                                            `musiccast.0.YSP-1600_00A0DED15025.netusb.input      ... ${
                                                                                                state.val
                                                                                            }`,
                                                                                        );
                                                                                    }
                                                                                    expect(state.val).to.exist;
                                                                                    expect(state.val).to.be.equal(
                                                                                        'net_radio',
                                                                                    );
                                                                                    harness.states.getState(
                                                                                        'musiccast.0.YSP-1600_00A0DED15025.netusb.playback',
                                                                                        function (err, state) {
                                                                                            if (err) {
                                                                                                console.error(err);
                                                                                            }
                                                                                            expect(state).to.exist;
                                                                                            if (!state) {
                                                                                                console.error(
                                                                                                    'state "musiccast.0.YSP-1600_00A0DED15025.netusb.playback" not set',
                                                                                                );
                                                                                            } else {
                                                                                                console.log(
                                                                                                    `musiccast.0.YSP-1600_00A0DED15025.netusb.playback        ... ${
                                                                                                        state.val
                                                                                                    }`,
                                                                                                );
                                                                                            }
                                                                                            expect(state.val).to.exist;
                                                                                            expect(
                                                                                                state.val,
                                                                                            ).to.be.equal('stop');
                                                                                            harness.states.getState(
                                                                                                'musiccast.0.YSP-1600_00A0DED15025.netusb.play_time',
                                                                                                function (err, state) {
                                                                                                    if (err) {
                                                                                                        console.error(
                                                                                                            err,
                                                                                                        );
                                                                                                    }
                                                                                                    expect(state).to
                                                                                                        .exist;
                                                                                                    if (!state) {
                                                                                                        console.error(
                                                                                                            'state "musiccast.0.YSP-1600_00A0DED15025.netusb.play_time" not set',
                                                                                                        );
                                                                                                    } else {
                                                                                                        console.log(
                                                                                                            `musiccast.0.YSP-1600_00A0DED15025.netusb.play_time       ... ${
                                                                                                                state.val
                                                                                                            }`,
                                                                                                        );
                                                                                                        expect(
                                                                                                            state.val,
                                                                                                        ).to.exist;
                                                                                                        expect(
                                                                                                            state.val,
                                                                                                        ).to.be.equal(
                                                                                                            0,
                                                                                                        );
                                                                                                        resolve();
                                                                                                    }
                                                                                                },
                                                                                            );
                                                                                        },
                                                                                    );
                                                                                },
                                                                            );
                                                                        },
                                                                    );
                                                                },
                                                            );
                                                        },
                                                    );
                                                },
                                            );
                                        },
                                    );
                                },
                            );
                        },
                    );
                });
            }).timeout(2000);
        });
    },
});
// test different devices and the existing of datapoints only
// test the testfile against the values of datapoints with foreach (caution manipulated ones)
