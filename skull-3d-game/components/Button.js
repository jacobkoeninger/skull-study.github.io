// Custom Button Component using Web Components
class Button extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Create styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: inline-block;
            }

            button {
                padding: 8px 16px;
                font-size: 14px;
                border: 1px solid rgba(0, 255, 255, 0.3);
                border-radius: 4px;
                background: rgba(0, 255, 255, 0.1);
                color: #00ffff;
                cursor: pointer;
                transition: all 0.3s ease;
                font-family: inherit;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            button:hover {
                background: rgba(0, 255, 255, 0.2);
                border-color: rgba(0, 255, 255, 0.5);
                transform: translateY(-2px);
            }

            button:active {
                transform: translateY(0);
            }

            :host([variant="danger"]) button {
                background: rgba(255, 68, 68, 0.1);
                border-color: rgba(255, 68, 68, 0.3);
                color: #ff4444;
            }

            :host([variant="danger"]) button:hover {
                background: rgba(255, 68, 68, 0.2);
                border-color: rgba(255, 68, 68, 0.5);
            }

            :host([disabled]) button {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }

            .icon {
                font-size: 1.2em;
            }
        `;

        // Create button structure
        const template = document.createElement('template');
        template.innerHTML = `
            <button>
                <span class="icon"></span>
                <slot></slot>
            </button>
        `;

        // Attach to shadow DOM
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Store references
        this._button = this.shadowRoot.querySelector('button');
        this._icon = this.shadowRoot.querySelector('.icon');
    }

    // Observed attributes
    static get observedAttributes() {
        return ['disabled', 'icon', 'variant'];
    }

    // Attribute changed callback
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'disabled':
                this._button.disabled = this.hasAttribute('disabled');
                break;
            case 'icon':
                this._icon.textContent = newValue || '';
                break;
            case 'variant':
                // Handled by CSS
                break;
        }
    }

    // Getters/Setters
    get disabled() {
        return this.hasAttribute('disabled');
    }

    set disabled(value) {
        if (value) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    get icon() {
        return this.getAttribute('icon');
    }

    set icon(value) {
        if (value) {
            this.setAttribute('icon', value);
        } else {
            this.removeAttribute('icon');
        }
    }
}

// Register the custom element
customElements.define('game-button', Button);

export default Button; 