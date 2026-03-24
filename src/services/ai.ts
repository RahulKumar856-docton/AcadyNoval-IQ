import { GoogleGenAI, Type } from "@google/genai";

const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
};

const generateWithModelFallback = async (contents: string, config?: any) => {
  const genAI = getGenAIClient();
  const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"];
  let lastError: unknown;

  for (const model of candidateModels) {
    try {
      return await genAI.models.generateContent({ model, contents, config });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No compatible Gemini model available");
};

export const aiService = {
  generateQuiz: async (topic: string, count: number = 5, difficulty: string = 'Medium') => {
    const response = await generateWithModelFallback(
      `Generate a ${count}-question quiz about "${topic}" with a ${difficulty} difficulty level. Return it in JSON format.`,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-3)" }
                },
                required: ["text", "options", "correctAnswer"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    );

    return JSON.parse(response.text || "{}");
  },

  analyzeSubmissions: async (quizTitle: string, submissions: any[]) => {
    const prompt = `
      Analyze the following student submissions for the quiz "${quizTitle}".
      Rank the students based on a combination of accuracy and speed (lower time is better).
      Provide a summary of the top performers and any general insights about the class performance.
      
      Submissions:
      ${JSON.stringify(submissions.map(s => ({
        name: s.student_name,
        score: s.score,
        timeTaken: s.time_taken,
        accuracy: s.accuracy
      })))}
      
      Return the analysis in a clear, professional format.
    `;

    const response = await generateWithModelFallback(prompt);

    return response.text;
  }
};
