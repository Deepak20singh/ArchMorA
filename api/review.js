import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    const { prompt } = req.body;

    const genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    );

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const result = await model.generateContent(prompt);

    return res.status(200).json({
      response: result.response.text()
    });

  } catch (err) {

    console.error("FULL ERROR:", err);

    return res.status(500).json({
      message: err.message,
      stack: err.stack
    });
  }
}