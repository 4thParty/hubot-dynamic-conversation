var series = require('async-series');

function Dialog(switchBoard, msg, messageOptions, callback) {
  if (typeof messageOptions === 'function') throw new Error('Provide the dynamic message options array');

  callback = callback && typeof callback === 'function' ? callback : function () {};

  this.dialog = switchBoard.startDialog(msg);
  this.msg = msg;
  this.messageOptions = messageOptions;
  this.callback = callback;

  this.data = {
    source: '',
    dateTime: null,
    type: 'private',
    description: '',
    attachment: ''
  };

  this._go();
}

Dialog.prototype._invokeDialog = function (message, done) {
  var self = this;

  self.msg.reply(message.question);
  self.data.source = self.msg.envelope.user;

  if (message.answer.type === 'choice') {
    for (var j = 0, len = message.answer.options.length; j < len; j++) {
      (function (j) {
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
          if (message.required) {
            return done(new Error('Hubot cannot continue this conversation'));
          }
          done();
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
    self.callback(err, self.msg, self);
  });
};

module.exports = Dialog;
