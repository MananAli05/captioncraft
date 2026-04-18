export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { base64Data, mimeType } = req.body;

  if (!base64Data || !mimeType) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  // Read the Gemini API Key from Vercel Environment Variables
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: Missing GEMINI_API_KEY environment variable.' });
  }

  try {
    const payload = {
      contents: [{
        parts: [
          { text: "Write a short, engaging, clean and highly descriptive caption for this image. Just return the caption text." },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }]
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Failed To Fetch From API");
    }

    const data = await response.json();
    const rawCaption = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawCaption) {
      throw new Error("Caption Generation Returned Empty.");
    }

    // Return the successful caption to the frontend
    return res.status(200).json({ caption: rawCaption });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
