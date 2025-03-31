// Custom Modal Component using Web Components
class Modal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Create styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                backdrop-filter: blur(5px);
            }

            .modal-content {
                position: relative;
                max-width: 90%;
                max-height: 90vh;
                background: rgba(30, 30, 30, 0.9);
                border-radius: 8px;
                padding: 20px;
                color: #fff;
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.2);
                border: 1px solid rgba(0, 255, 255, 0.2);
            }

            .close-button {
                position: absolute;
                top: -40px;
                right: -40px;
                width: 30px;
                height: 30px;
                background: rgba(30, 30, 30, 0.9);
                border: 1px solid rgba(0, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                color: #00ffff;
                font-size: 1.2rem;
                transition: all 0.3s ease;
            }

            .close-button:hover {
                background: rgba(0, 255, 255, 0.1);
                transform: rotate(90deg);
            }

            :host([open]) {
                display: flex;
            }
        `;

        // Create modal structure
        const template = document.createElement('template');
        template.innerHTML = `
            <div class="modal-content">
                <slot></slot>
                <button class="close-button">×</button>
            </div>
        `;

        // Attach to shadow DOM
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Add event listeners
        this.shadowRoot.querySelector('.close-button').addEventListener('click', () => {
            this.close();
        });

        this.addEventListener('click', (e) => {
            if (e.target === this) {
                this.close();
            }
        });
    }

    // Lifecycle callbacks
    connectedCallback() {
        document.addEventListener('keydown', this._handleKeyDown.bind(this));
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this._handleKeyDown.bind(this));
    }

    // Public methods
    open() {
        this.setAttribute('open', '');
        this.dispatchEvent(new CustomEvent('modal-open'));
    }

    close() {
        this.removeAttribute('open');
        this.dispatchEvent(new CustomEvent('modal-close'));
    }

    // Private methods
    _handleKeyDown(e) {
        if (e.key === 'Escape' && this.hasAttribute('open')) {
            this.close();
        }
    }
}

// Register the custom element
customElements.define('game-modal', Modal);

export default Modal; 