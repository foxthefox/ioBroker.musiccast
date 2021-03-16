//server to emulate the musiccastresponses
const http = require('http');
const fs = require('fs');

const path = require('path');
console.log('PATH ist ' + path.join(__dirname, './data/'));

const YSP1600_v1_responses = fs.readFileSync(path.join(__dirname, './data/') + 'YSP1600_v1.json');

let server;

let responses = [];

function setupHttpServer(callback) {
	//We need a function which handles requests and send response
	//Create a server
	server = http.createServer(handleHttpRequest);
	//Lets start our server
	server.listen(3311, function() {
		//Callback triggered when server is successfully listening. Hurray!
		console.log('Musiccast listening on: http://localhost:%s', 3311);
		callback();
	});
}

//Antworten des MusicCast Gerätes

responses = JSON.parse(YSP1600_v1_responses.toString());

function handleHttpRequest(request, response) {
	console.log('HTTP-Server: Request: ' + request.method + ' ' + request.url);

	if (request.url == '/YamahaExtendedControl/v1/system/getFeatures') {
		//check the URL of the current request
		response.writeHead(200, { 'Content-Type': 'application/json' });
		if (!responses[0].getFeatures) {
			response.write(JSON.stringify({ response_code: 3 }));
		} else {
			response.write(JSON.stringify(responses[0].getFeatures));
		}
		response.end();
	} else if (request.url == '/YamahaExtendedControl/v1/system/getDeviceInfo') {
		//check the URL of the current request
		response.writeHead(200, { 'Content-Type': 'application/json' });
		if (!responses[1].getDeviceInfo) {
			response.write(JSON.stringify({ response_code: 3 }));
		} else {
			response.write(JSON.stringify(responses[1].getDeviceInfo));
		}
		//response.write(responses[0].getDeviceInfo);
		response.end();
	} else if (request.url == '/YamahaExtendedControl/v1/netusb/getPlayInfo') {
		//check the URL of the current request
		response.writeHead(200, { 'Content-Type': 'application/json' });
		if (!responses[2].getPlayInfo) {
			response.write(JSON.stringify({ response_code: 3 }));
		} else {
			response.write(JSON.stringify(responses[2].getPlayInfo));
		}
		response.end();
	} else if (request.url == '/YamahaExtendedControl/v1/netusb/getRecentInfo') {
		//check the URL of the current request
		response.writeHead(200, { 'Content-Type': 'application/json' });
		if (!responses[3].getRecentInfo) {
			response.write(JSON.stringify({ response_code: 3 }));
		} else {
			response.write(JSON.stringify(responses[3].getRecentInfo));
		}
		response.end();
	} else if (request.url == '/YamahaExtendedControl/v1/netusb/getPresetInfo') {
		//check the URL of the current request
		response.writeHead(200, { 'Content-Type': 'application/json' });
		if (!responses[4].getPresetInfo) {
			response.write(JSON.stringify({ response_code: 3 }));
		} else {
			response.write(JSON.stringify(responses[4].getPresetInfo));
		}
		response.end();
	} else if (request.url == '/YamahaExtendedControl/v1/main/getStatus') {
		//check the URL of the current request
		response.writeHead(200, { 'Content-Type': 'application/json' });
		if (!responses[5].getStatus) {
			response.write(JSON.stringify({ response_code: 3 }));
		} else {
			response.write(JSON.stringify(responses[5].getStatus));
		}
		response.end();
	} else if (request.url == '/YamahaExtendedControl/v1/zone2/getStatus') {
		//check the URL of the current request
		response.writeHead(200, { 'Content-Type': 'application/json' });
		if (!responses[1].getDeviceInfo) {
			response.write(JSON.stringify({ response_code: 3 }));
		} else {
			response.write(JSON.stringify({ response_code: 3 }));
		}
		response.end();
	} else {
		response.writeHead(200, { 'Content-Type': 'application/json' });
		response.write(JSON.stringify({ response_code: 3 }));
		response.end();
	}
}

// setupHttpServer(function() {});
module.exports.setupHttpServer = setupHttpServer;
