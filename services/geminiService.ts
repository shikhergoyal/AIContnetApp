import { GoogleGenAI, Type } from '@google/genai';
import { CompetitorAnalysisResult, CompetitorInput } from '../types';
import { SYSTEM_INSTRUCTION_COMPETITOR } from '../constants';

const ai = new GoogleGenAI();

export async function performCompetitorAnalysis(
  myContent: string,
  competitors: CompetitorInput[],
  primaryKeyword: string,
  secondaryKeywords: string[]
): Promise<CompetitorAnalysisResult> {
  // Define a strict response schema using Type enums so Gemini returns a JSON object
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      strategicOverview: { type: Type.STRING },
      searchIntent: { type: Type.STRING },
      topRankingOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
      contentGaps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            importance: { type: Type.STRING },
            description: { type: Type.STRING },
            missingFrom: { type: Type.STRING },
          },
        },
      },
      linkableAssets: {
        type: Type.OBJECT,
        properties: {
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                reason: { type: Type.STRING },
                exampleFromCompetitor: { type: Type.STRING },
                competitorUrl: { type: Type.STRING },
              },
            },
          },
        },
      },
      actionPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
      competitorComparisons: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING },
            title: { type: Type.STRING },
            wordCount: { type: Type.NUMBER },
            topKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
      gscData: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING },
            clicks: { type: Type.NUMBER },
            impressions: { type: Type.NUMBER },
            ctr: { type: Type.NUMBER },
            position: { type: Type.NUMBER },
          },
        },
      },
      notes: { type: Type.STRING },
    },
  };

  // Build the prompt including client and competitor sections
  let prompt = `Primary keyword: ${primaryKeyword}\nSecondary keywords: ${secondaryKeywords.join(', ')}\n\nClient content:\n${myContent}\n\n`;
  competitors.forEach((c, i) => {
    prompt += `Competitor ${i + 1} - ${c.url}:\n${c.content}\n\n`;
  });

  prompt += `Tasks:\n1) Strategic Overview (2-3 short paragraphs)\n2) Analyze search intent and how it maps to content types\n3) Identify content gaps and rank by importance\n4) Suggest linkable assets based on competitor examples\n5) Produce a pragmatic action plan with prioritized steps and quick wins\n6) Provide competitor comparisons (title, word count estimate, top keywords)\n\nReturn the result as JSON that matches the schema.`;

  try {
    const result: any = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      systemInstruction: SYSTEM_INSTRUCTION_COMPETITOR,
      prompt,
      responseMimeType: 'application/json',
      responseSchema,
      // allow a longer response
      temperature: 0.0,
      maxOutputTokens: 2000,
    });

    // The SDK may return text in different shapes; try common locations
    const text =
      result?.output?.[0]?.content?.[0]?.text ?? result?.output_text ?? result?.text ?? null;
    if (!text) throw new Error('No text returned from Gemini');

    const parsed = JSON.parse(text) as CompetitorAnalysisResult;
    return parsed;
  } catch (err: any) {
    console.error('Gemini API error:', err);
    throw new Error(err?.message || 'Gemini API call failed');
  }
}
