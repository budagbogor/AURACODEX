/**
 * Layanan Micro-Predictive Autocomplete (Ghost Text Engine)
 * Membangkitkan kode sambungan yang sangat cepat.
 */
export async function fetchPredictiveCompletion(
  prefix: string,
  suffix: string,
  language: string,
  apiKey: string
): Promise<string> {
  if (!apiKey || prefix.trim().length < 5) return '';

  const prompt = `You are a strict autocomplete Ghost Text AI.
Your job is to provide EXACTLY the missing text at the cursor position (between PREFIX and SUFFIX) to complete the logic.
 DO NOT wrap in markdown \`\`\`. DO NOT explain. DO NOT duplicate existing code.
--- PREFIX ---
${prefix}
--- SUFFIX ---
${suffix}
--- OUTPUT ONLY THE MISSING INSERT TEXT:`;

  try {
    // Kita gunakan model kilat (Gemini Flash atau Claude Haiku) dari OpenRouter
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/budagbogor/aura-ide',
        'X-Title': 'AURA Predictor'
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", 
        messages: [{ role: "user", content: prompt }],
        max_tokens: 30, // Sangat kecil agar kilat
        temperature: 0.1
      })
    });
    
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.replace(/^\`\`\`[\w]*\n/, '').replace(/\n\`\`\`$/, '').trim() || '';
  } catch (e) {
    return '';
  }
}
