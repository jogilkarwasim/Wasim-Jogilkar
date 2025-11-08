import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from '../types';
import { decode, decodeAudioData } from './audioUtils';
import { AUDIO_NUM_CHANNELS, AUDIO_SAMPLE_RATE } from '../constants';

// The API key is assumed to be available from process.env.API_KEY.
// Do not generate UI for API key input.

const getGeminiClient = (): GoogleGenAI => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not set. Please ensure it's available in the environment.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Generates an image based on a text prompt using the Imagen 4.0 model.
 * @param prompt The text prompt for image generation.
 * @returns A base64 encoded image string or null if generation fails.
 */
export const generateStoryImage = async (prompt: string): Promise<string | null> => {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `Children's book illustration for: "${prompt}". Keep it simple and colorful, suitable for young kids.`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1', // Square image, good for general illustrations
      },
    });

    const base64ImageBytes: string = response.generatedImages[0]?.image?.imageBytes;
    if (base64ImageBytes) {
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};

/**
 * Generates speech from text using the Gemini TTS model.
 * @param text The text to convert to speech.
 * @param audioContext The AudioContext to decode the audio data.
 * @returns A Promise that resolves to an AudioBuffer containing the decoded speech.
 */
export const generateSpeech = async (text: string, audioContext: AudioContext): Promise<AudioBuffer | null> => {
  try {
    const ai = getGeminiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // A friendly voice for kids' stories
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioContext,
        AUDIO_SAMPLE_RATE,
        AUDIO_NUM_CHANNELS,
      );
      return audioBuffer;
    }
    return null;
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
};

/**
 * Interacts with the Gemini chat model to get a response.
 * @param history An array of previous chat messages to maintain conversation context.
 * @param newMessage The latest message from the user.
 * @returns A Promise that resolves to the model's response text.
 */
export const chatWithGemini = async (history: ChatMessage[], newMessage: string): Promise<string | null> => {
  try {
    const ai = getGeminiClient();
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are a friendly and helpful assistant for kids. Keep your answers simple, encouraging, and easy to understand. Avoid complex words and concepts. Use emojis sparingly to make it fun!",
      },
    });

    const chatHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model', // Ensure roles are 'user' or 'model'
      parts: [{ text: msg.text }],
    }));

    const response = await chat.sendMessage({
      message: newMessage,
      history: chatHistory,
    });
    return response.text;
  } catch (error) {
    console.error("Error chatting with Gemini:", error);
    // Attempt to extract specific error message for better feedback
    if (error instanceof Error) {
      return `Oops! Something went wrong: ${error.message}`;
    }
    return "Oops! Something went wrong while talking to Gemini.";
  }
};
