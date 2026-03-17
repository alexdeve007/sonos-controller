import { useEffect, useRef, useCallback } from 'react';
import { getSpeakers, getGroups } from '../api';
import { useSpeakerContext } from '../context/SpeakerContext';

export function useSpeakers(pollInterval = 3000) {
  const { dispatch, setRefreshFn } = useSpeakerContext();
  const intervalRef = useRef(null);
  const pollRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const [speakers, groups] = await Promise.all([getSpeakers(), getGroups()]);
      dispatch({ type: 'SET_SPEAKERS', payload: speakers });
      dispatch({ type: 'SET_GROUPS', payload: groups });
    } catch (err) {
      // Silently fail on poll
    }
  }, [dispatch]);

  pollRef.current = poll;

  const refreshNow = useCallback(async (delayMs = 800) => {
    await new Promise((r) => setTimeout(r, delayMs));
    await pollRef.current();
  }, []);

  // Register refresh function in context so child components can use it
  useEffect(() => {
    setRefreshFn(refreshNow);
  }, [setRefreshFn, refreshNow]);

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, pollInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll, pollInterval]);

  return { refreshNow };
}
