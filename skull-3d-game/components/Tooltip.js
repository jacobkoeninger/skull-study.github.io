// Advanced Tooltip Component with Smart Positioning
class Tooltip extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: inline-block;
                position: relative;
            }

            .tooltip {
                position: fixed;
                z-index: 9999;
                max-width: 300px;
                padding: 8px 12px;
                border-radius: 6px;
                background: rgba(30, 30, 30, 0.95);
                color: #fff;
                font-size: 13px;
                line-height: 1.4;
                opacity: 0;
                visibility: hidden;
                transform-origin: center;
                transform: scale(0.95);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                pointer-events: none;
            }

            .tooltip.show {
                opacity: 1;
                visibility: visible;
                transform: scale(1);
            }

            .tooltip::before {
                content: '';
                position: absolute;
                width: 8px;
                height: 8px;
                background: inherit;
                border: inherit;
                transform: rotate(45deg);
            }

            /* Arrow positions */
            .tooltip[data-position="top"]::before {
                bottom: -5px;
                left: 50%;
                margin-left: -4px;
                border-top: none;
                border-left: none;
            }

            .tooltip[data-position="bottom"]::before {
                top: -5px;
                left: 50%;
                margin-left: -4px;
                border-bottom: none;
                border-right: none;
            }

            .tooltip[data-position="left"]::before {
                right: -5px;
                top: 50%;
                margin-top: -4px;
                border-right: none;
                border-bottom: none;
            }

            .tooltip[data-position="right"]::before {
                left: -5px;
                top: 50%;
                margin-top: -4px;
                border-left: none;
                border-top: none;
            }

            /* Rich content styling */
            .tooltip-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .tooltip-title {
                font-weight: 600;
                margin-bottom: 2px;
            }

            .tooltip-description {
                opacity: 0.9;
            }

            .tooltip-image {
                max-width: 100%;
                border-radius: 4px;
                margin: 4px 0;
            }

            /* Themes */
            .tooltip[data-theme="light"] {
                background: rgba(255, 255, 255, 0.95);
                color: #333;
            }

            .tooltip[data-theme="dark"] {
                background: rgba(30, 30, 30, 0.95);
                color: #fff;
            }

            .tooltip[data-theme="primary"] {
                background: rgba(0, 120, 255, 0.95);
                color: #fff;
            }

            .tooltip[data-theme="success"] {
                background: rgba(40, 200, 80, 0.95);
                color: #fff;
            }

            .tooltip[data-theme="warning"] {
                background: rgba(255, 180, 0, 0.95);
                color: #333;
            }

            .tooltip[data-theme="error"] {
                background: rgba(255, 70, 70, 0.95);
                color: #fff;
            }
        `;

        const template = document.createElement('template');
        template.innerHTML = `
            <slot></slot>
            <div class="tooltip" role="tooltip">
                <div class="tooltip-content"></div>
            </div>
        `;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Store references
        this.tooltip = this.shadowRoot.querySelector('.tooltip');
        this.content = this.shadowRoot.querySelector('.tooltip-content');

        // Bind methods
        this._onMouseEnter = this._onMouseEnter.bind(this);
        this._onMouseLeave = this._onMouseLeave.bind(this);
        this._onFocus = this._onFocus.bind(this);
        this._onBlur = this._onBlur.bind(this);
        this._updatePosition = this._updatePosition.bind(this);

        // Initialize intersection observer for viewport detection
        this._initIntersectionObserver();
    }

    // Observed attributes
    static get observedAttributes() {
        return ['content', 'position', 'theme', 'title', 'image', 'delay'];
    }

    // Lifecycle callbacks
    connectedCallback() {
        this.addEventListener('mouseenter', this._onMouseEnter);
        this.addEventListener('mouseleave', this._onMouseLeave);
        this.addEventListener('focus', this._onFocus);
        this.addEventListener('blur', this._onBlur);
        window.addEventListener('scroll', this._updatePosition);
        window.addEventListener('resize', this._updatePosition);
    }

    disconnectedCallback() {
        this.removeEventListener('mouseenter', this._onMouseEnter);
        this.removeEventListener('mouseleave', this._onMouseLeave);
        this.removeEventListener('focus', this._onFocus);
        this.removeEventListener('blur', this._onBlur);
        window.removeEventListener('scroll', this._updatePosition);
        window.removeEventListener('resize', this._updatePosition);
        this._observer?.disconnect();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'content':
                this._updateContent();
                break;
            case 'position':
            case 'theme':
                this.tooltip.setAttribute(`data-${name}`, newValue);
                break;
            case 'title':
            case 'image':
                this._updateContent();
                break;
            case 'delay':
                // Handled in show/hide logic
                break;
        }
    }

    // Private methods
    _initIntersectionObserver() {
        this._observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting && this.tooltip.classList.contains('show')) {
                        this.hide();
                    }
                });
            },
            { threshold: 0.5 }
        );
        this._observer.observe(this);
    }

    _getPreferredPosition() {
        const positions = ['top', 'bottom', 'left', 'right'];
        const rect = this.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Calculate available space in each direction
        const space = {
            top: rect.top,
            bottom: viewportHeight - rect.bottom,
            left: rect.left,
            right: viewportWidth - rect.right
        };

        // Sort positions by available space
        return positions.sort((a, b) => space[b] - space[a])[0];
    }

    _updatePosition() {
        if (!this.tooltip.classList.contains('show')) return;

        const hostRect = this.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const position = this.getAttribute('position') || this._getPreferredPosition();
        
        let left, top;

        switch (position) {
            case 'top':
                left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
                top = hostRect.top - tooltipRect.height - 10;
                break;
            case 'bottom':
                left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
                top = hostRect.bottom + 10;
                break;
            case 'left':
                left = hostRect.left - tooltipRect.width - 10;
                top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
                break;
            case 'right':
                left = hostRect.right + 10;
                top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
                break;
        }

        // Ensure tooltip stays within viewport
        left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    _updateContent() {
        const title = this.getAttribute('title');
        const content = this.getAttribute('content');
        const image = this.getAttribute('image');

        let html = '';

        if (title) {
            html += `<div class="tooltip-title">${title}</div>`;
        }

        if (content) {
            html += `<div class="tooltip-description">${content}</div>`;
        }

        if (image) {
            html += `<img class="tooltip-image" src="${image}" alt="${title || 'Tooltip image'}" />`;
        }

        this.content.innerHTML = html;
    }

    _onMouseEnter() {
        this.show();
    }

    _onMouseLeave() {
        this.hide();
    }

    _onFocus() {
        this.show();
    }

    _onBlur() {
        this.hide();
    }

    // Public methods
    show() {
        const delay = parseInt(this.getAttribute('delay')) || 0;
        clearTimeout(this._hideTimeout);

        this._showTimeout = setTimeout(() => {
            this.tooltip.classList.add('show');
            this._updatePosition();
        }, delay);
    }

    hide() {
        const delay = parseInt(this.getAttribute('delay')) || 0;
        clearTimeout(this._showTimeout);

        this._hideTimeout = setTimeout(() => {
            this.tooltip.classList.remove('show');
        }, delay);
    }
}

customElements.define('game-tooltip', Tooltip);

export default Tooltip; 