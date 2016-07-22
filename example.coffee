DynamicConversation = require 'hubot-dynamic-conversation'

module.exports = (robot) ->
  conversation = new DynamicConversation robot

  robot.respond /make a report/i, (msg) ->
    robot.logger.info 'hello'
    msg.reply "OK, I can make a maintenance report for you, just answer some questions..."

    maintenanceRequestModel = {
      abortKeyword: 'quit',
      conversation: [ 
        {
          question: "Is it in a [public]or [private]area?",
          answer: {
            type: "choice",
            options: [
              {
                match: "public",
                valid: true,
                response: "OK you said *public*, next step...",
                value: "public"
              },
              {
                match: "private",
                valid: false,
                response: "Sorry, you will have to find a contractor for private maintenance"
              }
            ]
          },
          required: true,
          error: "Sorry, I didn't understand your response. Please say [private]or [public]to proceed."
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
          question: "Please reply with an attached photo of the issue, or say [skip]if you don't have a photo"
          answer: {
            type: "attachment"
          },
          required: false,
          error: "Sorry the message didn't contain an attachment, please try again."
        }
      ]
    }
    
    dialog = conversation.start msg, maintenanceRequestModel, (err, msg, dialog) ->
      if err?
        return console.log "error occured in the dialog #{err}"

      dialogData = dialog.fetch()
      console.log dialogData

  robot.respond /help/i, (msg) ->
    msg.reply 'make a maintenance report'
