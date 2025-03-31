// Modern Toolbar Component with Adobe-like Design
import { Tooltip, Dropdown } from './index.js';
import useStore from '../store.js';

class Toolbar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .toolbar-container {
                display: flex;
                flex-direction: column;
                background: rgba(30, 30, 30, 0.95);
                backdrop-filter: blur(10px);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                user-select: none;
            }

            .main-toolbar {
                display: flex;
                align-items: center;
                height: 48px;
                padding: 0 16px;
                gap: 8px;
            }

            .secondary-toolbar {
                display: flex;
                align-items: center;
                height: 40px;
                padding: 0 16px;
                background: rgba(40, 40, 40, 0.95);
                gap: 8px;
            }

            .tool-group {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 0 8px;
                position: relative;
            }

            .tool-group:not(:last-child)::after {
                content: '';
                position: absolute;
                right: 0;
                top: 25%;
                height: 50%;
                width: 1px;
                background: rgba(255, 255, 255, 0.1);
            }

            .tool-button {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 4px;
                color: rgba(255, 255, 255, 0.9);
                background: transparent;
                border: none;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
            }

            .tool-button:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            .tool-button.active {
                background: rgba(0, 120, 255, 0.2);
                color: #fff;
            }

            .tool-button i {
                font-size: 18px;
            }

            .tool-button.has-dropdown::after {
                content: '▾';
                position: absolute;
                bottom: 1px;
                right: 1px;
                font-size: 8px;
                opacity: 0.7;
            }

            .search-bar {
                display: flex;
                align-items: center;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                padding: 0 8px;
                margin-left: auto;
                height: 28px;
                width: 200px;
                transition: width 0.3s ease;
            }

            .search-bar:focus-within {
                width: 300px;
                background: rgba(0, 0, 0, 0.3);
            }

            .search-bar input {
                background: none;
                border: none;
                color: #fff;
                width: 100%;
                font-size: 13px;
                outline: none;
            }

            .search-bar input::placeholder {
                color: rgba(255, 255, 255, 0.5);
            }

            /* Tool options panel */
            .tool-options {
                position: absolute;
                top: 100%;
                left: 0;
                background: rgba(40, 40, 40, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                padding: 8px;
                min-width: 200px;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s ease;
            }

            .tool-options.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            /* Preset styles */
            .preset-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
                padding: 8px;
            }

            .preset-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.05);
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .preset-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .preset-icon {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 120, 255, 0.2);
                border-radius: 4px;
            }

            .preset-label {
                font-size: 13px;
                color: #fff;
            }
        `;

        const template = document.createElement('template');
        template.innerHTML = `
            <div class="toolbar-container">
                <div class="main-toolbar">
                    <div class="tool-group">
                        <button class="tool-button" title="Select (V)" data-shortcut="V">
                            <i class="fas fa-mouse-pointer"></i>
                        </button>
                        <button class="tool-button" title="Move (M)" data-shortcut="M">
                            <i class="fas fa-arrows-alt"></i>
                        </button>
                        <button class="tool-button has-dropdown" title="Transform">
                            <i class="fas fa-vector-square"></i>
                        </button>
                    </div>
                    
                    <div class="tool-group">
                        <button class="tool-button" title="Add Label (L)" data-shortcut="L">
                            <i class="fas fa-tag"></i>
                        </button>
                        <button class="tool-button" title="Add Ray (R)" data-shortcut="R">
                            <i class="fas fa-draw-polygon"></i>
                        </button>
                    </div>

                    <div class="tool-group">
                        <button class="tool-button" title="Zoom (Z)" data-shortcut="Z">
                            <i class="fas fa-search-plus"></i>
                        </button>
                        <button class="tool-button" title="Pan (H)" data-shortcut="H">
                            <i class="fas fa-hand-paper"></i>
                        </button>
                        <button class="tool-button" title="Rotate (O)" data-shortcut="O">
                            <i class="fas fa-sync"></i>
                        </button>
                    </div>

                    <div class="search-bar">
                        <input type="text" placeholder="Search tools (Ctrl + F)">
                    </div>
                </div>

                <div class="secondary-toolbar">
                    <!-- Context-sensitive controls will be dynamically added here -->
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Store references
        this.mainToolbar = this.shadowRoot.querySelector('.main-toolbar');
        this.secondaryToolbar = this.shadowRoot.querySelector('.secondary-toolbar');
        this.searchInput = this.shadowRoot.querySelector('.search-bar input');

        // Bind methods
        this._handleToolClick = this._handleToolClick.bind(this);
        this._handleSearch = this._handleSearch.bind(this);
        this._handleKeyboardShortcuts = this._handleKeyboardShortcuts.bind(this);

        // Setup event listeners
        this._setupEventListeners();
    }

    connectedCallback() {
        // Add keyboard shortcut listener
        document.addEventListener('keydown', this._handleKeyboardShortcuts);
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this._handleKeyboardShortcuts);
    }

    _setupEventListeners() {
        // Tool buttons
        this.shadowRoot.querySelectorAll('.tool-button').forEach(button => {
            button.addEventListener('click', this._handleToolClick);
        });

        // Search
        this.searchInput.addEventListener('input', this._handleSearch);
    }

    _handleToolClick(event) {
        const button = event.currentTarget;
        const currentTool = button.title.split(' ')[0].toLowerCase();

        // Update active state
        this.shadowRoot.querySelectorAll('.tool-button').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // Update store
        useStore.getState().setCurrentTool(currentTool);

        // Update secondary toolbar
        this._updateSecondaryToolbar(currentTool);
    }

    _updateSecondaryToolbar(tool) {
        // Clear current controls
        this.secondaryToolbar.innerHTML = '';

        // Add tool-specific controls
        switch (tool) {
            case 'label':
                this._addLabelControls();
                break;
            case 'ray':
                this._addRayControls();
                break;
            // Add more tool-specific controls as needed
        }
    }

    _addLabelControls() {
        // Add label-specific controls to secondary toolbar
        const controls = document.createElement('div');
        controls.className = 'tool-group';
        controls.innerHTML = `
            <button class="tool-button" title="Label Style">
                <i class="fas fa-paint-brush"></i>
            </button>
            <button class="tool-button" title="Label Presets">
                <i class="fas fa-layer-group"></i>
            </button>
        `;
        this.secondaryToolbar.appendChild(controls);
    }

    _addRayControls() {
        // Add ray-specific controls to secondary toolbar
        const controls = document.createElement('div');
        controls.className = 'tool-group';
        controls.innerHTML = `
            <button class="tool-button" title="Ray Color">
                <i class="fas fa-palette"></i>
            </button>
            <button class="tool-button" title="Ray Style">
                <i class="fas fa-sliders-h"></i>
            </button>
        `;
        this.secondaryToolbar.appendChild(controls);
    }

    _handleSearch(event) {
        const query = event.target.value.toLowerCase();
        const tools = this.shadowRoot.querySelectorAll('.tool-button');

        tools.forEach(tool => {
            const title = tool.title.toLowerCase();
            if (title.includes(query)) {
                tool.style.display = '';
            } else {
                tool.style.display = 'none';
            }
        });
    }

    _handleKeyboardShortcuts(event) {
        // Only handle shortcuts when not in an input field
        if (event.target.tagName === 'INPUT') return;

        const tools = this.shadowRoot.querySelectorAll('.tool-button[data-shortcut]');
        tools.forEach(tool => {
            if (tool.dataset.shortcut.toLowerCase() === event.key.toLowerCase()) {
                tool.click();
                event.preventDefault();
            }
        });
    }
}

customElements.define('app-toolbar', Toolbar);
export default Toolbar; 