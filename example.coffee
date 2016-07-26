DynamicConversation = require 'hubot-dynamic-conversation'

module.exports = (robot) ->
  conversation = new DynamicConversation robot

  robot.respond /transaction/i, (msg) ->
    msg.reply "Welcome to TraderBot. Let's get started..."

    conversationModel = {
      abortKeyword: "quit",
      onAbortMessage: "You have cancelled the transaction"
      onCompleteMessage: "Thankyou for using TraderBot.",
      conversation: [
        {
          question: "Do you want to sell or buy?",
          answer: {
            type: "choice",
            options: [
              {
                match: "sell",
                valid: true,
                response: "OK you said *sell*, next step...",
                value: "sell"
              },
              {
                match: "buy",
                valid: false,
                response: "Ok, I will forward you to our sales department."
              }
            ]
          },
          required: true,
          error: "Sorry, I didn't understand your response. Please say buy or sell to proceed."
        },
        {
          question: "Please describe the item you are selling",
          answer: {
            type: "text"
          },
          required: true,
          error: "Sorry your response didn't contain any text, please describe the issue."
        },
        {
          question: "Please reply with an attached photo of the item, or say [skip] if you don't have a photo"
          answer: {
            type: "attachment"
          },
          required: false,
          error: "Sorry the message didn't contain an attachment, please try again."
        }
      ]
    }

    dialog = conversation.start msg, conversationModel, (err, msg, dialog) ->
      if err?
        return console.log "error occured in the dialog #{err}"

      console.log "Thank you for using TraderBot."
      dialogData = dialog.fetch()
      console.log dialogData
