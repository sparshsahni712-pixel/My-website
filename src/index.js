const SYSTEM_PROMPT = `
You are an advanced AI Website Builder.

Your task is to generate complete websites from user prompts.

Requirements:
- Create modern, professional websites.
- Use responsive HTML, CSS and JavaScript.
- Include functional navigation and buttons.
- Make designs mobile-friendly.
- Generate all necessary website files.
- Do not return explanations.

Return valid JSON in this exact format:

{
  "files": [
    {
      "path": "index.html",
      "content": "<!DOCTYPE html>..."
    },
    {
      "path": "style.css",
      "content": "..."
    },
    {
      "path": "script.js",
      "content": "..."
    }
  ]
}
`;

export default {
  async fetch(request, env) {

    const origin = env.ALLOWED_ORIGIN || "*";

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return Response.json(
        { success: false, error: "Method not allowed" },
        { status: 405, headers }
      );
    }

    try {

      if (!env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key is missing.");
      }

      const body = await request.json();
      const prompt = body.prompt;

      if (
        typeof prompt !== "string" ||
        !prompt.trim() ||
        prompt.length > 10000
      ) {
        return Response.json(
          { success: false, error: "Invalid website prompt." },
          { status: 400, headers }
        );
      }

      const response = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            model: env.OPENAI_MODEL || "gpt-6.2-sol",

            instructions: SYSTEM_PROMPT,

            input: prompt,

            max_output_tokens: 12000,

            text: {
              format: {
                type: "json_schema",
                name: "website_files",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    files: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          path: { type: "string" },
                          content: { type: "string" }
                        },
                        required: ["path", "content"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["files"],
                  additionalProperties: false
                }
              }
            }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return Response.json(
          {
            success: false,
            error: data.error?.message || "OpenAI API error"
          },
          { status: response.status, headers }
        );
      }

      const output = (data.output || [])
        .filter(item => item.type === "message")
        .flatMap(item => item.content || [])
        .filter(item => item.type === "output_text")
        .map(item => item.text)
        .join("");

      if (!output) {
        throw new Error("AI returned an empty response.");
      }

      const result = JSON.parse(output);

      if (
        !Array.isArray(result.files) ||
        result.files.length === 0 ||
        result.files.length > 30
      ) {
        throw new Error("Invalid website files generated.");
      }

      for (const file of result.files) {
        if (
          typeof file.path !== "string" ||
          typeof file.content !== "string" ||
          file.path.startsWith("/") ||
          file.path.split("/").includes("..")
        ) {
          throw new Error("Invalid generated file.");
        }
      }

      return Response.json({
        success: true,
        files: result.files,
        message: "Website generated successfully!"
      }, { headers });

    } catch (error) {

      return Response.json({
        success: false,
        error: error.message
      }, {
        status: 500,
        headers
      });

    }
  }
};
