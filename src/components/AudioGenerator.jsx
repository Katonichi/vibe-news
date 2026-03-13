import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, Play, Pause, Download, Volume2, VolumeX,
  RotateCcw, Sparkles, ChevronDown,
} from 'lucide-react';
import { generateAudio } from '../geminiApi';
import { buildTtsPrefix } from '../prompts';
import { scriptToTtsText, downloadFile, formatDate, formatTime } from '../utils';
import { autoSave } from '../saveUtils';
import {
  HIKARI_VOICES, YUI_VOICES,
  loadSavedVoices, saveVoiceChoice,
} from '../voiceConfig';
import LoadingIndicator from './LoadingIndicator';
import ErrorMessage from './ErrorMessage';
import SaveIndicator from './SaveIndicator';

function WaveformDecoration() {
  return (
    <div className="flex items-end gap-1 h-8">
      {Array.from({ length: 20 }).map((_, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-indigo-500 to-violet-500 animate-pulse"
          style={{
            height: `${Math.random() * 100}%`,
            animationDelay: `${i * 80}ms`,
            animationDuration: `${800 + Math.random() * 400}ms`,
          }}
        />
      ))}
    </div>
  );
}

function VoiceSelector({ label, color, voices, value, onChange }) {
  const colorClasses = {
    pink: {
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      text: 'text-pink-400',
      ring: 'focus:ring-pink-500/50',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      text: 'text-cyan-400',
      ring: 'focus:ring-cyan-500/50',
    },
  };
  const c = colorClasses[color];

  return (
    <div className={`flex-1 rounded-xl p-4 ${c.bg} border ${c.border}`}>
      <p className={`text-sm font-bold ${c.text} mb-3`}>{label}</p>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none px-4 py-2.5 pr-10 bg-slate-800/80 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 ${c.ring} focus:border-transparent transition-all cursor-pointer`}
        >
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}

export default function AudioGenerator({ state, dispatch, ActionTypes, onResetApiKey }) {
  const {
    apiKey, currentTopic, script, audioUrl, audioBlob,
    isLoading, loadingMessage, error, reportTimestamp,
  } = state;

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [generationStarted, setGenerationStarted] = useState(false);
  const [saveResults, setSaveResults] = useState(null);

  const savedVoices = loadSavedVoices();
  const [yuiVoice, setYuiVoice] = useState(savedVoices.yuiVoice);
  const [hikariVoice, setHikariVoice] = useState(savedVoices.hikariVoice);

  const handleYuiVoiceChange = (voice) => {
    setYuiVoice(voice);
    saveVoiceChoice('yui', voice);
  };

  const handleHikariVoiceChange = (voice) => {
    setHikariVoice(voice);
    saveVoiceChoice('hikari', voice);
  };

  const handleGenerate = useCallback(async () => {
    setGenerationStarted(true);
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    dispatch({
      type: ActionTypes.SET_LOADING,
      payload: { isLoading: true, message: '音声を録音中...' },
    });

    try {
      const plainText = scriptToTtsText(script);
      const ttsInput = buildTtsPrefix() + plainText;
      const voices = { yuiVoice, hikariVoice };
      const { blob, url } = await generateAudio(apiKey, ttsInput, (msg) => {
        dispatch({
          type: ActionTypes.SET_LOADING,
          payload: { isLoading: true, message: msg },
        });
      }, voices);
      dispatch({ type: ActionTypes.SET_AUDIO, payload: { blob, url } });

      if (reportTimestamp) {
        const slug = currentTopic.title.replace(/\s+/g, '_').slice(0, 30);
        const results = await autoSave(reportTimestamp, `vibe_news_${formatDate()}_${slug}.wav`, blob);
        setSaveResults(results);
      }
    } catch (err) {
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: `音声生成に失敗しました: ${err.message}`,
      });
    } finally {
      dispatch({
        type: ActionTypes.SET_LOADING,
        payload: { isLoading: false, message: '' },
      });
    }
  }, [apiKey, script, yuiVoice, hikariVoice, reportTimestamp, currentTopic, dispatch, ActionTypes]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const value = parseFloat(e.target.value);
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const handleVolumeChange = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const val = parseFloat(e.target.value);
    audio.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume || 1;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const handleDownload = () => {
    if (!audioBlob) return;
    downloadFile(audioBlob, `vibe_news_${formatDate()}.wav`, 'audio/wav');
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    dispatch({ type: ActionTypes.RESET });
  };

  if (!generationStarted && !audioUrl) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Mic className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">音声生成</h2>
            <p className="text-sm text-slate-400">ボイスを選んで番組を収録</p>
          </div>
        </div>

        <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg px-4 py-2 mb-6 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
          <p className="text-sm text-violet-300 truncate">
            <span className="font-semibold">トピック: </span>
            {currentTopic.title}
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">ボイス設定</h3>
          <div className="flex gap-3">
            <VoiceSelector
              label="ゆい（聞き手）"
              color="pink"
              voices={YUI_VOICES}
              value={yuiVoice}
              onChange={handleYuiVoiceChange}
            />
            <VoiceSelector
              label="ひかり（解説者）"
              color="cyan"
              voices={HIKARI_VOICES}
              value={hikariVoice}
              onChange={handleHikariVoiceChange}
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Mic className="w-4 h-4" />
          録音開始
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <Mic className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">音声生成</h2>
          <p className="text-sm text-slate-400">AIが番組を収録します</p>
        </div>
      </div>

      <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg px-4 py-2 mb-6 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
        <p className="text-sm text-violet-300 truncate">
          <span className="font-semibold">トピック: </span>
          {currentTopic.title}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <LoadingIndicator message={loadingMessage} />
          <WaveformDecoration />
        </div>
      ) : error && !audioUrl ? (
        <ErrorMessage message={error} onRetry={handleGenerate} onResetApiKey={onResetApiKey} />
      ) : audioUrl ? (
        <div className="space-y-4">
          <audio ref={audioRef} src={audioUrl} preload="metadata" />

          <div className="bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-white/10 rounded-xl p-5 space-y-4">
            <WaveformDecoration />

            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center transition-all shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              <div className="flex-1 space-y-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>

          <SaveIndicator results={saveResults} />

          {error && <ErrorMessage message={error} onRetry={handleGenerate} onResetApiKey={onResetApiKey} />}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              音声をダウンロード
            </button>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4" />
              最初からやり直す
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
