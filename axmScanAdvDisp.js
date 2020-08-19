// Copyright 2017,2018 Axiomware Systems Inc. 
//
// Licensed under the MIT license <LICENSE-MIT or 
// http://opensource.org/licenses/MIT>. This file may not be copied, 
// modified, or distributed except according to those terms.
//

//Add external modules dependencies
var gMQTT = require('mqtt');
var MQTTPattern = require("mqtt-pattern");
var minimist = require('minimist'); //library to parse command-line args

let args = minimist(process.argv.slice(2), {  
	default: {
		h: '127.0.0.1',
        p: 1883,
    },
	alias: {
        h: 'host',
        p: 'port'
    }	
});

var gHost = args.host;
var gPort = args.port;
var gUser = '';
var gPwd = '';

//var gGWID = 'netrunr/user/BT202818A26802';          /* Netrunr gateway id */
var gGWID = 'netrunr/user/+';          /* Netrunr gateway id */
var gTopicDataIn = gGWID + '/1';       /* Netrunr data in topic */
var gTopicDataOut = gGWID + '/2';       /* Netrunr data out topic */
var gTopicDataReportOut = gGWID + '/4'; /* Netrunr report out topic */
var gTopicDataEventOut = gGWID + '/6';  /* Netrunr status/event out topic */
var gTopicPattern = 'netrunr/user/+gwid/+ch' /* For mqtt-pattern library */
var gVerbose = 0; /* Debug */

/* Console command handling */
var stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');
stdin.on('data', function (key) {
    process.stdout.write(key);
    process.stdout.write("\n");
	if(key == 'q') {
		console.log('MQTT: disconnecting...');
		gFinish();
	}
});

var options = {
    username: gUser,
    password: gPwd
};

var gClient = initMQTT(gMQTT, gHost, gPort, options);
if (!gClient) {
    console.log('MQTT client: ERROR: no client');
    process.exit();
}

function initMQTT(mqtt, host, port, options) {
    var client = mqtt.connect('mqtt://' + host + ':' + port, options);
    if (!client) {
        return client;
    }

    client.on('connect', function (connack) {
        console.log('MQTT: connected');

        client.subscribe(gTopicDataOut, {}, function (robj) {
            console.log('MQTT: subscribed;' + gTopicDataOut);
        });
        client.subscribe(gTopicDataReportOut, {}, function (robj) {
            console.log('MQTT: subscribed;' + gTopicDataReportOut);
        });

        client.subscribe(gTopicDataEventOut, {}, function (robj) {
            console.log('MQTT: subscribed;' + gTopicDataEventOut);
        });
    });

    client.on('close', function () {
        console.log('MQTT: closed');
    });

    client.on('offline', function () {
        console.log('MQTT: offline');
    });

    client.on('error', function () {
        console.log('MQTT: error');
    });

    client.on('end', function () {
        console.log('MQTT: end');
    });

    client.on('message', processMQTTMessage);

    return client;
};

function processMQTTMessage(topic, message, packet) {
        if (gVerbose)
			console.log('topic: ' + topic + ', message: ' + message);
        var mqttTopics = MQTTPattern.exec(gTopicPattern, topic);
        var obj = JSON.parse(message);

        if (mqttTopics.ch == 4) {
            var beaconData = processDataReportOut(mqttTopics.gwid, obj);
			axPrintAdvArrayScreen(beaconData);
        }
    }

function gFinish() {
    gClient.end(false, function () {
        process.exit();
    });
};

function processDataReportOut(gwid, robj) {
    var adv, cmd, did, dtype, ii, obj, msg, node, nodes, notification, notifications;

    if (robj['report'] == 1) {
        var nodes = robj['nodes'];
        if (nodes.length > 0) {
            var advArrayMap = nodes.map(item => axAdvExtractDataLimited(gwid, item));//Extract adv data
            //var adviBeaconDataLine = advArrayMap.map(axIBeaconExtractData); //Extract iBeacon data
            //var adviBeaconDataLine1 = adviBeaconDataLine.filter(item => item.isBeacon); // Seclect only if iBeacon
			//var axReducedData = adviBeaconDataLine1.map(axIBeaconReduceData); // Get reduced set of data - too much to print on console
        }
		return advArrayMap
        //return axReducedData;
    }
};

/**
 * Function to extract advertisement data
 *
 * @param {object} gwid - Gateway object
 * @param {Object} advItem - Single advertisement object
 * @returns {Object} advObj - Single parsed advertisement data object
 */
function axAdvExtractDataLimited(gwid, advItem) {
    advObj = {
        //gw: gwid,
        ts: dateTime(advItem.tss + 1e-6 * advItem.tsus),    //Time stamp
        //did: advItem.did,
        did: addrDisplaySwapEndianness(advItem.did),        //BLE address
        dt: advItem.dtype,                                  // Adress type
        ev: advItem.ev,                                     //adv packet type
        rssi: advItem.rssi,                                 //adv packet RSSI in dBm
        //adv: advItem.adv.length,
        //rsp: advItem.rsp.length,
        name: axParseAdvGetName(advItem.adv, advItem.rsp)  //BLE device name		
    };
    return advObj;
}

