export const HIKARI_VOICES = [
  { name: 'Leda', label: 'Leda' },
  { name: 'Erinome', label: 'Erinome' },
  { name: 'Despina', label: 'Despina' },
  { name: 'Sulafat', label: 'Sulafat' },
];

export const YUI_VOICES = [
  { name: 'Autonoe', label: 'Autonoe' },
  { name: 'Laomedeia', label: 'Laomedeia' },
  { name: 'Callirrhoe', label: 'Callirrhoe' },
  { name: 'Zephyr', label: 'Zephyr' },
];

export const DEFAULT_HIKARI_VOICE = 'Leda';
export const DEFAULT_YUI_VOICE = 'Autonoe';

const STORAGE_KEY_YUI = 'vibe-news-yui-voice';
const STORAGE_KEY_HIKARI = 'vibe-news-hikari-voice';

export function loadSavedVoices() {
  return {
    yuiVoice: localStorage.getItem(STORAGE_KEY_YUI) || DEFAULT_YUI_VOICE,
    hikariVoice: localStorage.getItem(STORAGE_KEY_HIKARI) || DEFAULT_HIKARI_VOICE,
  };
}

export function saveVoiceChoice(speaker, voiceName) {
  const key = speaker === 'yui' ? STORAGE_KEY_YUI : STORAGE_KEY_HIKARI;
  localStorage.setItem(key, voiceName);
}
