// Advanced Label Manager Component
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import * as THREE from 'three';
import useStore from '../store.js';
import { Toast } from './index.js';

class LabelManager extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
            }

            .label-manager {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .label-sets {
                margin-top: 10px;
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 6px;
                padding: 10px;
            }

            .controls {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
            }

            .input-row {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
            }

            input[type="text"] {
                flex-grow: 1;
                padding: 8px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 4px;
                font-size: 14px;
            }

            input[type="text"]:focus {
                outline: none;
                border-color: rgba(0, 255, 255, 0.5);
                box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
            }

            .label {
                background: rgba(255, 220, 220, 0.9);
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                border: 1px solid rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(4px);
            }

            .label.dev-mode {
                cursor: move;
                padding-right: 24px;
            }

            .label:hover {
                transform: scale(1.05);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }

            .delete-button {
                position: absolute;
                right: -8px;
                top: -8px;
                width: 16px;
                height: 16px;
                background: #ff4444;
                color: white;
                border-radius: 50%;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                cursor: pointer;
                border: 1px solid rgba(255, 255, 255, 0.3);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .label.dev-mode:hover .delete-button {
                display: flex;
            }

            .delete-button:hover {
                background: #ff6666;
                transform: scale(1.1);
            }

            .label-edit {
                background: rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 2px;
                color: inherit;
                font: inherit;
                padding: 2px 4px;
                outline: none;
            }

            .label-edit:focus {
                background: rgba(255, 255, 255, 0.9);
                color: #333;
            }
        `;

        const template = document.createElement('template');
        template.innerHTML = `
            <div class="label-manager">
                <div class="controls">
                    <game-button id="dev-mode-toggle">Toggle Dev Mode</game-button>
                    <game-button icon="📁">Import</game-button>
                    <game-button icon="🗑️" variant="danger">Clear All</game-button>
                </div>
                <div class="input-row">
                    <input type="text" placeholder="Label Set Name">
                    <game-button icon="💾">Save</game-button>
                </div>
                <div class="label-sets"></div>
            </div>
        `;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Initialize properties
        this.labels = [];
        this.labelScene = null;
        this.scene = null;
        this.camera = null;

        // Store references
        this.labelSetsContainer = this.shadowRoot.querySelector('.label-sets');
        this.labelSetInput = this.shadowRoot.querySelector('input[type="text"]');
        
        // Bind methods
        this._handleImport = this._handleImport.bind(this);
        this._handleSave = this._handleSave.bind(this);
        this._handleClearAll = this._handleClearAll.bind(this);
        this._handleDevModeToggle = this._handleDevModeToggle.bind(this);

        // Setup event listeners
        this._setupEventListeners();
    }

    initialize(labelScene, scene, camera) {
        this.labelScene = labelScene;
        this.scene = scene;
        this.camera = camera;

        // Subscribe to store changes
        this._setupStoreSubscriptions();

        // Start animation loop for billboarding
        this._animate();
    }

    _setupEventListeners() {
        // Dev mode toggle
        this.shadowRoot.querySelector('#dev-mode-toggle')
            .addEventListener('click', this._handleDevModeToggle);

        // Import button
        this.shadowRoot.querySelector('game-button[icon="📁"]')
            .addEventListener('click', this._handleImport);

        // Save button
        this.shadowRoot.querySelector('game-button[icon="💾"]')
            .addEventListener('click', this._handleSave);

        // Clear all button
        this.shadowRoot.querySelector('game-button[icon="🗑️"]')
            .addEventListener('click', this._handleClearAll);
    }

    _setupStoreSubscriptions() {
        useStore.subscribe(
            state => state.labels,
            this._updateLabelDisplay.bind(this)
        );

        useStore.subscribe(
            state => state.isDevelopmentMode,
            (isDev) => {
                this.updateLabelVisibility();
                // Update toggle button appearance
                const devModeToggle = this.shadowRoot.querySelector('#dev-mode-toggle');
                if (devModeToggle) {
                    devModeToggle.style.backgroundColor = isDev ? '#ff4444' : '#ffffff';
                    devModeToggle.style.color = isDev ? '#ffffff' : '#333333';
                }
            }
        );
    }

    _handleDevModeToggle() {
        useStore.getState().toggleDevMode();
    }

    _handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.multiple = true;

        input.onchange = (e) => {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.hierarchy && data.labelSet) {
                            this.loadHierarchy(data.hierarchy);
                            Toast.success('Label hierarchy imported');
                        } else if (data.labels) {
                            this.addLabelSet(data);
                            Toast.success('Label set imported');
                        } else {
                            throw new Error('Invalid label set format');
                        }
                    } catch (error) {
                        console.error('Error loading label set:', error);
                        Toast.error('Failed to import label set');
                    }
                };
                reader.readAsText(file);
            });
        };

        input.click();
    }

    _handleSave() {
        const setName = this.labelSetInput.value.trim() || 'Untitled Set';
        this.saveLabelPositions(setName);
        this.labelSetInput.value = ''; // Clear input after saving
        Toast.success(`Label set "${setName}" saved`);
    }

    _handleClearAll() {
        const modal = document.createElement('game-modal');
        modal.innerHTML = `
            <h3>Clear All Labels?</h3>
            <p>This action cannot be undone.</p>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <game-button>Cancel</game-button>
                <game-button variant="danger">Clear All</game-button>
            </div>
        `;

        document.body.appendChild(modal);
        modal.open();

        const [cancelBtn, confirmBtn] = modal.querySelectorAll('game-button');
        cancelBtn.addEventListener('click', () => modal.close());
        confirmBtn.addEventListener('click', () => {
            this.clearAllLabels();
            modal.close();
            Toast.info('All labels cleared');
        });
    }

    _animate() {
        // Update label rotations to face camera
        this.labels.forEach(label => {
            if (label.object) {
                // Get the camera's quaternion
                const quaternion = this.camera.quaternion.clone();
                
                // Apply the quaternion to the label
                label.object.quaternion.copy(quaternion);
            }
        });

        // Continue animation loop
        requestAnimationFrame(() => this._animate());
    }

    createLabel(position, text = null, setName = null) {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'label dev-mode';
        labelDiv.textContent = text || `Label ${useStore.getState().labels.length + 1}`;
        
        // Set default background color
        const defaultColor = '#ffffff';
        labelDiv.style.backgroundColor = defaultColor;
        labelDiv.style.color = '#000000'; // Black text for white background
        
        const label = new CSS3DObject(labelDiv);
        label.position.copy(position);
        label.scale.set(0.01, 0.01, 0.01);
        
        // Set initial rotation to face camera
        label.quaternion.copy(this.camera.quaternion);
        
        const labelData = {
            id: Date.now(),
            object: label,
            position: position.clone(),
            text: labelDiv.textContent,
            element: labelDiv,
            setName: setName,
            ray: null,
            rayData: null,
            rayColor: null,
            backgroundColor: defaultColor
        };
        
        this._setupLabelInteractions(labelData);
        this.labelScene.add(label);
        useStore.getState().addLabel(labelData);
        this.labels.push(labelData);
        
        Toast.success('Label created');
        return labelData;
    }

    toggleLabelRay(labelData, normal = null) {
        if (labelData.ray) {
            this.scene.remove(labelData.ray);
            labelData.ray = null;
            labelData.rayData = null;
            labelData.rayColor = null;
            
            // Reset to default or previous background color
            labelData.element.style.backgroundColor = labelData.backgroundColor;
            
            const state = useStore.getState();
            const labels = state.labels.map(l => 
                l.id === labelData.id ? { ...l, rayData: null, rayColor: null } : l
            );
            state.setLabels(labels);
            Toast.info('Ray removed');
            return;
        }

        const rayLength = 4;
        const rayColor = useStore.getState().currentRayColor;
        
        // Update background color to match ray
        const backgroundColor = new THREE.Color(rayColor).getStyle();
        labelData.element.style.backgroundColor = backgroundColor;
        labelData.backgroundColor = backgroundColor;
        
        // Update text color based on background brightness
        const color = new THREE.Color(rayColor);
        const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
        labelData.element.style.color = brightness > 0.5 ? '#000000' : '#ffffff';
        
        const direction = new THREE.Vector3();
        direction.copy(labelData.position).sub(this.camera.position).normalize();
        
        const points = [
            direction.clone().multiplyScalar(-rayLength).add(labelData.position),
            direction.clone().multiplyScalar(rayLength).add(labelData.position)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: rayColor,
            linewidth: 3,
            transparent: true,
            opacity: 0.7
        });
        
        const ray = new THREE.Line(geometry, material);
        this.scene.add(ray);
        labelData.ray = ray;
        
        const rayData = {
            direction: direction.toArray(),
            length: rayLength,
            color: rayColor
        };
        labelData.rayData = rayData;
        labelData.rayColor = rayColor;
        
        const state = useStore.getState();
        const labels = state.labels.map(l => 
            l.id === labelData.id ? { ...l, rayData, rayColor, backgroundColor } : l
        );
        state.setLabels(labels);
        Toast.success('Ray added');
    }

    updateLabelVisibility() {
        this.labels.forEach(label => {
            if (useStore.getState().isDevelopmentMode) {
                label.element.classList.add('dev-mode');
            } else {
                label.element.classList.remove('dev-mode');
            }
        });
    }

    clearAllLabels() {
        while (this.labels.length > 0) {
            const label = this.labels[0];
            if (label.ray) {
                this.scene.remove(label.ray);
            }
            this.labelScene.remove(label.object);
            this.labels.splice(0, 1);
        }
        useStore.getState().clearLabels();
    }

    _setupLabelInteractions(labelData) {
        const { element } = labelData;

        // Edit functionality
        element.addEventListener('dblclick', (event) => {
            if (!useStore.getState().isDevelopmentMode) return;
            event.stopPropagation();
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = element.textContent;
            input.className = 'label-edit';
            
            element.textContent = '';
            element.appendChild(input);
            input.focus();
            
            const finishEdit = () => {
                const newText = input.value.trim() || element.textContent;
                element.textContent = newText;
                labelData.text = newText;
                
                const state = useStore.getState();
                const labels = state.labels.map(l => 
                    l.id === labelData.id ? { ...l, text: newText } : l
                );
                state.setLabels(labels);
                Toast.success('Label updated');
            };
            
            input.addEventListener('blur', finishEdit);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    finishEdit();
                }
            });
        });
        
        // Delete functionality
        const deleteButton = document.createElement('span');
        deleteButton.textContent = '×';
        deleteButton.className = 'delete-button';
        
        element.appendChild(deleteButton);
        
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.labelScene.remove(labelData.object);
            useStore.getState().removeLabel(labelData.id);
            const index = this.labels.findIndex(l => l.id === labelData.id);
            if (index !== -1) {
                this.labels.splice(index, 1);
            }
            Toast.info('Label deleted');
        });
        
        // Ray toggle functionality
        element.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            if (!useStore.getState().isDevelopmentMode) return;
            this.toggleLabelRay(labelData);
        });
    }

    _updateLabelDisplay() {
        // Update the label sets display
        this.updateLabelSetsDisplay();
    }

    updateLabelSetsDisplay() {
        // Implementation of label sets display update
        // This will be implemented in the next iteration
    }

    saveLabelPositions(setName) {
        const labelData = {
            name: setName,
            date: new Date().toISOString(),
            labels: this.labels
                .filter(label => !label.setName || label.setName === setName)
                .map(label => ({
                    position: {
                        x: label.object.position.x,
                        y: label.object.position.y,
                        z: label.object.position.z
                    },
                    text: label.text,
                    rayData: label.rayData,
                    backgroundColor: label.backgroundColor
                }))
        };
        
        // Add to label sets and save hierarchy
        const hierarchyData = {
            labelSet: labelData,
            hierarchy: useStore.getState().saveHierarchy()
        };
        
        // Save to file
        const dataStr = JSON.stringify(hierarchyData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `skull-labels-${setName.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Add to store
        useStore.getState().addLabelSet(labelData);
    }
}

customElements.define('game-label-manager', LabelManager);

export default LabelManager; 