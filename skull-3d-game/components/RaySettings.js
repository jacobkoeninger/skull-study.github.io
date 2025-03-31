// Advanced Ray Settings Component
import useStore from '../store.js';
import { Toast } from './index.js';

class RaySettings extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
            }

            .ray-settings {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .color-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }

            .color-label {
                font-size: 14px;
                color: #333;
                flex-grow: 1;
            }

            input[type="color"] {
                width: 50px;
                height: 30px;
                padding: 0;
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            input[type="color"]:hover {
                border-color: rgba(0, 255, 255, 0.5);
                transform: scale(1.05);
            }

            .presets {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                margin-bottom: 15px;
            }

            .preset-color {
                width: 100%;
                aspect-ratio: 1;
                border-radius: 4px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .preset-color:hover {
                transform: scale(1.1);
                border-color: rgba(0, 255, 255, 0.5);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }

            .preset-color.active {
                border-width: 2px;
                border-color: rgba(0, 255, 255, 0.8);
                transform: scale(1.1);
            }

            .settings {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .setting-row {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .setting-label {
                font-size: 14px;
                color: #333;
                flex-grow: 1;
            }

            input[type="range"] {
                flex-grow: 1;
                -webkit-appearance: none;
                height: 4px;
                border-radius: 2px;
                background: rgba(0, 0, 0, 0.1);
            }

            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: rgba(0, 255, 255, 0.8);
                cursor: pointer;
                transition: all 0.2s ease;
            }

            input[type="range"]::-webkit-slider-thumb:hover {
                transform: scale(1.2);
            }

            .value-display {
                min-width: 40px;
                text-align: right;
                font-size: 12px;
                color: #666;
            }
        `;

        const template = document.createElement('template');
        template.innerHTML = `
            <div class="ray-settings">
                <div class="color-row">
                    <span class="color-label">Ray Color:</span>
                    <input type="color" value="${useStore.getState().currentRayColor}">
                </div>
                <div class="presets"></div>
                <div class="settings">
                    <div class="setting-row">
                        <span class="setting-label">Opacity:</span>
                        <input type="range" min="0" max="100" value="70">
                        <span class="value-display">70%</span>
                    </div>
                    <div class="setting-row">
                        <span class="setting-label">Length:</span>
                        <input type="range" min="1" max="10" value="4" step="0.5">
                        <span class="value-display">4.0</span>
                    </div>
                    <div class="setting-row">
                        <span class="setting-label">Width:</span>
                        <input type="range" min="1" max="5" value="3" step="0.5">
                        <span class="value-display">3.0</span>
                    </div>
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Initialize properties
        this.colorPresets = [
            '#ff0000', '#00ff00', '#0000ff', '#ffff00',
            '#ff00ff', '#00ffff', '#ff8800', '#88ff00'
        ];

        // Store references
        this.colorPicker = this.shadowRoot.querySelector('input[type="color"]');
        this.presetsContainer = this.shadowRoot.querySelector('.presets');

        // Setup event listeners
        this._setupEventListeners();
        this._initializePresets();
    }

    initialize() {
        // Subscribe to store changes
        useStore.subscribe(
            state => state.currentRayColor,
            this._updateColor.bind(this)
        );
    }

    _setupEventListeners() {
        this.colorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            useStore.getState().updateRayColor(color);
            this._updateActivePreset(color);
            Toast.info('Ray color updated');
        });

        // Setup sliders
        this.shadowRoot.querySelectorAll('.setting-row').forEach(row => {
            const slider = row.querySelector('input[type="range"]');
            const display = row.querySelector('.value-display');

            slider.addEventListener('input', () => {
                const value = slider.value;
                display.textContent = slider.step === '1' ? value : `${value}.0`;
                
                // Update store based on the setting
                switch (row.querySelector('.setting-label').textContent.toLowerCase()) {
                    case 'opacity:':
                        useStore.getState().updateRayOpacity(value / 100);
                        break;
                    case 'length:':
                        useStore.getState().updateRayLength(parseFloat(value));
                        break;
                    case 'width:':
                        useStore.getState().updateRayWidth(parseFloat(value));
                        break;
                }
            });
        });
    }

    _initializePresets() {
        this.colorPresets.forEach(color => {
            const preset = document.createElement('div');
            preset.className = 'preset-color';
            preset.style.backgroundColor = color;
            
            if (color === useStore.getState().currentRayColor) {
                preset.classList.add('active');
            }
            
            preset.addEventListener('click', () => {
                this.colorPicker.value = color;
                useStore.getState().updateRayColor(color);
                this._updateActivePreset(color);
                Toast.success('Ray color preset applied');
            });
            
            this.presetsContainer.appendChild(preset);
        });
    }

    _updateActivePreset(color) {
        this.shadowRoot.querySelectorAll('.preset-color').forEach(preset => {
            preset.classList.toggle('active', preset.style.backgroundColor === color);
        });
    }

    _updateColor(color) {
        this.colorPicker.value = color;
        this._updateActivePreset(color);
    }

    updateOpacity(value) {
        const slider = this.shadowRoot.querySelector('input[type="range"][min="0"][max="100"]');
        if (slider) {
            slider.value = value * 100;
            slider.nextElementSibling.textContent = `${Math.round(value * 100)}%`;
        }
    }

    updateLength(value) {
        const slider = this.shadowRoot.querySelector('input[type="range"][min="1"][max="10"]');
        if (slider) {
            slider.value = value;
            slider.nextElementSibling.textContent = value.toFixed(1);
        }
    }

    updateWidth(value) {
        const slider = this.shadowRoot.querySelector('input[type="range"][min="1"][max="5"]');
        if (slider) {
            slider.value = value;
            slider.nextElementSibling.textContent = value.toFixed(1);
        }
    }
}

customElements.define('game-ray-settings', RaySettings);

export default RaySettings; 