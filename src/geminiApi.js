import { GoogleGenAI } from '@google/genai';
import {
  buildGeneralTopicPrompt,
  buildZennTopicPrompt,
  buildQiitaTopicPrompt,
  buildYoutubeTopicPrompt,
  buildTechCrunchTopicPrompt,
} from './prompts';

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
const TTS_MODEL = import.meta.env.VITE_TTS_MODEL || 'gemini-2.5-flash-preview-tts';

function getAi(apiKey) {
  return new GoogleGenAI({ apiKey });
}

export async function validateApiKey(apiKey) {
  const ai = getAi(apiKey);
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: 'Say OK',
  });
  return !!res.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function fetchSingleTopic(apiKey, prompt) {
  const ai = getAi(apiKey);
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('レスポンスが空です。');

  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) throw new Error('トピックが見つかりませんでした。');
    return parsed[0];
  }
  return parsed;
}

const TOPIC_SOURCES = [
  { key: 'general', label: '一般ニュース', promptFn: buildGeneralTopicPrompt },
  { key: 'zenn', label: 'Zenn', promptFn: buildZennTopicPrompt },
  { key: 'qiita', label: 'Qiita', promptFn: buildQiitaTopicPrompt },
  { key: 'youtube', label: 'YouTube', promptFn: buildYoutubeTopicPrompt },
  { key: 'techcrunch', label: 'TechCrunch', promptFn: buildTechCrunchTopicPrompt },
];

export async function fetchAllTopics(apiKey, previousTopics = [], reportHistory = []) {
  const results = await Promise.allSettled(
    TOPIC_SOURCES.map(async (source) => {
      const prompt = source.promptFn(previousTopics, reportHistory);
      const topic = await fetchSingleTopic(apiKey, prompt);
      return { ...topic, source: source.label };
    })
  );

  const topics = [];
  const failures = [];

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') {
      topics.push(results[i].value);
    } else {
      failures.push(TOPIC_SOURCES[i].label);
      console.warn(`[${TOPIC_SOURCES[i].label}] failed:`, results[i].reason?.message);
    }
  }

  if (topics.length === 0) {
    throw new Error('すべてのソースからトピック取得に失敗しました。もう一度お試しください。');
  }

  if (failures.length > 0) {
    console.warn(`取得失敗ソース: ${failures.join(', ')}`);
  }

  return topics;
}

export async function generateReport(apiKey, prompt) {
  const ai = getAi(apiKey);
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('レスポンスが空です。もう一度お試しください。');
  return text;
}

export async function generateScript(apiKey, prompt) {
  const ai = getAi(apiKey);
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('レスポンスが空です。もう一度お試しください。');
  return text;
}

function splitScriptIntoChunks(text, maxChars = 1000) {
  const lines = text.split('\n');
  const chunks = [];
  let current = '';

  for (const line of lines) {
    if (
      current.length + line.length > maxChars &&
      current.length > 0 &&
      /^(ゆい|ひかり):/.test(line)
    ) {
      chunks.push(current.trim());
      current = '';
    }
    current += line + '\n';
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function pcmToWav(pcmBase64, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const pcmBytes = Uint8Array.from(atob(pcmBase64), (c) => c.charCodeAt(0));
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const writeStr = (off, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, pcmBytes.length, true);
  return new Blob([wavHeader, pcmBytes], { type: 'audio/wav' });
}

function combinePcmBase64Chunks(base64Chunks) {
  const arrays = base64Chunks.map((b64) =>
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  );
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    combined.set(arr, offset);
    offset += arr.length;
  }
  const binaryStr = Array.from(combined)
    .map((byte) => String.fromCharCode(byte))
    .join('');
  return btoa(binaryStr);
}

export async function generateAudio(apiKey, ttsText, onProgress, voices = {}) {
  const ai = getAi(apiKey);
  const chunks = splitScriptIntoChunks(ttsText);
  const pcmChunks = [];

  const ttsConfig = {
    responseModalities: ['AUDIO'],
    speechConfig: {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          {
            speaker: 'ゆい',
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voices.yuiVoice || 'Autonoe' },
            },
          },
          {
            speaker: 'ひかり',
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voices.hikariVoice || 'Leda' },
            },
          },
        ],
      },
    },
  };

  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) {
      onProgress(`音声を録音中... (${i + 1}/${chunks.length})`);
    }

    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: chunks[i],
      config: ttsConfig,
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      throw new Error(`音声チャンク ${i + 1} の生成に失敗しました。`);
    }
    pcmChunks.push(audioData);
  }

  const combinedPcm =
    pcmChunks.length === 1 ? pcmChunks[0] : combinePcmBase64Chunks(pcmChunks);
  const blob = pcmToWav(combinedPcm);
  const url = URL.createObjectURL(blob);

  return { blob, url };
}
