import { askGemini } from "./ai/gemini";

export const handler = async (event: any) => {
  console.log("Jidamon AI Worker received batch:", {
    records: event.Records?.length ?? 0,
  });

  for (const record of event.Records ?? []) {
    const message = JSON.parse(record.body);

    const question = message.question;
    const applicationId = message.applicationId;
    const interactionToken = message.interactionToken;

    if (!question || !applicationId || !interactionToken) {
      console.error("Worker message missing required fields.");
      continue;
    }

    const answer = await askGemini(question);

    console.log("Gemini response generated successfully.", {
      length: answer.length,
    });

    const discordResponse = await fetch(
      `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: answer.slice(0, 2000),
        }),
      }
    );

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();

      throw new Error(
        `Discord response failed: ${discordResponse.status} ${errorText}`
      );
    }

    console.log("Discord response updated successfully.");
  }
};