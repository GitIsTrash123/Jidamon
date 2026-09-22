import { askGemini } from "./ai/gemini";

async function updateDiscordResponse(
  applicationId: string,
  interactionToken: string,
  content: string
) {
  const response = await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: content.slice(0, 2000),
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Discord response failed: ${response.status} ${errorText}`
    );
  }
}

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

    try {
      const answer = await askGemini(question);

      console.log("Gemini response generated successfully.", {
        length: answer.length,
      });

      await updateDiscordResponse(
        applicationId,
        interactionToken,
        answer
      );

      console.log("Discord response updated successfully.");
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const isQuotaError =
        error?.status === 429 ||
        errorMessage.includes('"code":429') ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.toLowerCase().includes("quota exceeded");

      if (isQuotaError) {
        console.error("Gemini quota exceeded.", {
          status: error?.status,
        });

        try {
          await updateDiscordResponse(
            applicationId,
            interactionToken,
            "Jidamon has reached its current daily AI usage limit. Please try again after the JDM quota resets."
          );
        } catch (discordError) {
          console.error(
            "Could not send the quota message to Discord:",
            discordError
          );
        }

        // Do not throw here. This marks the SQS message as handled
        // and prevents an endless retry loop.
        continue;
      }

      // Unexpected failures are thrown so SQS can retry them.
      console.error("Unexpected AI worker failure:", error);
      throw error;
    }
  }
};