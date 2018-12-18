# Advertisement_scanner_MQTT
Scan for Bluetooth Advertisements using [MQTT API](https://www.axiomware.com/netrunr-mqtt/)

Two programs to illustrates the use of MQTT functions in JavaScript. The programs will perform the following functions: 1) connect to your MQTT broker, 2) Collect all advertisements data, 3) extract advertisement payload 4) print raw data to console

**This was tested using Nodejs version 8.+**.

## SDK, Documentation and examples
- [MQTT API](https://www.axiomware.com/netrunr-mqtt/)

## Requirements

- [Netrunr B24C](http://www.axiomware.com/netrunr-b24c-product.html) gateway
- Nodejs (see [https://nodejs.org/en/](https://nodejs.org/en/) for download and installation instructions)
  - Nodejs version 8.x.x is required due to the use of promises/async/await
- NPM (Node package manager - part of Nodejs)   
- Windows, MacOS or Linux computer with access to internet
- One of more BLE peripheral devices.

## Installation

Clone the repo

`git clone https://github.com/axiomware/Advertisement_scanner_MQTT.git`

or download as zip file to a local directory and unzip.

Install all module dependencies by running the following command inside the directory

  `npm install`

## Optional customization before running the program
- If your MQTT broker requires credentials, please modify the *.js file to add credentails
```javascript
var gUser = '';
var gPwd = '';
```

## Usage
Configure the gateway to send data to MQTT broker, for example 192.168.3.1. Make sure the topics published by the gateway match the expeced values in the program. (Advertisement reports are published to user/GWID/4, where GWID is the gateway ID as printed on the gateway.


To collect all advertisement reports:
```bash
node appScanAdv.js -h=192.168.3.1
```
To exit, press q

To collect all iBeacon advertisement reports:
```bash
node axmScanBeacon.js  -h=192.168.3.1
```
To exit, press q

## Error conditions/Troubleshooting

- If the program is not able to login, check your credentials.
- Check if gateway is powered ON and has access to internet. Also, check if firewall is blocking internet access.
- If you're not able to locate your device, check if your BLE device is advertising.   

