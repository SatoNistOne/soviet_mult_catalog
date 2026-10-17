import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Button, Modal, Toast, ToastContainer } from 'react-bootstrap';

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const [dialog, setDialog] = useState(null);
    const nextId = useRef(1);

    const notify = useCallback((toast) => {
        const id = nextId.current++;
        setToasts((list) => [...list.slice(-3), { id, ...toast }]);
    }, []);
    const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

    const confirm = useCallback(
        (options) => new Promise((resolve) => setDialog({ ...options, resolve })),
        [],
    );
    const closeDialog = (result) => {
        dialog?.resolve(result);
        setDialog(null);
    };

    const value = useMemo(() => ({ notify, confirm }), [notify, confirm]);

    return (
        <FeedbackContext.Provider value={value}>
            {children}
            <ToastContainer position="bottom-end" className="p-3 ma-toasts" aria-live="polite">
                {toasts.map((t) => (
                    <Toast key={t.id} onClose={() => dismiss(t.id)} delay={t.action ? 6000 : 3200} autohide
                           className={`ma-toast ma-toast--${t.tone || 'info'}`}>
                        <Toast.Body>
                            <i className={`bi ${t.icon || 'bi-info-circle'} ma-toast__icon`} aria-hidden="true" />
                            <span className="ma-toast__text">{t.text}</span>
                            {t.action && (
                                <button type="button" className="btn btn-link ma-toast__action"
                                        onClick={() => { t.action.onClick(); dismiss(t.id); }}>
                                    {t.action.label}
                                </button>
                            )}
                            <button type="button" className="btn-close btn-close-white ms-1" aria-label="Закрыть"
                                    onClick={() => dismiss(t.id)} />
                        </Toast.Body>
                    </Toast>
                ))}
            </ToastContainer>
            <Modal show={Boolean(dialog)} onHide={() => closeDialog(false)} centered className="ma-modal">
                <Modal.Header closeButton closeLabel="Закрыть">
                    <Modal.Title as="h2">{dialog?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>{dialog?.text}</Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={() => closeDialog(false)}>Отмена</Button>
                    <Button variant="danger" onClick={() => closeDialog(true)} autoFocus>
                        {dialog?.confirmLabel || 'Подтвердить'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </FeedbackContext.Provider>
    );
}

export function useFeedback() {
    return useContext(FeedbackContext);
}
