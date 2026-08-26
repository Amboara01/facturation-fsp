import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SYSTEM_PROMPT, buildUserContent } from "./prompt.js";
import { TermSheetExtractionSchema } from "./schema.js";

const MODEL = "claude-opus-5";

export async function extractTermSheetFields(pdfBuffer, { anthropicClient = new Anthropic() } = {}) {
  const response = await anthropicClient.messages.parse({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserContent(pdfBuffer) }],
    output_config: { format: zodOutputFormat(TermSheetExtractionSchema) },
  });

  return response.parsed_output;
}
