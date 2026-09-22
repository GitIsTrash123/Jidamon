import { GoogleGenAI } from "@google/genai";
import {
  SSMClient,
  GetParameterCommand,
} from "@aws-sdk/client-ssm";

const ssm = new SSMClient({
  region: "us-east-1",
});

let cachedApiKey: string | null = null;

async function getGeminiApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  const response = await ssm.send(
    new GetParameterCommand({
      Name: "/jidamon/gemini/api-key",
      WithDecryption: true,
    })
  );

  const apiKey = response.Parameter?.Value;

  if (!apiKey) {
    throw new Error("Gemini API key was not found in Parameter Store.");
  }

  cachedApiKey = apiKey;
  return apiKey;
}

export async function askGemini(prompt: string): Promise<string> {
  const apiKey = await getGeminiApiKey();

  const ai = new GoogleGenAI({
    apiKey,
  });

 const models = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash-lite",
];

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Trying ${model}, attempt ${attempt}`);

        const response = await ai.models.generateContent({
  model,
  contents: prompt,
  config: {
    systemInstruction: `
You are Jidamon, an AI-powered Discord assistant created as a Computer Science capstone project.

Your purpose is to help Discord users by answering questions clearly, accurately, and concisely.

You operate through Discord slash commands and use artificial intelligence to generate responses.

When asked who or what you are, identify yourself as Jidamon.

Do not introduce yourself as Gemini or as Google's AI. Gemini is the AI service used behind Jidamon, not Jidamon's identity.

Be helpful, conversational, and professional.
    `,
  },
});

        return (
          response.text ??
          "Jidamon did not receive a response from Gemini."
        );
      } catch (error: any) {
        console.error(`${model} attempt ${attempt} failed:`, {
          status: error?.status,
          message: error?.message,
        });

        const isTemporaryError =
          error?.status === 503 ||
          error?.status === 429;

        if (!isTemporaryError) {
          throw error;
        }

        if (attempt < 2) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1500)
          );
        }
      }
    }
  }

  return "Jidamon's service is temporarily busy. Please try again in a moment.";
}