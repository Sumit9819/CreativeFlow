import { GoogleGenAI } from "@google/genai";
import { Comment, User, Project, AssetStatus } from '../types';

// Safely initialize the AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeFeedback = async (
  comments: Comment[], 
  users: User[],
  assetTitle: string
): Promise<string> => {
  if (comments.length === 0) return "No comments to summarize.";

  const commentText = comments.map(c => {
    const user = users.find(u => u.id === c.userId);
    const author = user ? `${user.name} (${user.role})` : 'Unknown';
    const status = c.resolved ? '[RESOLVED]' : '[OPEN]';
    return `- ${author} said: "${c.text}" ${status}`;
  }).join('\n');

  const prompt = `
    You are a creative project manager assistant. 
    Review the following comments for the creative asset "${assetTitle}".
    Provide a concise, bulleted summary of the requested changes, grouped by "Critical Changes" (from clients/approvers) and "Minor Tweaks".
    Ignore resolved comments unless they provide context for open issues.
    
    Comments:
    ${commentText}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to connect to AI service.";
  }
};

export const suggestReply = async (commentText: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a professional, polite, and concise reply to a client who said: "${commentText}". The reply should acknowledge the feedback and promise action.`,
        });
        return response.text || "";
    } catch (e) {
        return "";
    }
}

export const generateProjectReport = async (project: Project): Promise<string> => {
    const assetSummary = project.assets.map(a => 
        `- ${a.title}: ${a.status} (V${a.versions.length})`
    ).join('\n');

    const prompt = `
        Generate a professional status report for the project "${project.name}" for client "${project.clientName}".
        
        Asset Statuses:
        ${assetSummary}

        The report report should be brief (max 100 words), highlighting progress and what needs attention. Use a professional tone suitable for a creative agency.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Report generation failed.";
    } catch (e) {
        return "Failed to generate report.";
    }
}