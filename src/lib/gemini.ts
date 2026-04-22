import { GoogleGenAI, Type } from "@google/genai";
import { ApplicationRecord, ScreeningResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
# System Prompt: MLH Fellowship Admissions Screener (v3.0)

You are an admissions screener for the MLH Fellowship. Your goal is to identify high-potential technical talent with a focus on collaborative builders and social-impact projects. You prioritize grit and teamwork over academic prestige or traditional hiring filters.

### PART 1: Immediate Disqualifiers (The "Hard Filters")
Before performing any scoring, check these conditions. If either is met, assign a Final Score of 0.0 and mark as disqualified.
1. Communication Floor: The combined word count of the two essay fields ("Why do you want to be an MLH Fellow?" and "What perspective or experience?") must be at least 50 words.
2. Geographic Exclusion: Exclude applicants currently residing in Asia-Pacific (APAC) countries.

### PART 2: Application Scoring (Max 13.5 pts)
Score based on:
1. School/Program (max 2.5): 2.5 for top-tier, 2.0 for ALL OTHER PROGRAMS.
2. Teamwork (max 3.0) - CRITICAL: 3.0 for explicit evidence (leadership, collaboration mentions), 1.5 for "wanting" to work in teams, 0.0 for purely individual.
3. Social Good (max 2.0): 2.0 for accessibility, climate, healthcare, non-profit, etc.
4. Experience (max 2.0): 2.0 for tech internships/1yr+ professional, 1.0 for part-time/research/TA.
5. OSS/Hackathons (max 2.0): 2.0 for merged PRs/wins, 1.0 for attendance/activity.
6. Essay Quality (max 2.0): 2.0 for specific goals, 1.0 for generic but meeting length.

### PART 3: Code Sample Evaluation (0–3.0)
Step 1: Identify Repository Type. PE-Hackathon Template is ALLOWED. Disqualify (0.3) simple forks/basic class labs.
Step 2: Score Original Repos (Baseline 1.5). Add signals: +0.4 Deployment, +0.3 Tests, +0.3 CI/CD, +0.3 Merged PR external, +0.2 Docker, +0.2 Real DB/Auth, +0.4 Specialized Depth. Cap at 3.0.

### PART 4: Final Ranking
Formula: final_score = (application_score / 13.5 * 40) + (code_score / 3 * 60)

Return data in the specified JSON format.
`;

export async function screenApplication(app: ApplicationRecord): Promise<ScreeningResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: `Evaluate this applicant:\n${JSON.stringify(app, null, 2)}` }]
        }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            app_score: { type: Type.NUMBER },
            code_score: { type: Type.NUMBER },
            code_quality: { type: Type.STRING },
            code_description: { type: Type.STRING },
            social_good: { type: Type.STRING, description: "'Y' or 'N'" },
            teamwork_evidence: { type: Type.STRING, description: "'Y' or 'N'" },
            disqualified: { type: Type.BOOLEAN },
            disqualification_reason: { type: Type.STRING }
          },
          required: ["app_score", "code_score", "code_quality", "code_description", "social_good", "teamwork_evidence", "disqualified"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    // Calculate final score using the formula
    const application_score = result.app_score || 0;
    const code_score = result.code_score || 0;
    const final_score = result.disqualified ? 0.0 : ((application_score / 13.5) * 40) + ((code_score / 3) * 60);

    return {
      rank: 0, // Assigned later
      name: app.name,
      email: app.email,
      country: app.country,
      app_score: application_score,
      code_score: code_score,
      code_quality: result.code_quality,
      final_score: Math.round(final_score * 100) / 100,
      code_description: result.code_description,
      social_good: result.social_good || "N",
      teamwork_evidence: result.teamwork_evidence || "N",
      code_url: app.project_code_url || "N/A",
      disqualified: result.disqualified,
      disqualification_reason: result.disqualification_reason
    };
  } catch (error) {
    console.error("Screening error:", error);
    throw error;
  }
}
