import { input, select } from "@inquirer/prompts";
import OpenAI from "openai/index.mjs";
import type { JSONSchema } from "openai/lib/jsonschema.mjs";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

const client = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });

const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
  {
    role: "system",
    content:
      "You are a helpful AI assistant. You always speak the truth. Your name is Mafia codes. Always greet the user first by telling them who you are.",
  },
];

const WeatherSchema = z.object({
  city: z.string().describe("The city and state, e.g. San Francisco, CA"),
});

async function getWeather({
  city,
}: z.infer<typeof WeatherSchema>): Promise<string> {
  try {
    const response = await fetch(`https://wttr.in/${city}?format=j2`);
    if (!response.ok) {
      return "Unable to get weather";
    }
    const data = await response.json();
    return JSON.stringify(data.current_condition);
  } catch (error) {
    console.log(error.message);
    return "Unable to get weather";
  }
}

async function run(model: string) {
  const response = client.beta.chat.completions.runTools({
    model: model,
    messages: messages,
    tools: [
      {
        type: "function",
        function: {
          function: getWeather,
          description: "Useful for when you want to get the current weather.",
          parameters: zodToJsonSchema(WeatherSchema) as JSONSchema,
          parse: (input) => WeatherSchema.parse(JSON.parse(input)),
        },
      },
    ],
  });

  const finalContent = await response.finalContent();
  return finalContent;
}

async function main() {
  const model = await select({
    message: "Select GPT model",
    choices: [
      {
        name: "GPT 3.5 Turbo",
        value: "gpt-3.5-turbo",
        description: "Currently points to gpt-3.5-turbo-0125.",
      },
      {
        name: "GPT 4 Preview",
        value: "gpt-4-turbo-preview",
        description: "Currently points to gpt-4-0125-preview.",
      },
    ],
  });
  while (true) {
    const question = await input({ message: " 🤗 " });
    if (question === "q") {
      process.exit();
    }
    messages.push({ role: "user", content: question });
    const aiResponse = await run(model);
    console.log("  🤖 ", aiResponse);
    messages.push({ role: "assistant", content: aiResponse });
  }
}
main();
