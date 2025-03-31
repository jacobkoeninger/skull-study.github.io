// Custom Collapsible Component using Web Components
class Collapsible extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Create styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                padding-bottom: 15px;
            }

            .header {
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                padding: 10px 0;
                user-select: none;
            }

            .arrow {
                transition: transform 0.2s;
                width: 12px;
                font-size: 12px;
            }

            .title {
                font-size: 14px;
                font-weight: bold;
                color: #333;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .content {
                display: none;
                transition: all 0.2s;
                overflow: hidden;
                padding-top: 10px;
            }

            :host([expanded]) .content {
                display: block;
            }

            :host([expanded]) .arrow {
                transform: rotate(180deg);
            }

            .emoji {
                font-size: 1.2em;
            }
        `;

        // Create collapsible structure
        const template = document.createElement('template');
        template.innerHTML = `
            <div class="header">
                <span class="arrow">▼</span>
                <div class="title">
                    <span class="emoji"></span>
                    <span class="title-text"></span>
                </div>
            </div>
            <div class="content">
                <slot></slot>
            </div>
        `;

        // Attach to shadow DOM
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Store references
        this._header = this.shadowRoot.querySelector('.header');
        this._titleText = this.shadowRoot.querySelector('.title-text');
        this._emoji = this.shadowRoot.querySelector('.emoji');
        this._content = this.shadowRoot.querySelector('.content');

        // Add event listener
        this._header.addEventListener('click', () => {
            this.toggleExpand();
        });
    }

    // Observed attributes
    static get observedAttributes() {
        return ['title', 'emoji', 'expanded'];
    }

    // Attribute changed callback
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'title':
                this._titleText.textContent = newValue;
                break;
            case 'emoji':
                this._emoji.textContent = newValue;
                break;
            case 'expanded':
                // Handled by CSS
                break;
        }
    }

    // Public methods
    toggleExpand() {
        if (this.hasAttribute('expanded')) {
            this.removeAttribute('expanded');
        } else {
            this.setAttribute('expanded', '');
        }
        this.dispatchEvent(new CustomEvent('toggle', {
            detail: { expanded: this.hasAttribute('expanded') }
        }));
    }

    // Getters/Setters
    get expanded() {
        return this.hasAttribute('expanded');
    }

    set expanded(value) {
        if (value) {
            this.setAttribute('expanded', '');
        } else {
            this.removeAttribute('expanded');
        }
    }

    get title() {
        return this.getAttribute('title');
    }

    set title(value) {
        this.setAttribute('title', value);
    }

    get emoji() {
        return this.getAttribute('emoji');
    }

    set emoji(value) {
        this.setAttribute('emoji', value);
    }
}

// Register the custom element
customElements.define('game-collapsible', Collapsible);

export default Collapsible; 