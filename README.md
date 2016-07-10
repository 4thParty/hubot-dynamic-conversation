# Hubot-dynamic-conversation
This package helps you to make dynamic conversations with hubot. It allows you to collect information from a user based on some model questions

### Usage

```coffee
DynamicConversation = require 'hubot-dynamic-conversation'
dynamic = new DynamicConversation robot

robot.respond /make a report/i, (msg) -> 
  msg.reply "OK, I can make a maintenance report for you, just answer some questions..."
  maintenanceRequestModel = [
    {
      question: "Is it in a `public` or `private` area?",
      answer: {
      type: "choice",
        options: [
          {
            match: "public",
            valid: true,
            response: "OK you said *public*, next step...",
            value: "public",
          },
          {
            match: "private",
            valid: false,
            response: "Sorry, you will have to find a contractor for private maintenance"
          }
        ]
      },
      required: true,
      error: "Sorry, I didn't understand your response. Please say `private` or `public` to proceed."
    },
    {
      question: "Please describe the issue",
      answer: {
        type: "text"
      },
      required: true,
      error: "Sorry your response didn't contain any text, please describe the issue."
    },
    {
      question: "Please reply with an attached photo of the issue, or say `skip` if you don't have a photo"
      answer: {
        type: "attachment"
      },
      required: false,
      error: "Sorry the message didn't contain an attachment, please try again."
    }
  ]

dialog = dynamic.start msg, maintenanceRequestModel, (err, msg, conversation) ->
  if err
    robot.logger.error err
  else
    data = conversation.fetch()
    robot.logger.info data
# dialog is an instance of an EventEmitter
# It emits an `end` event when the dialog with the user is done
```

