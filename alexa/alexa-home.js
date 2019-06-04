
module.exports = function (RED) {

    "use strict";
    var debug = require('debug');
    var alexa_home = require('./alexa-helper');

    function AlexaHomeNode(config) {

        RED.nodes.createNode(this, config);

        this._subclass = 'alexa-home:node';
        this._logger = debug(this._subclass)

        var node = this;
        node.control = config.control;
        node.name = config.devicename;
        if (config.devicetype) {
            node.devicetype = config.devicetype;
        } else {
            node.devicetype = "Extended color light"
        }
        node.inputTrigger = config.inputtrigger;
        node.state = false;
        node.bri = 0;

        if(alexa_home.controllerNode)
        {
            alexa_home.controllerNode.registerCommand(node);
        }

        node.on('input', function (msg) {
            msg.inputTrigger = true;
            node.processCommand(msg);
        });

        node.on('close', function (done) {
            if (node.controller) {
                node.controller.deregisterCommand(node);
            }
            done();
        })
    }

    AlexaHomeNode.prototype.processCommand = function (msg) {
        var node = this;

        if (node.controller == null || node.controller == undefined) {
            this._logger("Ignoring process command - no controller available on " + this.name);
            node.status("red", "No Alexa Home Controller available");
            return;
        }
        //Detect increase/decrease command
        msg.change_direction = 0;
        if (msg.payload.bri) {
            if (msg.payload.bri == alexa_home.bri_default - 64) //magic number
                msg.change_direction = -1;
            if (msg.payload.bri == alexa_home.bri_default + 63) //magic number
                msg.change_direction = 1;
        }

        //Dimming or Temperature command
        if (msg.payload.bri) {
            this._logger(this.name + " - Setting values on bri");
            msg.payload.on = msg.payload.bri > 0;

            node.status({
                fill: "blue",
                shape: "dot",
                text: "bri:" + msg.payload.bri
            });
        }
        //On/off command
        else {
            this._logger(this.name + " - Setting values on On/Off");
            var isOn = msg.payload.on
            msg.payload.on = isOn;
            msg.payload.bri = isOn ? 255.0 : 0.0;

            //Node status
            node.status({
                fill: "blue",
                shape: "dot",
                text: isOn ? "On" : "Off"
            });
        }
        msg.payload.bri_normalized = msg.payload.bri / 255.0 * 100.0;

        msg.device_name = this.name;
        msg.light_id = this.id;

        node.state = msg.payload.on;
        node.bri = msg.payload.bri;

        if (msg.inputTrigger) {
            this._logger(this.name + " - Set values on input");
            return;
        }

        this._logger(this.name + " - sending values");

        node.send(msg);
    }

    RED.nodes.registerType("alexa-home", AlexaHomeNode);

}
