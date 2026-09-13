import { verifyKey } from "discord-interactions";
import {
  SQSClient,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";

const sqs = new SQSClient({
  region: "us-east-1",
});

export const handler = async (event: any) => {
  try {
    const signature =
      event.headers?.["x-signature-ed25519"] ||
      event.headers?.["X-Signature-Ed25519"];

    const timestamp =
      event.headers?.["x-signature-timestamp"] ||
      event.headers?.["X-Signature-Timestamp"];

    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    if (!signature || !timestamp || !publicKey) {
      return {
        statusCode: 401,
        body: "Unauthorized",
      };
    }

    const rawBody = event.body || "";

    const isValidRequest = await verifyKey(
      rawBody,
      signature,
      timestamp,
      publicKey
    );

    if (!isValidRequest) {
      return {
        statusCode: 401,
        body: "Invalid request signature",
      };
    }

    const interaction = JSON.parse(rawBody);

    // Discord PING
    if (interaction.type === 1) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: 1,
    }),
  };
}

if (
  interaction.type === 2 &&
  interaction.data?.name === "ping"
) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: 4,
      data: {
        content: "Pong!",
      },
    }),
  };
}


if (
  interaction.type === 2 &&
  interaction.data?.name === "ask"
) {
  const question =
    interaction.data?.options?.find(
      (option: any) => option.name === "question"
    )?.value;

  if (!question) {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: 4,
        data: {
          content: "You need to give Jidamon a question.",
        },
      }),
    };
  }

  const queueUrl = process.env.JIDAMON_AI_QUEUE_URL;

  if (!queueUrl) {
    throw new Error("JIDAMON_AI_QUEUE_URL is not configured.");
  }

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({
        question,
        applicationId: interaction.application_id,
        interactionToken: interaction.token,
      }),
    })
  );

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: 5,
    }),
  };
}

return {
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: 4,
    data: {
      content: "Jidamon received the interaction.",
    },
  }),
};

} catch (error) {
  console.error("Interaction handler error:", error);

  return {
    statusCode: 500,
    body: "Internal Server Error",
  };
}
};