import { useCallback, useEffect, useState } from 'react';

export function useApi(load, key) {
    const [state, setState] = useState({ data: null, loading: true, error: null, offline: false, savedAt: null });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setState((s) => ({ ...s, loading: true, error: null }));
        load(controller.signal)
            .then((result) => setState({ data: result.data, loading: false, error: null, offline: result.offline, savedAt: result.savedAt }))
            .catch((error) => {
                if (!controller.signal.aborted) setState((s) => ({ ...s, loading: false, error }));
            });
        return () => controller.abort();
    }, [key, attempt]);

    const reload = useCallback(() => setAttempt((n) => n + 1), []);
    return { ...state, reload };
}
