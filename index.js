var Conversation = require('hubot-conversation');
var Dialog = require('./dialog');

/**
 * The conversation mangager - It manages all the dialogs that happens with users
 * and records it to Hubot's brain
 * @param {Hubot} robot A hubot instance
 */
function DynamicConversation(robot) {
  this.robot = robot;
  this.switchBoard = new Conversation(robot, 'user');
  // robot.brain.data.announcements = robot.brain.data.announcements || [];
}

/**
 * Starts a new dialog
 * @param  {Hubot.Response} - msg
 * @param  {Array} - dialogOptions An array of dialog options. This array contains
 * the messages with options that is used to communicate with the user
 *   eg. dialogOptions = [
 *     {
 *       question: 'Do you have any trouble',
 *       answer: {
 *         type: 'text'
 *       },
 *       required: false,
 *       error: 'Sorry, did not understand response'
 *     }
 *   ]
 * @param  {Function} - callback   A function that is called when the dialog is done
 * @return {Dialog} - A dialog instance
 */
DynamicConversation.prototype.start = function (msg, dialogOptions, callback) {
  var dialog = new Dialog(this.switchBoard, msg, dialogOptions, this.robot);
  dialog.on('end', function (err, res) {
    if (err) {
      return callback(err, res, dialog);
    }

    // this.robot.brain.data.announcements.unshift(dialog.fetch());
    return callback(null, res, dialog);
  }.bind(this));
  dialog.start();

  return dialog;
};

module.exports = function (robot) {
  return new DynamicConversation(robot);
};
