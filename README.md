# Hubot-dynamic-conversation
This package helps you to make dynamic conversations with hubot. It allows you to collect information from a user based on some model questions.

`robot.hear` is cool but if you do a lot of that to get a conversation going, the code becomes messy.

#### NB

Currently, the v0.1.4 of the [hubot-rocketchat](https://github.com/RocketChat/hubot-rocketchat) does not properly support attachment. To add the attachment support use this fork of the [hubot-rocketchat](https://github.com/ngenerio/hubot-rocketchat).

Change the version number of hubot-rocketchat in your package.json to: https://github.com/ngenerio/hubot-rocketchat#a86a49244b87a73596fbc05f311e5d5c85737fa1 or use https://github.com/RocketChat/hubot-rocketchat/commit/72bbf02d519b5dedb2b8e45e093fe2b0b23df9b3

Check the [example.coffee](https://github.com/4thParty/hubot-dynamic-conversation/blob/master/example.coffee) for more information.

The conversation with the user is built around the concept of message models.

```javascript
// message model
{
  question: String // question to ask the user
  answer: {
    type: String // could be 'choice', 'text, 'attachment'
    options: [ // add the options object if the `type` of answer is `choice`
      {
        match: String, // what robot should listen to - can be a regex
        valid: Boolean, // if set to `false` the conversatin is stopped
        response: String, // the response sent to the user when the user text is matched
      }
    ]
  },
  required: Boolean, // if required, the bot asks the user the same question till a correct or valid answer is provided 
  error: String // the reply to the user when the bot does not match the user answer
}
```


#### Options

abortKeyword: String // the keyword used to abort the conversations (optional)

onAbortMessage: String // the reply to the user when the conversation is aborted  (optional)

onCompleteMessage: String // reply sent to the user when the conversation is done (optional)

onTimeoutMessage: String // message sent to the user when the conversation times out

skipKeyword: String // a keyword that can be used to skip non-required questions (optional)

skipMessage: String // a message that can appended to any non-required questions (optional)

conversation: Array{Message Model} // an array of the message model

#### Usage

Create an instance of the conversation object

```coffee
dynamic = new DynamicConversation robot
```

Use the conversation object in your `robot.respond` code one time:

```coffee
robot.respond /problem/i, (msg) ->
  msg.reply 'What is the problem'
  someConversationModel = {...}
  
  // dialog is an event emitter
  dialog = dynamic.start msg,  someConversationModel, (err, msg, dialog)
```

Check out the example below:

#### Example

```coffee
DynamicConversation = require 'hubot-dynamic-conversation'
dynamic = new DynamicConversation robot

robot.respond /problem/i, (msg) ->
  robot.logger.info 'hello'
  msg.reply "OK, I can make a maintenance report for you, just answer some questions..."
  maintenanceRequestModel = {
    abortKeyword: 'quit',
    onAbortMessage: 'You cancelled the conversation.',
    onCompleteMessage: 'Thanks for reporting this. I\'ll notify someone immediately.',
    skipKeyword: /\bskip\b$/i,
    skipMessage: (or say 'skip'),
    conversation: [ 
      {
        question: "Is it in a public or private area?",
        answer: {
          type: "choice",
          options: [
            {
              match: "public",
              valid: true,
              response: "OK you said *public*, next step...",
            },
            {
              match: "private",
              valid: false,
              response: "Sorry, you will have to find a contractor for private maintenance"
            }
          ]
        },
        required: true,
        error: "Sorry, I didn't understand your response. Please say private or public to proceed."
      },
      {
        question: "Please describe the issue.",
        answer: {
          type: "text"
        },
        required: true,
        error: "Sorry your response didn't contain any text, please describe the issue."
      },
      {
        question: "Please attach a photo of the issue if you have one."
        answer: {
          type: "attachment"
        },
        required: false,
        error: "Sorry the message didn't contain an attachment, please try again."
      }
    ]
  }

  dialog = dynamic.start msg, maintenanceRequestModel, (err, msg, dialog) ->
    if err
      robot.logger.error err
    else
      data = dialog.fetch()
      robot.logger.info data
# dialog is an instance of an EventEmitter
# It emits an `end` event when the dialog with the user is done
```

