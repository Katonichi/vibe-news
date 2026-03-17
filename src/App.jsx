import { useReducer, useEffect, useCallback } from 'react';
import { reducer, initialState, ActionTypes } from './reducer';
import { restoreSaveDirectory } from './fileStorage';
import Header from './components/Header';
import Footer from './components/Footer';
import StepIndicator from './components/StepIndicator';
import ModeSelector from './components/ModeSelector';
import ApiSetup from './components/ApiSetup';
import TopicFinder from './components/TopicFinder';
import ReportGenerator from './components/ReportGenerator';
import ScriptGenerator from './components/ScriptGenerator';
import AudioGenerator from './components/AudioGenerator';
import NewspaperTopicCollector from './newspaper/NewspaperTopicCollector';
import SlotAssigner from './newspaper/SlotAssigner';
import NewspaperArticleGenerator from './newspaper/NewspaperArticleGenerator';
import NewspaperPreview from './newspaper/NewspaperPreview';

const STORAGE_KEY = 'vibe-news-api-key';

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    const key = saved || envKey || '';
    if (key) {
      dispatch({ type: ActionTypes.SET_API_KEY, payload: key });
    }

    restoreSaveDirectory().then((name) => {
      if (name) {
        dispatch({ type: ActionTypes.SET_SAVE_DIR_NAME, payload: name });
      }
    });
  }, []);

  const handleResetApiKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: ActionTypes.SET_API_KEY, payload: '' });
    dispatch({ type: ActionTypes.SET_PHASE, payload: 0 });
  };

  const handleModeSelect = useCallback((mode) => {
    dispatch({ type: ActionTypes.SET_MODE, payload: mode });
    dispatch({ type: ActionTypes.SET_PHASE, payload: 2 });
  }, []);

  const handleModeChange = useCallback((newMode) => {
    dispatch({ type: ActionTypes.SET_MODE, payload: newMode });
    dispatch({ type: ActionTypes.SET_PHASE, payload: 2 });
  }, []);

  const renderPodcastPhase = () => {
    switch (state.phase) {
      case 2:
        return (
          <TopicFinder
            state={state}
            dispatch={dispatch}
            ActionTypes={ActionTypes}
            onResetApiKey={handleResetApiKey}
          />
        );
      case 3:
        return (
          <ReportGenerator
            state={state}
            dispatch={dispatch}
            ActionTypes={ActionTypes}
            onResetApiKey={handleResetApiKey}
          />
        );
      case 4:
        return (
          <ScriptGenerator
            state={state}
            dispatch={dispatch}
            ActionTypes={ActionTypes}
            onResetApiKey={handleResetApiKey}
          />
        );
      case 5:
        return (
          <AudioGenerator
            state={state}
            dispatch={dispatch}
            ActionTypes={ActionTypes}
            onResetApiKey={handleResetApiKey}
          />
        );
      default:
        return null;
    }
  };

  const renderNewspaperPhase = () => {
    switch (state.phase) {
      case 2:
        return (
          <NewspaperTopicCollector
            state={state}
            dispatch={dispatch}
            ActionTypes={ActionTypes}
            onResetApiKey={handleResetApiKey}
          />
        );
      case 3:
        return (
          <SlotAssigner
            state={state}
            dispatch={dispatch}
            ActionTypes={ActionTypes}
            onResetApiKey={handleResetApiKey}
          />
        );
      case 4:
        return (
          <NewspaperArticleGenerator
            state={state}
            dispatch={dispatch}
            ActionTypes={ActionTypes}
            onResetApiKey={handleResetApiKey}
          />
        );
      case 5:
        return (
          <NewspaperPreview
            state={state}
            dispatch={dispatch}
            ActionTypes={ActionTypes}
            onResetApiKey={handleResetApiKey}
          />
        );
      default:
        return null;
    }
  };

  const renderPhase = () => {
    if (state.phase === 0) {
      return (
        <ApiSetup
          dispatch={dispatch}
          ActionTypes={ActionTypes}
          saveDirName={state.saveDirName}
        />
      );
    }

    if (state.phase === 1 || !state.mode) {
      return <ModeSelector onSelect={handleModeSelect} />;
    }

    if (state.mode === 'newspaper') {
      return renderNewspaperPhase();
    }

    return renderPodcastPhase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col">
      <Header mode={state.mode} onModeChange={state.phase >= 2 ? handleModeChange : null} />
      <div className="max-w-5xl w-full mx-auto px-4">
        <StepIndicator currentPhase={state.phase} mode={state.mode} />
      </div>
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="max-w-3xl w-full">{renderPhase()}</div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
