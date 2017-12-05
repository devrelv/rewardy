import { Client, middleware } from "@line/bot-sdk";
import { Middleware } from "@line/bot-sdk/dist/middleware";
import { DirectLine, Message as DirectLineMessage } from "botframework-directlinejs";
import * as restify from "restify";
import * as restifyPlugins from "restify-plugins";
import { DirectLineConverter } from "./DirectLineConverter";
const XMLHttpRequest = require("xhr2");

global = Object.assign(global, { XMLHttpRequest });

const logger = console;
const directLine = new DirectLine({
  secret:
    process.env.DIRECT_LINE_SECRET || "MoLUcxGnEAQ.cwA._Cg.U_1qPvP8ThG6IAsgw08MCBGqVQosEEYxda4AO-LmnqA"
});

/**
 * Map conversation ID to user ID
 */
const conversations: {
  [messageId: string]: string;
} = {};


const lineConfig: Line.ClientConfig & Line.MiddlewareConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "2hKH+pXVeat+y5wUwTkmWFjf9EIbZVZ/tzxMv7Dh+W+klGRsxFKaEaOEJR5OisfC6IeH75WU9tjOf2sLV8cleMEdwgS5irxDSKCHgYVqcNmir/hnk8Dx4sJ3p3jPngbUd3OSwp11xyO5n5Ay1lZCNwdB04t89/1O/w1cDnyilFU=",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "15b6838f5798a083609e253d3099b21c"
};
const lineClient = new Client(lineConfig);

const server = restify.createServer();
server.use(middleware(lineConfig));
server.listen(process.env.port || process.env.PORT || 9999 || 3978, () => {
  logger.log("%s listening to %s", server.name, server.url);
});

const endpoint = process.env.ENDPOINT || "/";
server.post(endpoint, async (req, res) => {
  if (Array.isArray(req.body.events)) {
    for (const event of req.body.events) {
      switch (event.type) {
        case "message":
          const activity: DirectLineMessage = {
            from: {
              id: event.replyToken,
              name: event.source.userId // TODO:figure out the user's name.
            },
            text: event.message.text,
            type: "message"
          };
          logger.log("posting activity", activity);
          directLine.postActivity(activity).subscribe(
            messageId => {
              const conversationId = messageId.split("|")[0];
              // conversations[id] = event.replyToken || "";
              conversations[conversationId] = event.source.userId || "";
              logger.log("Posted activity, assigned ID ", messageId);
            },
            error => logger.error("Error posting activity", error)
          );
          break;
        case "follow":
          logger.log("follow");
          break;
        case "unfollow":
          logger.log("unfollow");
          break;
        default:
          res.send(404);
          break;
      }
    }
  }
});

directLine.activity$
  // .filter(activity => activity.type === "message" && activity.from.id === "yourBotHandle")
  // .filter(activity => activity.type === "message")
  .subscribe((message: DirectLineMessage) => {
    logger.log("received message ", message);
    const lineMessages = DirectLineConverter.convertDirectLineToLine(message);
    if (message.conversation && message.conversation.id) {
      lineClient
        .pushMessage(conversations[message.conversation.id], lineMessages)
        .then(() => {
          logger.log("Replied with", lineMessages);
        })
        .catch((err: Error) => {
          logger.error(err.message);
        });
    }
  });
