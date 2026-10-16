import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface FlashNoticeState {
  notice?: string;
}

/**
 * Reads a one-time success message passed through router state (e.g. after creating an employee)
 * and clears it from history so it does not reappear on refresh or back-navigation.
 */
export function useFlashNotice(): [string | null, (notice: string | null) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const incomingNotice = (location.state as FlashNoticeState | null)?.notice ?? null;
  const [notice, setNotice] = useState<string | null>(incomingNotice);

  useEffect(() => {
    if (incomingNotice) {
      setNotice(incomingNotice);
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [incomingNotice, location.pathname, location.search, navigate]);

  return [notice, setNotice];
}
