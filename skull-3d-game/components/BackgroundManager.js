// Advanced Background Manager Component
import * as THREE from 'three';
import useStore from '../store.js';
import { Toast } from './index.js';

class BackgroundManager extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
            }

            .background-manager {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .preview {
                width: 100%;
                height: 100px;
                border-radius: 6px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                background-size: cover;
                background-position: center;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-bottom: 10px;
                position: relative;
                overflow: hidden;
            }

            .preview:hover {
                border-color: rgba(0, 255, 255, 0.5);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .preview::before {
                content: 'Click to upload image';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.7);
                padding: 8px 12px;
                border-radius: 4px;
                color: #fff;
                font-size: 12px;
                opacity: 0;
                transition: opacity 0.2s;
            }

            .preview:hover::before {
                opacity: 1;
            }

            .controls {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 10px;
                margin-bottom: 10px;
            }

            input[type="text"] {
                padding: 8px 12px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 4px;
                font-size: 14px;
                width: 100%;
            }

            input[type="text"]:focus {
                outline: none;
                border-color: rgba(0, 255, 255, 0.5);
                box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
            }

            .color-section {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }

            input[type="color"] {
                width: 50px;
                height: 30px;
                padding: 0;
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 4px;
                cursor: pointer;
            }

            .presets {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-top: 10px;
            }

            .preset-button {
                height: 40px;
                background-size: cover;
                background-position: center;
                border-radius: 4px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                cursor: pointer;
                position: relative;
                overflow: hidden;
                transition: all 0.2s ease;
            }

            .preset-button:hover {
                transform: translateY(-2px);
                border-color: rgba(0, 255, 255, 0.5);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .preset-button span {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                font-size: 14px;
                font-weight: 500;
            }
        `;

        const template = document.createElement('template');
        template.innerHTML = `
            <div class="background-manager">
                <div class="preview"></div>
                <div class="controls">
                    <input type="text" placeholder="Enter image URL">
                    <game-button icon="✓">Apply URL</game-button>
                </div>
                <div class="color-section">
                    <input type="color">
                    <game-button>Use Color</game-button>
                </div>
                <game-button icon="↺">Reset</game-button>
                <div class="presets"></div>
            </div>
        `;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Store references
        this.preview = this.shadowRoot.querySelector('.preview');
        this.urlInput = this.shadowRoot.querySelector('input[type="text"]');
        this.colorPicker = this.shadowRoot.querySelector('input[type="color"]');
        this.presetsContainer = this.shadowRoot.querySelector('.presets');

        // Bind methods
        this._handlePreviewClick = this._handlePreviewClick.bind(this);
        this._handleApplyUrl = this._handleApplyUrl.bind(this);
        this._handleUseColor = this._handleUseColor.bind(this);
        this._handleReset = this._handleReset.bind(this);

        // Setup event listeners
        this._setupEventListeners();
    }

    initialize(scene) {
        this.scene = scene;
        this._initializePresets();
        
        // Set up store subscriptions
        useStore.subscribe(
            (state) => [state.backgroundUrl, state.backgroundColor],
            ([url, color]) => {
                this._updatePreview(url);
                // Ensure we're not in a loading state
                if (this._isLoading) return;
                this.setupBackground();
            }
        );
        
        // Initial setup
        const state = useStore.getState();
        this._updatePreview(state.backgroundUrl);
        this.setupBackground();
    }

    _setupEventListeners() {
        this.preview.addEventListener('click', this._handlePreviewClick);
        
        this.shadowRoot.querySelector('game-button[icon="✓"]')
            .addEventListener('click', this._handleApplyUrl);
        
        this.shadowRoot.querySelector('.color-section game-button')
            .addEventListener('click', this._handleUseColor);
        
        this.shadowRoot.querySelector('game-button[icon="↺"]')
            .addEventListener('click', this._handleReset);
    }

    _initializePresets() {
        const presets = useStore.getState().backgroundPresets;
        
        presets.forEach(preset => {
            const button = document.createElement('div');
            button.className = 'preset-button';
            button.style.backgroundImage = `url(${preset.url})`;
            
            const label = document.createElement('span');
            label.textContent = preset.name;
            button.appendChild(label);
            
            button.addEventListener('click', () => {
                this.urlInput.value = preset.url;
                useStore.getState().updateBackground(preset.url);
                Toast.success(`Background set to ${preset.name}`);
            });
            
            this.presetsContainer.appendChild(button);
        });
    }

    _handlePreviewClick() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const dataUrl = await this._readFileAsDataURL(file);
                    useStore.getState().updateBackground(dataUrl);
                } catch (error) {
                    console.error('Error reading file:', error);
                    Toast.error('Failed to upload background image');
                }
            }
        };
        
        input.click();
    }

    _readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    _handleApplyUrl() {
        const url = this.urlInput.value.trim();
        if (url) {
            useStore.getState().updateBackground(url);
        } else {
            Toast.error('Please enter a valid URL');
        }
    }

    _handleUseColor() {
        const color = this.colorPicker.value;
        useStore.getState().updateBackground('color', color);
    }

    _handleReset() {
        const defaultUrl = useStore.getState().defaultBackgroundUrl;
        this.urlInput.value = defaultUrl;
        useStore.getState().updateBackground(defaultUrl);
    }

    _cleanupBackground() {
        if (this.scene.background instanceof THREE.Texture) {
            this.scene.background.dispose();
        }
        this.scene.background = null;
    }

    async setupBackground() {
        // Clean up existing background first
        this._cleanupBackground();

        const state = useStore.getState();
        if (state.backgroundUrl === 'color') {
            // Use solid color background
            this.scene.background = new THREE.Color(state.backgroundColor);
            return;
        }

        // Create and load the background texture
        const loader = new THREE.TextureLoader();
        const url = state.backgroundUrl;
        
        // Show loading state
        this._isLoading = true;
        this.preview.style.opacity = '0.5';
        
        try {
            const texture = await new Promise((resolve, reject) => {
                loader.load(
                    url,
                    (texture) => resolve(texture),
                    undefined,
                    (error) => reject(error)
                );
            });

            // Check if the URL is still the same (user hasn't changed it while loading)
            const currentUrl = useStore.getState().backgroundUrl;
            if (currentUrl === url) {
                texture.minFilter = THREE.LinearFilter;
                this.scene.background = texture;
            } else {
                texture.dispose();
            }
        } catch (error) {
            console.error('Error loading background:', error);
            Toast.error('Failed to load background image');
            
            // If loading fails, try loading the default background
            if (url !== state.defaultBackgroundUrl) {
                useStore.getState().updateBackground(state.defaultBackgroundUrl);
            }
        } finally {
            this._isLoading = false;
            this.preview.style.opacity = '1';
        }
    }

    _updatePreview(url) {
        if (url === 'color') {
            const color = useStore.getState().backgroundColor;
            this.preview.style.backgroundColor = color;
            this.preview.style.backgroundImage = 'none';
            if (this.urlInput) {
                this.urlInput.value = '';
            }
        } else {
            this.preview.style.backgroundImage = `url(${url})`;
            this.preview.style.backgroundColor = 'transparent';
            if (this.urlInput) {
                this.urlInput.value = url;
            }
        }
    }
}

customElements.define('game-background-manager', BackgroundManager);

export default BackgroundManager; 