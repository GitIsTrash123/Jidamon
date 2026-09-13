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

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  });

  return response.text ?? "Jidamon did not receive a response from Gemini.";
}