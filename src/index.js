const SYSTEM_PROMPT = `You are an expert web designer and frontend developer.
Create a complete, polished, responsive website based on the user's request.
Return ONLY a complete standalone HTML document beginning with <!doctype html>.
Put all CSS in a <style> tag and any JavaScript in a <script> tag.
Do not use markdown fences, explanations, external build tools, or React.
Use accessible semantic HTML, responsive layouts, realistic copy, and attractive visual design.
Do not include API keys, secret values, or server-side code.
If the user asks for a business website, include appropriate sections and clear calls to action.`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options) {
  let lastResponse;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, options);
      if (![429, 500, 502, 503, 504].includes(response.status)) return response;
      lastResponse = response;
    } catch (error) {
      if (attempt === 2) throw error;
    }
    if (attempt < 2) await sleep(500 * (2 ** attempt));
  }
  return lastResponse;
}

async function callGemini(prompt, env) {
  if (!env.GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600000
        
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Gemini returned HTTP ${response.status}`);
  const candidate = data.candidates?.[0];
  const result = candidate?.content?.parts?.filter(p => !p.thought).map(p => p.text || "").join("\n");
  if (!result) throw new Error(data.promptFeedback?.blockReason ? `Prompt blocked: ${data.promptFeedback.blockReason}` : "Gemini returned an empty response.");
  if (candidate.finishReason === "MAX_TOKENS") throw new Error("The website was too long and got cut off. Try a simpler prompt.");
  return result;
}

function cleanHtml(value) {
  let text = value.trim();
  const start = text.search(/<!doctype html|<html[\s>]/i);
  if (start > 0) text = text.slice(start);
  const end = text.toLowerCase().lastIndexOf("</html>");
  if (end !== -1) text = text.slice(0, end + 7);
  return text.trim();
}

async function generate(request, env) {
  const body = await request.json().catch(() => null);
  const prompt = body?.prompt?.trim();

  if (!prompt || prompt.length < 5) return json({ error: "Please enter a more detailed website prompt." }, 400);
  if (prompt.length > 6000) return json({ error: "Prompt is too long. Keep it under 6,000 characters." }, 400);

  try {
    const output = await callGemini(prompt, env);
    const html = cleanHtml(output);
    if (!/^<!doctype html|^<html[\s>]/i.test(html)) {
      throw new Error("The AI response was not a complete HTML document. Please try again.");
    }
    return json({ html, provider: "gemini", message: "Website generated with Gemini." });
  } catch (error) {
    return json({
      error: `Could not generate the website: ${error.message}`
    }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/generate" && request.method === "POST") {
      return generate(request, env);
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "API route not found." }, 404);
    return env.ASSETS.fetch(request);
  }
};
