var Conversation = require('hubot-conversation');
var Dialog = require('./dialog');

function DynamicConversation(robot) {
  this.robot = robot;
  this.switchBoard = new Conversation(robot, 'user');
}

DynamicConversation.prototype.constructor = DynamicConversation;

DynamicConversation.prototype.start = function (msg, dynamicMsg, callback) {
  return new Dialog(this.switchBoard, msg, dynamicMsg, callback);
}

module.exports = function (robot) {
  var convo = new DynamicConversation(robot);
  return convo;
}