/**
 * Function to Extract iBeacon Data
 * 
 * @param {any} advItem 
 * @returns {boolean} - true if advertsiment has to be retained
 */
function axIBeaconExtractData(advItem) {
    let beaconData = {}
    beaconData.ts = advItem.ts;
    beaconData.gw = advItem.gw;
    beaconData.did = advItem.did;
    beaconData.dt = advItem.dt;
    beaconData.ev = advItem.ev;
    beaconData.rssi = advItem.rssi;
    beaconData.isBeacon = false;
    for (let i = 0; i < advItem.adv.length; i++) {
        if (advItem.adv[i].t == 255) {
            if (advItem.adv[i].v.length == 50) {
                const buf = Buffer.from(advItem.adv[i].v, 'hex');
                beaconData.manuf = decimalToHex(buf.readUInt16LE(0), 4);//Little-endian 16-bit to unsigned integer - Temperature
                beaconData.type = decimalToHex(buf.readUInt8(2), 2);//Little-endian 16-bit to unsigned integer - Temperature
                beaconData.length = decimalToHex(buf.readUInt8(3), 2);//Little-endian 16-bit to unsigned integer - Temperature
                beaconData.UID = UUIDformat(advItem.adv[i].v.slice(8, 40));
                beaconData.major = decimalToHex(buf.readUInt16BE(20), 4);//Little-endian 16-bit to unsigned integer - Temperature
                beaconData.minor = decimalToHex(buf.readUInt16BE(22), 4);//Little-endian 16-bit to unsigned integer - Temperature
                beaconData.cal_rssi = buf.readInt8(24);//Little-endian 16-bit to unsigned integer - Temperature
                beaconData.isBeacon = true;
            }
        }
    }
    return beaconData;
}

/**
 * Function to Select a  subset of data
 *
 * @param {any} advItem
 * @returns {boolean} - true if advertsiment has to be retained
 */
function axIBeaconReduceData(advItem) {
    let beaconData = {}
    beaconData.ts = advItem.ts;
    beaconData.gw = advItem.gw;
    beaconData.did = advItem.did;
    //beaconData.dt = advItem.dt;
    //beaconData.ev = advItem.ev;
    beaconData.rssi = advItem.rssi;
    beaconData.manuf = advItem.manuf; 
    beaconData.type = advItem.type;
    beaconData.UID = advItem.UID;
    beaconData.major = advItem.major;
    beaconData.minor = advItem.minor;
    beaconData.cal_rssi = advItem.cal_rssi;
    return beaconData;
}

/**
 * Convert unix seconds to time string - local time (yyyy-mm-ddThh:mm:ss.sss).
 * 
 * @param {Number} s - Number is Unix time format
 * @returns {string} - in local time format
 */
function dateTime(s) {
    var d = new Date(s * 1000);
    var localISOTime = new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000).toISOString().slice(0, -1);
    return localISOTime;
}

/**
 * Swap endianness of a hex-string. Format it to standard BLE address style
 * 
 * @param {string} hexStr - Hex string(make sure length is even) 
 * @returns {string}
 */
function addrDisplaySwapEndianness(hexStr) {
    if (hexStr.length > 2)
        return hexStr.replace(/^(.(..)*)$/, "0$1").match(/../g).reverse().join(":").toUpperCase();
    else
        return hexStr
}

function decimalToHex(d, padding) {
    var hex = Number(d).toString(16);
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

    while (hex.length < padding) {
        hex = "0" + hex;
    }

    return hex;
}

function UUIDformat(str) {
    return str.substr(0, 8) + '-' + str.substr(8, 4) + '-' + str.substr(12, 4) + '-' + str.substr(16, 4) + '-' + str.substr(20);
}

/**
 * Format adv packets to print to screen using console.log
 * 
 * @param {Object[]} advArray - Array of advertsisement objects from report callback
 */
function axPrintAdvArrayScreen(advArray) {
if(advArray){    
for (var i = 0; i < advArray.length; i++) {
        console.log(JSON.stringify(advArray[i], null, 0));
    }
}
}

/**
 * Get device name from advertisement packet
 * 
 * @param {Object} adv - Advertisement payload
 * @param {Object} rsp - Scan response payload
 * @returns {string} - Name of the device or null if not present
 */
function axParseAdvGetName(adv, rsp) {
    var didName = '';
    for (var i = 0; i < adv.length; i++) {
        if ((adv[i].t == 8) || (adv[i].t == 9)) {
            didName = adv[i].v;
            return didName;
        }
    }
    for (var i = 0; i < rsp.length; i++) {
        if ((rsp[i].t == 8) || (rsp[i].t == 9)) {
            didName = rsp[i].v;
            return didName;
        }
    }
    return didName;
}


