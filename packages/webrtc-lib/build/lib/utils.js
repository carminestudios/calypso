"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.iceServers = exports.RTCSessionDescription = exports.RTCIceCandidate = exports.RTCPeerConnection = exports.getUserMedia = void 0;
var getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
exports.getUserMedia = getUserMedia;
var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
exports.RTCPeerConnection = RTCPeerConnection;
var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
exports.RTCIceCandidate = RTCIceCandidate;
var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
exports.RTCSessionDescription = RTCSessionDescription;
var iceServers = [{
  'urls': ['stun:stun.services.mozilla.com']
}, {
  'urls': ['stun:stun.l.google.com:19302']
}]; // Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here

exports.iceServers = iceServers;

var uuid = function uuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
};

var _default = uuid;
exports["default"] = _default;