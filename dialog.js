var series = require('async-series');
var util = require('util');
var EventEmitter = require('events');

function Dialog(switchBoard, msg, messageOptions) {
  EventEmitter.call(this);
  this.dialog = switchBoard.startDialog(msg);
  this.msg = msg;
  this.messageOptions = messageOptions;

  this.data = {
    source: '',
    dateTime: null,
    type: 'private',
    description: '',
    attachment: ''
  };

  this.data.source = msg.envelope.user;
}
util.inherits(Dialog, EventEmitter);

Dialog.prototype._invokeDialog = function (message, done) {
  var self = this;
  var question = message.question.trim();
  var code = question.charCodeAt(question.length - 1);

  if (!message.required) {
    question = ((code === 46 || code === 63) ? question : question + '.') + ' Reply with `skip` to move to the next question.';
  }

  self.msg.reply(question);

  if (!message.required) {
    self.dialog.addChoice(/skip/i, function (dialogMessage) {
      dialogMessage.reply('Ok. we are skipping this section!!');
      done();
    });
  }

  if (message.answer.type === 'choice') {
    for (var j = 0, len = message.answer.options.length; j < len; j++) {
      (function choiceRunner(j) {
        var option = message.answer.options[j];
        self.dialog.addChoice(new RegExp(option.match, 'i'), function (dialogMessage) {
          dialogMessage.reply(option.response);
          self.data.type = option.match;
          if (!option.valid) {
            return done(new Error('User provided an invalid response'));
          }
          done();
        });

        self.dialog.addChoice(/(.*)/i, function (dialogMessage) {
          dialogMessage.reply(message.error);
          // Rerun the choice question when it fails
          choiceRunner(j);
        });
      })(j);
    }
  }

  if (message.answer.type === 'text') {
    self.dialog.addChoice(/^(?!\s*$).+/i, function (dialogMessage) {
      self.data.description = dialogMessage.message.text;
      done();
    });
  }

  // TODO: provide proper implementation of attachment
  if (message.answer.type === 'attachment') {
  }
};

/**
 * Gets the data for the dialog
 * @return {Object} The object that describes the dialog
 */
Dialog.prototype.fetch = function () {
  return this.data;
};


/**
 * Starts the dialog with the user
 * @return {null}
 */
Dialog.prototype.start = function () {
  var self = this;
  var cbs = [];

  // set all the dialog messages as callback functions that will be run in series
  // that means the next question won't be asked until the previous one has been
  // dealt with
  for (var i = 0, l = self.messageOptions.length; i < l; i++) {
    (function (currIndex) {
      var message = self.messageOptions[currIndex];
      cbs.push(function (done) {
        self._invokeDialog(message, done);
      });
    })(i);
  }

  cbs.push(function (done) {
    self.data.dateTime = new Date();
    done();
  });

  // call the callbacks in series
  // emit `end` when all is done or an error occurs
  series(cbs, function (err) {
    return self.emit('end', err);
  });
};

module.exports = Dialog;
