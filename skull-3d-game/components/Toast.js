// Advanced Toast Notification Component
class Toast extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Queue for managing multiple toasts
        this.queue = [];
        this.isProcessing = false;

        const style = document.createElement('style');
        style.textContent = `
            :host {
                position: fixed;
                z-index: 10000;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            :host([position="top-right"]) {
                top: 20px;
                right: 20px;
            }

            :host([position="top-left"]) {
                top: 20px;
                left: 20px;
            }

            :host([position="bottom-right"]) {
                bottom: 20px;
                right: 20px;
            }

            :host([position="bottom-left"]) {
                bottom: 20px;
                left: 20px;
            }

            .toast {
                min-width: 300px;
                max-width: 400px;
                padding: 12px 16px;
                border-radius: 8px;
                background: rgba(30, 30, 30, 0.95);
                color: #fff;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 12px;
                pointer-events: all;
                transform: translateX(120%);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
            }

            .toast.show {
                transform: translateX(0);
                opacity: 1;
            }

            .toast.hide {
                transform: translateX(120%);
                opacity: 0;
            }

            .icon {
                font-size: 20px;
                flex-shrink: 0;
            }

            .content {
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .title {
                font-weight: 600;
                font-size: 14px;
            }

            .message {
                font-size: 13px;
                opacity: 0.9;
            }

            .progress {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 0 0 8px 8px;
                overflow: hidden;
            }

            .progress-bar {
                height: 100%;
                background: rgba(0, 255, 255, 0.5);
                width: 100%;
                transform-origin: left;
                transition: transform linear;
            }

            .close {
                padding: 4px;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
                font-size: 18px;
            }

            .close:hover {
                opacity: 1;
            }

            /* Toast variants */
            .toast[data-type="success"] {
                border-left: 4px solid #00ff00;
            }

            .toast[data-type="error"] {
                border-left: 4px solid #ff4444;
            }

            .toast[data-type="warning"] {
                border-left: 4px solid #ffbb00;
            }

            .toast[data-type="info"] {
                border-left: 4px solid #00ffff;
            }
        `;

        const template = document.createElement('template');
        template.innerHTML = `<slot></slot>`;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    static get observedAttributes() {
        return ['position'];
    }

    // Show a new toast notification
    show(options = {}) {
        const {
            title = '',
            message = '',
            type = 'info',
            duration = 5000,
            closable = true,
            icon = this._getIconForType(type)
        } = options;

        const toastData = { title, message, type, duration, closable, icon };
        this.queue.push(toastData);
        this._processQueue();
    }

    async _processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;
        const toastData = this.queue.shift();
        await this._showToast(toastData);
        this.isProcessing = false;
        this._processQueue();
    }

    async _showToast(data) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('data-type', data.type);
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');

        toast.innerHTML = `
            <div class="icon">${data.icon}</div>
            <div class="content">
                ${data.title ? `<div class="title">${data.title}</div>` : ''}
                ${data.message ? `<div class="message">${data.message}</div>` : ''}
            </div>
            ${data.closable ? `<div class="close" role="button" aria-label="Close notification">×</div>` : ''}
            <div class="progress">
                <div class="progress-bar"></div>
            </div>
        `;

        this.shadowRoot.appendChild(toast);

        // Setup close button
        if (data.closable) {
            const closeBtn = toast.querySelector('.close');
            closeBtn.addEventListener('click', () => this._hideToast(toast));
        }

        // Animate progress bar
        const progressBar = toast.querySelector('.progress-bar');
        progressBar.style.transition = `transform ${data.duration}ms linear`;

        // Show toast with animation
        await new Promise(resolve => requestAnimationFrame(resolve));
        toast.classList.add('show');
        progressBar.style.transform = 'scaleX(0)';

        // Auto hide after duration
        await new Promise(resolve => setTimeout(resolve, data.duration));
        this._hideToast(toast);
    }

    async _hideToast(toast) {
        toast.classList.add('hide');
        await new Promise(resolve => setTimeout(resolve, 300));
        toast.remove();
    }

    _getIconForType(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    // Static helper methods for easy access
    static success(message, options = {}) {
        const toast = document.querySelector('game-toast') || Toast._createInstance();
        toast.show({ ...options, message, type: 'success' });
    }

    static error(message, options = {}) {
        const toast = document.querySelector('game-toast') || Toast._createInstance();
        toast.show({ ...options, message, type: 'error' });
    }

    static warning(message, options = {}) {
        const toast = document.querySelector('game-toast') || Toast._createInstance();
        toast.show({ ...options, message, type: 'warning' });
    }

    static info(message, options = {}) {
        const toast = document.querySelector('game-toast') || Toast._createInstance();
        toast.show({ ...options, message, type: 'info' });
    }

    static _createInstance() {
        const toast = document.createElement('game-toast');
        toast.setAttribute('position', 'top-right');
        document.body.appendChild(toast);
        return toast;
    }
}

customElements.define('game-toast', Toast);

export default Toast; 