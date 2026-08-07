import { useEffect } from "react";

/** Prompt the browser’s leave confirmation while the AI questionnaire session is active. */
const useConfirmOnExit = () => {
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            (event as any).returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);
};

export default useConfirmOnExit;