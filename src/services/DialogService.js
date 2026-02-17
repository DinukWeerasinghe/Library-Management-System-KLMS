/**
 * DialogService
 * Centralized service to show global dialogs (Success, Error, Warning, Info, Confirm).
 */
class DialogServiceEmitter {
    constructor() {
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    emit(event) {
        this.listeners.forEach(l => l(event));
    }

    showSuccess(message) {
        this.emit({ open: true, type: 'success', message });
    }

    showError(message) {
        this.emit({ open: true, type: 'error', message });
    }

    showWarning(message) {
        this.emit({ open: true, type: 'warning', message });
    }

    showInfo(message) {
        this.emit({ open: true, type: 'info', message });
    }

    showConfirm(message, onConfirm) {
        this.emit({ open: true, type: 'confirm', message, onConfirm });
    }

    confirm(title, message) {
        return new Promise((resolve) => {
            this.emit({
                open: true,
                type: 'confirm',
                title: title || 'Confirm',
                message,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }

    close() {
        this.emit({ open: false });
    }
}

export const DialogService = new DialogServiceEmitter();
