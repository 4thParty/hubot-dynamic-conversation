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
  this._go();
}
util.inherits(Dialog, EventEmitter);

Dialog.prototype._invokeDialog = function (message, done) {
  var self = this;

  self.msg.reply(message.question);

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
    self.dialog.addChoice(/skip/i, function (dialogMessage) {
      dialogMessage.reply('Ok. we are skipping this section!!');
      done();
    });
  }
};

Dialog.prototype.fetch = function () {
  return this.data;
};


Dialog.prototype._go = function () {
  var self = this;
  var cbs = [];

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

  series(cbs, function (err) {
    return self.emit('end', err);
  });
};

module.exports = Dialog;
