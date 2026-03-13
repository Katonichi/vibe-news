export const initialState = {
  phase: 0,
  apiKey: '',
  topics: [],
  currentTopic: null,
  previousTopics: [],
  report: '',
  scriptLength: null,
  script: '',
  audioUrl: null,
  audioBlob: null,
  isLoading: false,
  loadingMessage: '',
  error: null,
  reportTimestamp: null,
  saveDirName: null,
};

export const ActionTypes = {
  SET_API_KEY: 'SET_API_KEY',
  SET_PHASE: 'SET_PHASE',
  SET_TOPICS: 'SET_TOPICS',
  SET_TOPIC: 'SET_TOPIC',
  ADD_PREVIOUS_TOPICS: 'ADD_PREVIOUS_TOPICS',
  SET_REPORT: 'SET_REPORT',
  SET_SCRIPT_LENGTH: 'SET_SCRIPT_LENGTH',
  SET_SCRIPT: 'SET_SCRIPT',
  SET_AUDIO: 'SET_AUDIO',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_REPORT_TIMESTAMP: 'SET_REPORT_TIMESTAMP',
  SET_SAVE_DIR_NAME: 'SET_SAVE_DIR_NAME',
  RESET: 'RESET',
};

export function reducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_API_KEY:
      return { ...state, apiKey: action.payload };

    case ActionTypes.SET_PHASE:
      return { ...state, phase: action.payload, error: null };

    case ActionTypes.SET_TOPICS:
      return { ...state, topics: action.payload, currentTopic: null };

    case ActionTypes.SET_TOPIC:
      return { ...state, currentTopic: action.payload };

    case ActionTypes.ADD_PREVIOUS_TOPICS:
      return {
        ...state,
        previousTopics: [...state.previousTopics, ...action.payload],
      };

    case ActionTypes.SET_REPORT:
      return { ...state, report: action.payload };

    case ActionTypes.SET_SCRIPT_LENGTH:
      return { ...state, scriptLength: action.payload };

    case ActionTypes.SET_SCRIPT:
      return { ...state, script: action.payload };

    case ActionTypes.SET_AUDIO:
      return {
        ...state,
        audioUrl: action.payload.url,
        audioBlob: action.payload.blob,
      };

    case ActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.isLoading,
        loadingMessage: action.payload.message || '',
      };

    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false, loadingMessage: '' };

    case ActionTypes.SET_REPORT_TIMESTAMP:
      return { ...state, reportTimestamp: action.payload };

    case ActionTypes.SET_SAVE_DIR_NAME:
      return { ...state, saveDirName: action.payload };

    case ActionTypes.RESET:
      return {
        ...initialState,
        apiKey: state.apiKey,
        saveDirName: state.saveDirName,
        phase: 1,
      };

    default:
      return state;
  }
}
