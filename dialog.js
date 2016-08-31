var series = require('async-series');
var util = require('util');
var EventEmitter = require('events');

function toRegExp(s) {
  if (typeof s === 'string')
  {
    // create a regex to parse a regex, hopefully without creating an infinite space-time vortex
    var regex = new RegExp('^/(.+)/(.*)$');
    var match = s.match(regex);
    if (match) {
      return new RegExp(match[1], match[2]);
    }
  }
  
  return new RegExp(s.toString());
};

/**
 * Starts a new dialog with a user
 * @param {Conversation} switchBoard
 * @param {Hubot.Response} msg
 * @param {Array} messageOptions - refer to docs in index.js `Conversation.prototype.start`
 * @api private
 */
function Dialog(switchBoard, msg, messageOptions, robot) {
  EventEmitter.call(this);
  this.dialog = switchBoard.startDialog(msg, Dialog.TIMEOUT, messageOptions.onTimeoutMessage);
  this.msg = msg;
  this.messageOptions = messageOptions;
  this.robot = robot;

  this.data = {
    source: '',
    dateTime: null,
    answers: [],
    aborted: false
  };

  this.data.source = msg.envelope.user;
  this.data.robot = { name: robot.name, alias: robot.alias };
}
util.inherits(Dialog, EventEmitter);

/**
 * Strip the bot's name from the description text
 * @param  {String} text
 * @return {String}
 * Implemented from https://github.com/timkinnane/hubot-rocketchat-announcement/blob/master/src/rocketchat-announcement.coffee#L46-L54
 */
Dialog.prototype._stripBotName = function (text) {

  var match = text.match(new RegExp("^(@?(?:"+ this.robot.name + "|" + this.robot.alias + "|hubot):?)?(.*)", "i"));
  return match[2].trim();
};


Dialog.prototype.updateAnswers = function (message, key, value) {
  var currAnswer = {
    question: message.question,
    response: {
      type: message.answer.type
    }
  };

  currAnswer.response[key] = value;
  this.data.answers.push(currAnswer);
};


Dialog.prototype.addSkip = function (message, done) {
  var self = this;

  if (!message.required && self.messageOptions.skipKeyword) {
    self.dialog.addChoice(toRegExp(self.messageOptions.skipKeyword), function (dialogMessage) {
      self.msg = dialogMessage;
      done();
    });
  }
};

Dialog.prototype.addAbort = function (done) {
  var self = this;

  if (self.messageOptions.abortKeyword) {
    self.dialog.addChoice(toRegExp(this.messageOptions.abortKeyword), function (dialogMessage) {
    self.msg = dialogMessage;
    self.data.aborted = true;

    if (self.messageOptions.onAbortMessage)
      self.msg.sendDirect(self.messageOptions.onAbortMessage);
      done(new Error('Aborted'));
    });
  }
};

/**
 * Invoke a dialog message with the user and collect the response into the data
 * @param  {Object}   message It holds the message model
 * eg. {
 *       question: 'Do you have any trouble',
 *       answer: {
 *         type: 'text'
 *       },
 *       required: false,
 *       error: 'Sorry, did not understand response'
 *     }
 * @param  {Function} done    The function provided by async-series to call the next dialog message
 * @return {null}
 * @api private
 */
Dialog.prototype._invokeDialog = function (message, done) {
  var self = this;
  var question = message.question;
  var code = question.charCodeAt(question.length - 1);

  if (message.required === false && self.messageOptions.skipMessage) {
    question += ' ' + self.messageOptions.skipMessage;
  }

  self.msg.sendDirect(question);

  self.addSkip(message, done);
  self.addAbort(done);

  if (message.answer.type === 'choice') self.addChoiceQuestion(message, done);

  if (message.answer.type === 'text') self.addTextQuestion(message, done);

  if (message.answer.type === 'attachment') self.addAttachmentQuestion(message, done);
};

Dialog.prototype.addAttachmentQuestion = function (message, done) {
  var self = this;
  self.dialog.addChoice(/.*/, function (dialogMessage) {
    if (dialogMessage.message.attachment && dialogMessage.message.attachment.type === 'image') {
      self.updateAnswers(message, 'value', dialogMessage.message.attachment.link);
      self.msg = dialogMessage;
      return done();
    }

    dialogMessage.sendDirect(message.error);
    self.addSkip(message, done);
    self.addAbort(done);
    self.addAttachmentQuestion(message, done);
  });
};

Dialog.prototype.addTextQuestion = function (message, done) {
  var self = this;

  self.dialog.addChoice(/^(?!\s*$).+/i, function (dialogMessage) {
    self.updateAnswers(message, 'value', self._stripBotName(dialogMessage.message.text));
    self.msg = dialogMessage;
    done();
  });
};

Dialog.prototype.addChoiceQuestion = function (message, done) {
  var self = this;

  for (var j = 0, len = message.answer.options.length; j < len; j++) {
    (function choiceRunner(choiceIndex) {
      var option = message.answer.options[choiceIndex];

      self.dialog.addChoice(toRegExp(option.match), function (dialogMessage) {

        if (option.response)
          dialogMessage.sendDirect(option.response);

        self.updateAnswers(message, 'value', self._stripBotName(dialogMessage.message.text));

        if (!option.valid) {
          return done(new Error('User provided an invalid response'));
        }

        self.msg = dialogMessage;
        done();
      });
    })(j);
  }

  self.dialog.addChoice(/(.*)/i, function (dialogMessage) {
    dialogMessage.sendDirect(message.error);
    self.msg = dialogMessage;
    self.addSkip(message, done);
    self.addAbort(done);
    self.addChoiceQuestion(message, done);
  });
};

/**
 * Gets the data for the dialog
 * @return {Object} The object that describes the dialog
 * @api public
 */
Dialog.prototype.fetch = function () {
  return this.data;
};


/**
 * Starts the dialog with the user
 * @return {null}
 * @api public
 */
Dialog.prototype.start = function () {
  var self = this;
  var cbs = [];

  // set all the dialog messages as callback functions that will be run in series
  // that means the next question won't be asked until the previous one has been
  // dealt with
  for (var i = 0, l = self.messageOptions.conversation.length; i < l; i++) {
    (function (currIndex) {
      var message = self.messageOptions.conversation[currIndex];
      cbs.push(function (done) {
        self._invokeDialog(message, done);
      });
    })(i);
  }

  // if (self.messageOptions.abortKeyword) self.msg.sendDirect('You can cancel this conversation with [' + self.messageOptions.abortKeyword + '].');

  // call the callbacks in series
  // emit 'end' when all is done or an error occurs
  series(cbs, function (err) {
    self.data.dateTime = new Date();

    if (!self.data.aborted && self.messageOptions.onCompleteMessage)
      self.msg.sendDirect(self.messageOptions.onCompleteMessage);

    return self.emit('end', err, self.msg);
  });
};

Dialog.TIMEOUT = 3 * 60 * 1000; // 3 minute timeout

/**
 * Module exports
 * @type {Dialog}
 * @public
 */
module.exports = Dialog;
