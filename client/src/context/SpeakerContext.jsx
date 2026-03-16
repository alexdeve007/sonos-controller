import { createContext, useContext, useReducer, useCallback } from 'react';

const SpeakerContext = createContext(null);

const initialState = {
  speakers: [],
  groups: [],
  selectedSpeakerId: null,
  loading: false,
  error: null,
  toasts: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SPEAKERS':
      return { ...state, speakers: action.payload, loading: false };
    case 'SET_GROUPS':
      return { ...state, groups: action.payload };
    case 'SELECT_SPEAKER':
      return { ...state, selectedSpeakerId: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'UPDATE_SPEAKER': {
      const updated = state.speakers.map((s) =>
        s.id === action.payload.id ? { ...s, ...action.payload.data } : s
      );
      return { ...state, speakers: updated };
    }
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, { id: Date.now(), ...action.payload }] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };
    default:
      return state;
  }
}

export function SpeakerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    dispatch({ type: 'ADD_TOAST', payload: { message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 4000);
  }, []);

  return (
    <SpeakerContext.Provider value={{ state, dispatch, addToast }}>
      {children}
    </SpeakerContext.Provider>
  );
}

export function useSpeakerContext() {
  const ctx = useContext(SpeakerContext);
  if (!ctx) throw new Error('useSpeakerContext must be used within SpeakerProvider');
  return ctx;
}
