![Logo](admin/musiccast.png)
# ioBroker.musiccast

[![NPM version](http://img.shields.io/npm/v/iobroker.musiccast.svg)](https://www.npmjs.com/package/iobroker.musiccast)
[![Downloads](https://img.shields.io/npm/dm/iobroker.musiccast.svg)](https://www.npmjs.com/package/iobroker.musiccast)
[![Build Status](https://travis-ci.org/foxthefox/ioBroker.musiccast.svg?branch=master)](https://travis-ci.org/foxthefox/ioBroker.musiccast)


[![NPM](https://nodei.co/npm/iobroker.musiccast.png?downloads=true)](https://nodei.co/npm/iobroker.musiccast/)

adapter for Yamaha MusicCast devices like WX-010/030, YSP-1600

## Installation:
Installation requires nodejs v4 at minimum

from npm
* npm install iobroker.musiccast

actual version from github
* npm install https://github.com/foxthefox/ioBroker.musiccast/tarball/master --production

## Settings
The admin page the "+" can be used for adding manually the IP address, DeviceID, Type and Name.
Press the search button for discovery. If you have multiple devices, you have to hit the button multiple times until all devices are discovered. Unfortunately the discovery returns only one object at the time and this could be any of your MusicCast devices. 

## available Objects
The following objects are currently implemented:

|Object|Value|settable|Description|
|--------|-------|:-:|--------|
|{zone}.power|boolean|x|true/false -> ON/Standby|
|{zone}.mute|boolean|x|true/false -> muted/ not muted|
|{zone}.volume|value|x|0...max (max depending on device)|
|{zone}.input|text|x|inputs depending on device|
|{zone}.input_list|text|-|possible inputs|
|{zone}.sound_program|text|x|sound programs depending on device|
|{zone}.sound_program_list|text|-|possible sound programs|
|{zone}.clearVoice|boolean|x|clear Voice control|
|{zone}.low|value|x|level EQ low|
|{zone}.mid|value|x|level EQ mid|
|{zone}.high|value|x|level EQ high|
|system.api_version|value|-|API Version|
|system.system_version|value|-|System Version|


## Changelog
#### 0.0.5
* cleanup in admin page
* improvement for object creation

#### 0.0.4
* new objects and functions (input, sound_prog, EQ, clearVoice)
* search/discovery in admin page

#### 0.0.3
* more objects implemented

#### 0.0.2
* minor corrections

#### 0.0.1
* initial release with setting of IP in config-page, 
* available commands power, mute, volume
