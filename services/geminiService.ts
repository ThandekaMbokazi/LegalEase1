
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { AnalysisResult } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeDocument(base64Data: string, mimeType: string, targetLanguage: string = 'English'): Promise<AnalysisResult> {
    try {
      const prompt = `
        You are an expert legal and policy analyst for LegalEase. 
        CRITICAL STEP: First, determine if the provided document is a Legal document, Government policy, Official notice, or Legal contract.
        
        If the document is NOT related to law, government policy, or official legal frameworks, set "isValidDomain" to false and provide a helpful "domainError" message.
        
        If it IS a valid legal/policy document:
        1. Set "isValidDomain" to true.
        2. Extract the "fullText" of the document as accurately as possible (OCR/Raw Text).
        3. Analyze and extract: summary, risks, deadlines, parties, and obligations.
        4. Provide a "Plain English" simplified explanation.
        5. Suggest 3-5 short organizational tags.
        
        LANGUAGE REQUIREMENT: 
        You MUST provide the "summary", "risks", "deadlines.description", "obligations", and "simplifiedExplanation" in ${targetLanguage}. 
      `;

      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValidDomain: { type: Type.BOOLEAN },
              domainError: { type: Type.STRING },
              fullText: { type: Type.STRING },
              summary: { type: Type.STRING },
              risks: { type: Type.ARRAY, items: { type: Type.STRING } },
              deadlines: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: {
                    date: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["date", "description"]
                }
              },
              keyParties: { type: Type.ARRAY, items: { type: Type.STRING } },
              obligations: { type: Type.ARRAY, items: { type: Type.STRING } },
              simplifiedExplanation: { type: Type.STRING },
              suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["isValidDomain", "fullText", "summary", "risks", "deadlines", "keyParties", "obligations", "simplifiedExplanation", "suggestedTags"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error("Analysis service error:", e);
      throw new Error("LegalEase could not process this document. Please ensure it is a clear PDF or image.");
    }
  }

  async translateAnalysis(currentAnalysis: AnalysisResult, targetLanguage: string): Promise<AnalysisResult> {
    const prompt = `
      As a legal translator for LegalEase, translate this document analysis into ${targetLanguage}.
      Maintain legal intent while ensuring accessibility.
      Only translate: "summary", "risks", "deadlines.description", "obligations", and "simplifiedExplanation".
      
      Analysis: ${JSON.stringify(currentAnalysis)}
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValidDomain: { type: Type.BOOLEAN },
            domainError: { type: Type.STRING },
            fullText: { type: Type.STRING },
            summary: { type: Type.STRING },
            risks: { type: Type.ARRAY, items: { type: Type.STRING } },
            deadlines: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: {
                  date: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["date", "description"]
              }
            },
            keyParties: { type: Type.ARRAY, items: { type: Type.STRING } },
            obligations: { type: Type.ARRAY, items: { type: Type.STRING } },
            simplifiedExplanation: { type: Type.STRING },
            suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["isValidDomain", "fullText", "summary", "risks", "deadlines", "keyParties", "obligations", "simplifiedExplanation", "suggestedTags"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  }

  async generateLegalDraft(type: string, details: string, targetLanguage: string = 'English'): Promise<string> {
    const prompt = `
      Draft a formal, professional ${type} based on the following details: ${details}.
      Ensure the language is legally sound and follows professional structure.
      The entire document MUST be written in ${targetLanguage}.
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 1000 }
      }
    });

    return response.text || "";
  }

  async generateVisualAid(concept: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: `Create a professional, minimalist conceptual vector illustration representing this legal duty: "${concept}". Style: Bauhaus-inspired, clean lines, muted professional colors (navy, cream, gold). No text.` }
          ]
        },
        config: {
          imageConfig: { aspectRatio: "16:9" }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return "";
    } catch (e) {
      console.warn("Visual aid failed", e);
      return ""; 
    }
  }

  async verifyOnWeb(topic: string): Promise<any[]> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for recent legal updates or case law regarding: ${topic}. Provide URLs.`,
      config: {
        tools: [{ googleSearch: {} }]
      },
    });
    
    return response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  }

  async generateSpeech(text: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `LegalEase Summary: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  }

  async askQuestion(question: string, documentContext: string, history: any[], targetLanguage: string = 'English'): Promise<string> {
    const chat = this.ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are LegalEase Assistant. Answer questions based on this analyzed document context: ${documentContext}. Maintain professional legal tone but keep it accessible. Answer in ${targetLanguage}.`,
      }
    });

    const response = await chat.sendMessage({ message: question });
    return response.text || "I'm sorry, I couldn't generate a response.";
  }
}
