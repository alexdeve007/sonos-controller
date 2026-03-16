import { useEffect, useRef } from 'react';
import { getSpeakers, getGroups } from '../api';
import { useSpeakerContext } from '../context/SpeakerContext';

export function useSpeakers(pollInterval = 3000) {
  const { dispatch } = useSpeakerContext();
  const intervalRef = useRef(null);

  useEffect(() => {
    async function poll() {
      try {
        const [speakers, groups] = await Promise.all([getSpeakers(), getGroups()]);
        dispatch({ type: 'SET_SPEAKERS', payload: speakers });
        dispatch({ type: 'SET_GROUPS', payload: groups });
      } catch (err) {
        // Silently fail on poll — server might not be ready yet
      }
    }

    poll();
    intervalRef.current = setInterval(poll, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [dispatch, pollInterval]);
}
