import React, { useState, useEffect } from 'react';
import { DialogService } from '../services/DialogService';
import { AppDialog } from './AppDialog';

export function DialogProvider() {
    const [state, setState] = useState({
        open: false,
        type: 'info',
        message: '',
        onConfirm: null
    });

    useEffect(() => {
        const unsubscribe = DialogService.subscribe((event) => {
            if (event.open) {
                setState({ ...event });
            } else {
                setState(prev => ({ ...prev, open: false }));
            }
        });

        return unsubscribe;
    }, []);

    const handleClose = () => {
        if (state.onCancel) {
            state.onCancel();
        }
        setState(prev => ({ ...prev, open: false }));
    };

    const handleConfirm = () => {
        if (state.onConfirm) {
            state.onConfirm();
        }
        setState(prev => ({ ...prev, open: false }));
    };

    return (
        <AppDialog
            {...state}
            onClose={handleClose}
            onConfirm={handleConfirm}
        />
    );
}
