var Conversation = require('hubot-conversation');
var Dialog = require('./dialog');

function DynamicConversation(robot) {
  this.robot = robot;
  this.switchBoard = new Conversation(robot, 'user');
  robot.brain.data.announcements = robot.brain.data.announcements || [];
}

DynamicConversation.prototype.constructor = DynamicConversation;

DynamicConversation.prototype.start = function (msg, dynamicMsg, callback) {
  var dialog = new Dialog(this.switchBoard, msg, dynamicMsg);
  dialog.on('end', function (err, message) {
    if (err) {
      return callback(err, message, dialog);
    }

    this.robot.brain.data.announcements.push(dialog.fetch());
    return callback(null, message, dialog);
  }.bind(this));
}

module.exports = function (robot) {
  var convo = new DynamicConversation(robot);
  return convo;
};
