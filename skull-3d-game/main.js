import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

class LabelSetNode {
    constructor(labelSet) {
        this.labelSet = labelSet;
        this.next = null;
        this.prev = null;
        this.isVisible = false;
        
        // Hierarchical relationships
        this.parent = null;
        this.children = new Set();
        this.depth = 0; // Track nesting level
        this.isExpanded = true; // For collapse/expand functionality
    }

    toJSON() {
        return {
            labelSet: this.labelSet,
            children: Array.from(this.children).map(child => child.toJSON()),
            isExpanded: this.isExpanded
        };
    }
}

class SkullGame {
    constructor() {
        // Background handling - initialize first
        this.defaultBackgroundUrl = 'https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=1920&q=80';
        this.backgroundPresets = [
            { name: 'Deep Space', url: 'https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=1920&q=80' },
            { name: 'Nebula', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80' },
            { name: 'Galaxy', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1920&q=80' },
            { name: 'Abstract', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80' }
        ];
        this.backgroundUrl = localStorage.getItem('backgroundUrl') || this.defaultBackgroundUrl;
        this.backgroundColor = localStorage.getItem('backgroundColor') || '#000000';
        
        // Initialize ray color
        this.currentRayColor = localStorage.getItem('rayColor') || '#ff0000';

        // Add keyboard shortcut for dev mode
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.repeat && e.target === document.body) {
                e.preventDefault(); // Prevent page scroll
                this.toggleDevMode();
            }
        });

        this.container = document.querySelector('#scene-container');
        this.scene = new THREE.Scene();
        this.labelScene = new THREE.Scene(); // Separate scene for labels
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        // Set up WebGL renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Set up CSS3D renderer
        this.labelRenderer = new CSS3DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.container.appendChild(this.labelRenderer.domElement);
        
        // Set up camera position
        this.camera.position.z = 5;
        
        // Set up controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Set up lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        // Add hemisphere light for better ambient illumination
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        hemisphereLight.position.set(0, 1, 0);
        this.scene.add(hemisphereLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        // Initialize label sets as linked list
        this.firstLabelSet = null;
        this.lastLabelSet = null;
        this.labelSetCount = 0;
        
        // Initialize development mode
        this.isDevelopmentMode = false;
        this.labels = [];
        this.setupDevelopmentMode();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Setup click handling for label placement
        this.renderer.domElement.addEventListener('click', this.onSceneClick.bind(this));
        this.renderer.domElement.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent the context menu
            this.onSceneClick(e);
        });
        
        // Start animation loop
        this.animate();
        
        // Load the skull model
        this.loadSkullModel();

        // Setup background after scene is initialized
        this.setupBackground();
    }
    
    setupDevelopmentMode() {
        // Create development mode UI
        const devModeContainer = document.createElement('div');
        devModeContainer.style.position = 'absolute';
        devModeContainer.style.top = '20px';
        devModeContainer.style.left = '20px';
        devModeContainer.style.zIndex = '1000';
        devModeContainer.style.display = 'flex';
        devModeContainer.style.flexDirection = 'column';
        devModeContainer.style.gap = '15px';
        devModeContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        devModeContainer.style.padding = '20px';
        devModeContainer.style.borderRadius = '8px';
        devModeContainer.style.maxWidth = '400px';
        devModeContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        devModeContainer.style.backdropFilter = 'blur(10px)';
        devModeContainer.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        
        // Helper function to create collapsible sections
        const createCollapsibleSection = (title, emoji, content, defaultExpanded = true) => {
            const section = document.createElement('div');
            section.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
            section.style.paddingBottom = '15px';
            
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.gap = '10px';
            header.style.cursor = 'pointer';
            header.style.padding = '10px 0';
            header.style.userSelect = 'none';
            
            const arrow = document.createElement('span');
            arrow.textContent = defaultExpanded ? '▼' : '▶';
            arrow.style.transition = 'transform 0.2s';
            arrow.style.width = '12px';
            
            const titleText = document.createElement('div');
            titleText.textContent = `${emoji} ${title}`;
            titleText.style.fontSize = '14px';
            titleText.style.fontWeight = 'bold';
            titleText.style.color = '#333';
            
            header.appendChild(arrow);
            header.appendChild(titleText);
            
            const contentDiv = document.createElement('div');
            contentDiv.style.display = defaultExpanded ? 'block' : 'none';
            contentDiv.style.transition = 'all 0.2s';
            contentDiv.style.overflow = 'hidden';
            contentDiv.appendChild(content);
            
            header.onclick = () => {
                const isExpanded = contentDiv.style.display !== 'none';
                arrow.textContent = isExpanded ? '▶' : '▼';
                contentDiv.style.display = isExpanded ? 'none' : 'block';
            };
            
            section.appendChild(header);
            section.appendChild(contentDiv);
            
            return section;
        };

        // Create Label Set Manager section content
        const labelSetContent = document.createElement('div');
        labelSetContent.style.display = 'flex';
        labelSetContent.style.flexDirection = 'column';
        labelSetContent.style.gap = '15px';
        labelSetContent.style.paddingTop = '10px';

        // Move existing label set manager content
        const inputRow = document.createElement('div');
        inputRow.style.display = 'flex';
        inputRow.style.gap = '10px';
        inputRow.style.alignItems = 'center';
        
        const labelSetNameInput = document.createElement('input');
        labelSetNameInput.type = 'text';
        labelSetNameInput.placeholder = 'Label Set Name';
        this.applyInputStyle(labelSetNameInput);
        
        const saveButton = document.createElement('button');
        saveButton.textContent = '💾 Save';
        this.applyButtonStyle(saveButton);
        saveButton.onclick = () => {
            const setName = labelSetNameInput.value.trim() || 'Untitled Set';
            this.saveLabelPositions(setName);
        };
        
        inputRow.appendChild(labelSetNameInput);
        inputRow.appendChild(saveButton);
        
        const topControls = document.createElement('div');
        topControls.style.display = 'flex';
        topControls.style.gap = '10px';
        topControls.style.alignItems = 'center';
        
        const devModeToggle = document.createElement('button');
        devModeToggle.id = 'dev-mode-toggle';
        devModeToggle.textContent = 'Toggle Dev Mode';
        this.applyButtonStyle(devModeToggle);
        devModeToggle.onclick = () => this.toggleDevMode();
        
        const loadButton = document.createElement('button');
        loadButton.textContent = '📁 Import';
        this.applyButtonStyle(loadButton);
        loadButton.onclick = () => {
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
                            } else if (data.labels) {
                                this.addLabelSet(data);
                            } else {
                                throw new Error('Invalid label set format');
                            }
                            this.updateLabelSetsDisplay(this.labelSetsContainer);
                        } catch (error) {
                            console.error('Error loading label set:', error);
                            alert('Error loading label set. Please check the file format.');
                        }
                    };
                    reader.readAsText(file);
                });
            };
            input.click();
        };
        
        const clearButton = document.createElement('button');
        clearButton.textContent = '🗑️ Clear All';
        this.applyButtonStyle(clearButton, true);
        clearButton.onclick = () => {
            if (confirm('Are you sure you want to clear all labels?')) {
                this.clearAllLabels();
                this.labelSetCount = 0;
                this.updateLabelSetsDisplay(this.labelSetsContainer);
            }
        };
        
        topControls.appendChild(devModeToggle);
        topControls.appendChild(loadButton);
        topControls.appendChild(clearButton);
        
        const labelSetsContainer = document.createElement('div');
        labelSetsContainer.id = 'label-sets-container';
        this.labelSetsContainer = labelSetsContainer;
        labelSetsContainer.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        labelSetsContainer.style.borderRadius = '6px';
        labelSetsContainer.style.padding = '15px';
        labelSetsContainer.style.maxHeight = '300px';
        labelSetsContainer.style.overflowY = 'auto';
        labelSetsContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        labelSetsContainer.style.backdropFilter = 'blur(5px)';
        
        labelSetContent.appendChild(topControls);
        labelSetContent.appendChild(inputRow);
        labelSetContent.appendChild(labelSetsContainer);

        // Create Ray Settings section content
        const rayContent = document.createElement('div');
        rayContent.style.display = 'flex';
        rayContent.style.flexDirection = 'column';
        rayContent.style.gap = '10px';
        rayContent.style.paddingTop = '10px';
        
        const rayColorRow = document.createElement('div');
        rayColorRow.style.display = 'flex';
        rayColorRow.style.alignItems = 'center';
        rayColorRow.style.gap = '10px';
        
        const rayColorLabel = document.createElement('label');
        rayColorLabel.textContent = 'Ray Color:';
        rayColorLabel.style.fontSize = '14px';
        
        const rayColorPicker = document.createElement('input');
        rayColorPicker.type = 'color';
        rayColorPicker.value = this.currentRayColor;
        rayColorPicker.style.width = '50px';
        rayColorPicker.style.height = '30px';
        rayColorPicker.style.padding = '0';
        rayColorPicker.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        rayColorPicker.style.borderRadius = '4px';
        rayColorPicker.style.cursor = 'pointer';
        
        rayColorPicker.addEventListener('input', (e) => {
            this.currentRayColor = e.target.value;
            localStorage.setItem('rayColor', this.currentRayColor);
        });
        
        rayColorRow.appendChild(rayColorLabel);
        rayColorRow.appendChild(rayColorPicker);
        rayContent.appendChild(rayColorRow);

        // Create Background Settings section content
        const backgroundContent = document.createElement('div');
        backgroundContent.style.display = 'flex';
        backgroundContent.style.flexDirection = 'column';
        backgroundContent.style.gap = '15px';
        backgroundContent.style.paddingTop = '10px';

        // Add background title
        const backgroundTitle = document.createElement('div');
        backgroundTitle.textContent = 'Background Preview';
        backgroundTitle.style.fontSize = '14px';
        backgroundTitle.style.fontWeight = 'bold';
        backgroundTitle.style.color = '#333';

        // Preview section
        const previewSection = document.createElement('div');
        previewSection.style.display = 'flex';
        previewSection.style.flexDirection = 'column';
        previewSection.style.gap = '10px';

        const preview = document.createElement('div');
        preview.style.width = '100%';
        preview.style.height = '100px';
        preview.style.borderRadius = '6px';
        preview.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
        preview.style.transition = 'all 0.3s ease';
        preview.style.cursor = 'pointer';
        preview.title = 'Click to upload image';

        const updatePreview = (url) => {
            if (url === 'color') {
                preview.style.backgroundColor = this.backgroundColor;
                preview.style.backgroundImage = 'none';
            } else {
                preview.style.backgroundImage = `url(${url})`;
            }
        };
        updatePreview(this.backgroundUrl);

        // File upload handling
        preview.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const dataUrl = e.target.result;
                        updatePreview(dataUrl);
                        this.updateBackground(dataUrl);
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        };

        // URL input
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.placeholder = 'Enter image URL';
        urlInput.value = this.backgroundUrl === 'color' ? '' : this.backgroundUrl;
        this.applyInputStyle(urlInput);

        // Color picker section
        const colorSection = document.createElement('div');
        colorSection.style.display = 'flex';
        colorSection.style.alignItems = 'center';
        colorSection.style.gap = '10px';

        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = this.backgroundColor;
        colorPicker.style.width = '50px';
        colorPicker.style.height = '30px';
        colorPicker.style.padding = '0';
        colorPicker.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        colorPicker.style.borderRadius = '4px';
        colorPicker.style.cursor = 'pointer';

        const useColorButton = document.createElement('button');
        useColorButton.textContent = 'Use Color';
        this.applyButtonStyle(useColorButton);
        useColorButton.onclick = () => {
            this.updateBackground('color', colorPicker.value);
            updatePreview('color');
        };

        colorSection.appendChild(colorPicker);
        colorSection.appendChild(useColorButton);

        // Presets section
        const presetsSection = document.createElement('div');
        presetsSection.style.display = 'grid';
        presetsSection.style.gridTemplateColumns = 'repeat(2, 1fr)';
        presetsSection.style.gap = '10px';
        presetsSection.style.marginTop = '10px';

        this.backgroundPresets.forEach(preset => {
            const presetButton = document.createElement('button');
            presetButton.textContent = preset.name;
            this.applyButtonStyle(presetButton);
            presetButton.style.backgroundImage = `url(${preset.url})`;
            presetButton.style.backgroundSize = 'cover';
            presetButton.style.backgroundPosition = 'center';
            presetButton.style.height = '40px';
            presetButton.style.color = 'white';
            presetButton.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
            presetButton.onclick = () => {
                urlInput.value = preset.url;
                this.updateBackground(preset.url);
                updatePreview(preset.url);
            };
            presetsSection.appendChild(presetButton);
        });

        // Apply button for URL
        const applyButton = document.createElement('button');
        applyButton.textContent = '✓ Apply URL';
        this.applyButtonStyle(applyButton);
        applyButton.onclick = () => {
            const url = urlInput.value.trim();
            if (url) {
                this.updateBackground(url);
                updatePreview(url);
            }
        };

        // Reset button
        const resetButton = document.createElement('button');
        resetButton.textContent = '↺ Reset';
        this.applyButtonStyle(resetButton);
        resetButton.onclick = () => {
            urlInput.value = this.defaultBackgroundUrl;
            this.updateBackground(this.defaultBackgroundUrl);
            updatePreview(this.defaultBackgroundUrl);
        };

        const buttonsRow = document.createElement('div');
        buttonsRow.style.display = 'flex';
        buttonsRow.style.gap = '10px';
        buttonsRow.appendChild(applyButton);
        buttonsRow.appendChild(resetButton);

        // Assemble the background section
        previewSection.appendChild(preview);
        backgroundContent.appendChild(backgroundTitle);
        backgroundContent.appendChild(previewSection);
        backgroundContent.appendChild(urlInput);
        backgroundContent.appendChild(buttonsRow);
        backgroundContent.appendChild(colorSection);
        backgroundContent.appendChild(presetsSection);

        // Create and add collapsible sections
        const labelSetSection = createCollapsibleSection('Label Set Manager', '🏷️', labelSetContent, true);
        const raySection = createCollapsibleSection('Ray Settings', '🎯', rayContent, true);
        const backgroundSection = createCollapsibleSection('Background Settings', '🖼️', backgroundContent, false);

        devModeContainer.appendChild(labelSetSection);
        devModeContainer.appendChild(raySection);
        devModeContainer.appendChild(backgroundSection);

        document.body.appendChild(devModeContainer);
        this.updateLabelSetsDisplay(this.labelSetsContainer);
    }
    
    // Helper methods for consistent styling
    applyButtonStyle(button, isDangerous = false) {
        button.style.padding = '8px 16px';
        button.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        button.style.borderRadius = '6px';
        button.style.backgroundColor = isDangerous ? '#fff0f0' : '#ffffff';
        button.style.color = isDangerous ? '#dc3545' : '#333333';
        button.style.cursor = 'pointer';
        button.style.transition = 'all 0.2s ease';
        button.style.fontSize = '14px';
        button.style.fontWeight = '500';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.gap = '5px';
        button.style.minWidth = '80px';
        
        button.onmouseenter = () => {
            button.style.backgroundColor = isDangerous ? '#ffe6e6' : '#f5f5f5';
            button.style.transform = 'translateY(-1px)';
            button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        };
        
        button.onmouseleave = () => {
            button.style.backgroundColor = isDangerous ? '#fff0f0' : '#ffffff';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        };
    }
    
    applyInputStyle(input) {
        input.style.padding = '8px 12px';
        input.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        input.style.borderRadius = '6px';
        input.style.fontSize = '14px';
        input.style.flexGrow = '1';
        input.style.transition = 'all 0.2s ease';
        input.style.backgroundColor = '#ffffff';
        input.style.outline = 'none';
        
        input.onfocus = () => {
            input.style.borderColor = '#4a90e2';
            input.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.1)';
        };
        
        input.onblur = () => {
            input.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            input.style.boxShadow = 'none';
        };
    }
    
    addLabelSet(labelSet, parentName = null) {
        const node = new LabelSetNode(labelSet);
        
        // Handle parent-child relationship
        if (parentName) {
            const parentNode = this.findLabelSetNode(parentName);
            if (parentNode) {
                node.parent = parentNode;
                node.depth = parentNode.depth + 1;
                parentNode.children.add(node);
            }
        }
        
        if (!this.firstLabelSet) {
            this.firstLabelSet = node;
            this.lastLabelSet = node;
        } else {
            node.prev = this.lastLabelSet;
            this.lastLabelSet.next = node;
            this.lastLabelSet = node;
        }
        
        this.labelSetCount++;
        return node;
    }
    
    findLabelSetNode(name) {
        let current = this.firstLabelSet;
        while (current) {
            if (current.labelSet.name === name) {
                return current;
            }
            current = current.next;
        }
        return null;
    }
    
    removeLabelSet(name) {
        const node = this.findLabelSetNode(name);
        if (!node) return;
        
        // Remove associated labels if visible
        if (node.isVisible) {
            this.labels = this.labels.filter(label => {
                if (label.setName === name) {
                    this.labelScene.remove(label.object);
                    return false;
                }
                return true;
            });
        }
        
        // Update linked list connections
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.firstLabelSet = node.next;
        }
        
        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this.lastLabelSet = node.prev;
        }
        
        this.labelSetCount--;
    }
    
    isLabelSetVisible(name) {
        const node = this.findLabelSetNode(name);
        return node ? node.isVisible : false;
    }
    
    toggleLabelSet(name) {
        const node = this.findLabelSetNode(name);
        if (!node) return;
        
        if (node.isVisible) {
            // Hide this set
            node.isVisible = false;
            this.labels = this.labels.filter(label => {
                if (label.setName === name) {
                    this.labelScene.remove(label.object);
                    return false;
                }
                return true;
            });
        } else {
            // Show this set
            node.isVisible = true;
            this.loadLabelSet(node.labelSet, name);
        }
    }
    
    clearAllLabels() {
        let current = this.firstLabelSet;
        while (current) {
            current.isVisible = false;
            current = current.next;
        }
        
        while (this.labels.length > 0) {
            const label = this.labels[0];
            if (label.ray) {
                this.scene.remove(label.ray);
            }
            this.labelScene.remove(label.object);
            this.labels.splice(0, 1);
        }
    }
    
    updateLabelVisibility() {
        this.labels.forEach(label => {
            if (this.isDevelopmentMode) {
                label.element.classList.add('dev-mode');
            } else {
                label.element.classList.remove('dev-mode');
            }
        });
    }
    
    onSceneClick(event) {
        if (!this.isDevelopmentMode) return;
        
        // Calculate mouse position in normalized device coordinates
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Raycasting for clicking on the skull
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        if (this.skull) {
            const intersects = raycaster.intersectObject(this.skull, true);
            if (intersects.length > 0) {
                const intersection = intersects[0];
                const point = intersection.point;
                
                if (event.button === 2) { // Right click
                    event.preventDefault();
                    // Create a new label with a ray at the clicked point
                    const label = this.createLabel(point);
                    this.toggleLabelRay(label, intersection.face.normal);
                } else { // Left click
                    this.createLabel(point);
                }
            }
        }
    }
    
    loadLabelSet(labelSet, setName) {
        // Create new labels from the loaded data
        labelSet.labels.forEach(labelData => {
            const position = new THREE.Vector3(
                labelData.position.x,
                labelData.position.y,
                labelData.position.z
            );
            const label = this.createLabel(position, labelData.text, setName);
            
            // Restore ray if it was saved
            if (labelData.rayData) {
                label.rayColor = labelData.rayData.color;
                this.toggleLabelRay(label);
            }
        });
    }
    
    createLabel(position, text = null, setName = null) {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'label dev-mode';
        labelDiv.textContent = text || `Label ${this.labels.length + 1}`;
        // Set initial background color to default label color
        labelDiv.style.backgroundColor = 'rgba(255, 220, 220, 0.9)';
        
        // Create the CSS3D object first
        const label = new CSS3DObject(labelDiv);
        label.position.copy(position);
        label.scale.set(0.01, 0.01, 0.01);
        
        // Store the label data
        const labelData = {
            object: label,
            position: position.clone(),
            text: labelDiv.textContent,
            element: labelDiv,
            setName: setName,
            ray: null,
            rayData: null,
            rayColor: null
        };
        
        // Add edit functionality
        labelDiv.addEventListener('dblclick', (event) => {
            if (!this.isDevelopmentMode) return;
            event.stopPropagation();
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = labelDiv.textContent;
            input.className = 'label-edit';
            input.style.width = '100px';
            input.style.fontSize = '8px';
            input.style.padding = '2px';
            
            labelDiv.textContent = '';
            labelDiv.appendChild(input);
            input.focus();
            
            const finishEdit = () => {
                const newText = input.value.trim() || labelDiv.textContent;
                labelDiv.textContent = newText;
                labelData.text = newText;
            };
            
            input.addEventListener('blur', finishEdit);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    finishEdit();
                }
            });
        });
        
        // Add delete functionality
        const deleteButton = document.createElement('span');
        deleteButton.textContent = '×';
        deleteButton.className = 'delete-button';
        deleteButton.style.position = 'absolute';
        deleteButton.style.right = '-8px';
        deleteButton.style.top = '-8px';
        deleteButton.style.backgroundColor = '#ff4444';
        deleteButton.style.color = 'white';
        deleteButton.style.borderRadius = '50%';
        deleteButton.style.width = '16px';
        deleteButton.style.height = '16px';
        deleteButton.style.textAlign = 'center';
        deleteButton.style.lineHeight = '14px';
        deleteButton.style.cursor = 'pointer';
        deleteButton.style.fontSize = '14px';
        deleteButton.style.display = 'none';
        
        labelDiv.appendChild(deleteButton);
        
        // Show/hide delete button based on hover
        labelDiv.addEventListener('mouseenter', () => {
            if (this.isDevelopmentMode) {
                deleteButton.style.display = 'block';
            }
        });
        
        labelDiv.addEventListener('mouseleave', () => {
            deleteButton.style.display = 'none';
        });
        
        // Handle delete click
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const index = this.labels.indexOf(labelData);
            if (index !== -1) {
                this.labelScene.remove(label);
                this.labels.splice(index, 1);
            }
        });
        
        // Update toggleLabelRay to use the current ray color
        labelDiv.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            if (!this.isDevelopmentMode) return;
            this.toggleLabelRay(labelData);
        });
        
        this.labelScene.add(label);
        this.labels.push(labelData);
        
        return labelData;
    }
    
    toggleLabelRay(labelData, normal = null) {
        if (labelData.ray) {
            // Remove existing ray
            this.scene.remove(labelData.ray);
            labelData.ray = null;
            labelData.rayData = null;
            labelData.rayColor = null;
            // Reset label background to default
            labelData.element.style.backgroundColor = 'rgba(255, 220, 220, 0.9)';
            return;
        }

        // Create ray geometry
        const rayLength = 4;
        const rayColor = this.currentRayColor;
        
        // Update label background color to match ray color
        labelData.element.style.backgroundColor = new THREE.Color(rayColor).getStyle();
        labelData.rayColor = rayColor;
        
        // Calculate direction from camera to point
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
        
        // Store ray data for saving/loading
        labelData.rayData = {
            direction: direction.toArray(),
            length: rayLength,
            color: rayColor
        };
    }
    
    saveLabelPositions(setName) {
        const labelData = {
            name: setName,
            date: new Date().toISOString(),
            labels: this.labels.filter(label => !label.setName || label.setName === setName).map(label => ({
                position: {
                    x: label.object.position.x,
                    y: label.object.position.y,
                    z: label.object.position.z
                },
                text: label.text,
                rayData: label.rayData // Save ray properties if exists
            }))
        };
        
        // Add to label sets
        const node = this.addLabelSet(labelData);
        this.updateLabelSetsDisplay(this.labelSetsContainer);
        
        // Save to file with hierarchy
        const hierarchyData = {
            labelSet: labelData,
            hierarchy: this.saveHierarchy()
        };
        
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
    }

    saveHierarchy() {
        const rootNodes = [];
        let current = this.firstLabelSet;
        
        while (current) {
            if (!current.parent) {
                rootNodes.push(current.toJSON());
            }
            current = current.next;
        }
        
        return rootNodes;
    }

    loadHierarchy(hierarchyData) {
        // Clear existing sets first
        this.clearAllLabels();
        this.firstLabelSet = null;
        this.lastLabelSet = null;
        this.labelSetCount = 0;
        
        const loadNode = (nodeData, parent = null) => {
            // Ensure the labelSet has required properties
            if (!nodeData.labelSet) {
                nodeData = { labelSet: nodeData }; // Convert old format to new
            }
            if (!nodeData.labelSet.labels) {
                nodeData.labelSet.labels = [];
            }
            if (!nodeData.labelSet.date) {
                nodeData.labelSet.date = new Date().toISOString();
            }
            
            const node = this.addLabelSet(nodeData.labelSet, parent?.labelSet.name);
            node.isExpanded = nodeData.isExpanded ?? true;
            
            if (nodeData.children) {
                nodeData.children.forEach(childData => {
                    loadNode(childData, node);
                });
            }
            
            return node;
        };
        
        // Handle both array and single node formats
        if (Array.isArray(hierarchyData)) {
            hierarchyData.forEach(nodeData => loadNode(nodeData));
        } else {
            loadNode(hierarchyData);
        }
    }

    updateLabelSetsDisplay(container) {
        container.innerHTML = '';
        if (this.labelSetCount === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = 'No label sets loaded';
            emptyMessage.style.color = '#666';
            emptyMessage.style.fontStyle = 'italic';
            container.appendChild(emptyMessage);
            return;
        }

        const createSetElement = (node, isVisible = true) => {
            const setElement = document.createElement('div');
            if (!isVisible) {
                setElement.style.display = 'none';
            }
            
            setElement.style.display = isVisible ? 'flex' : 'none';
            setElement.style.justifyContent = 'space-between';
            setElement.style.alignItems = 'center';
            setElement.style.padding = '5px';
            setElement.style.borderBottom = '1px solid #eee';
            setElement.style.marginLeft = `${node.depth * 20}px`;
            
            // Add visual connection lines
            if (node.depth > 0) {
                const line = document.createElement('div');
                line.style.position = 'absolute';
                line.style.left = `${(node.depth * 20) - 15}px`;
                line.style.width = '15px';
                line.style.height = '1px';
                line.style.backgroundColor = '#ccc';
                line.style.top = '50%';
                setElement.style.position = 'relative';
                setElement.appendChild(line);
            }
            
            const setInfo = document.createElement('div');
            setInfo.style.flex = '1';
            setInfo.style.display = 'flex';
            setInfo.style.alignItems = 'center';
            setInfo.style.gap = '5px';
            
            // Add expand/collapse button if has children
            if (node.children.size > 0) {
                const expandBtn = document.createElement('button');
                expandBtn.textContent = node.isExpanded ? '▼' : '▶';
                expandBtn.style.padding = '0 4px';
                expandBtn.style.fontSize = '10px';
                expandBtn.onclick = () => {
                    node.isExpanded = !node.isExpanded;
                    this.updateLabelSetsDisplay(container);
                };
                setInfo.appendChild(expandBtn);
            }
            
            const setName = document.createElement('div');
            setName.textContent = node.labelSet.name;
            setName.style.fontWeight = 'bold';
            
            const setDetails = document.createElement('div');
            setDetails.textContent = `${node.labelSet.labels.length} labels • ${new Date(node.labelSet.date).toLocaleDateString()}`;
            setDetails.style.fontSize = '0.8em';
            setDetails.style.color = '#666';
            
            const controls = document.createElement('div');
            controls.style.display = 'flex';
            controls.style.gap = '5px';
            
            // Add move controls
            const moveControls = document.createElement('div');
            moveControls.style.display = 'flex';
            moveControls.style.gap = '2px';
            moveControls.style.marginRight = '5px';
            
            const moveUpBtn = document.createElement('button');
            moveUpBtn.textContent = '↑';
            moveUpBtn.style.padding = '2px 4px';
            moveUpBtn.onclick = () => {
                if (node.prev) {
                    this.moveSetBefore(node.labelSet.name, node.prev.labelSet.name);
                    this.updateLabelSetsDisplay(container);
                }
            };
            
            const moveDownBtn = document.createElement('button');
            moveDownBtn.textContent = '↓';
            moveDownBtn.style.padding = '2px 4px';
            moveDownBtn.onclick = () => {
                if (node.next) {
                    this.moveSetAfter(node.labelSet.name, node.next.labelSet.name);
                    this.updateLabelSetsDisplay(container);
                }
            };
            
            moveControls.appendChild(moveUpBtn);
            moveControls.appendChild(moveDownBtn);
            
            const toggleButton = document.createElement('button');
            toggleButton.textContent = node.isVisible ? 'Hide' : 'Show';
            toggleButton.onclick = () => {
                this.toggleLabelSet(node.labelSet.name);
                toggleButton.textContent = this.isLabelSetVisible(node.labelSet.name) ? 'Hide' : 'Show';
            };
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '×';
            deleteButton.style.color = 'red';
            deleteButton.onclick = () => {
                this.removeLabelSet(node.labelSet.name);
                this.updateLabelSetsDisplay(container);
            };
            
            setInfo.appendChild(setName);
            setInfo.appendChild(setDetails);
            controls.appendChild(moveControls);
            controls.appendChild(toggleButton);
            controls.appendChild(deleteButton);
            
            setElement.appendChild(setInfo);
            setElement.appendChild(controls);
            
            // Make the set element draggable
            setElement.draggable = true;
            setElement.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', node.labelSet.name);
            };
            
            setElement.ondragover = (e) => {
                e.preventDefault();
                const rect = setElement.getBoundingClientRect();
                const isBottomHalf = e.clientY > rect.top + rect.height / 2;
                const draggedName = e.dataTransfer.getData('text/plain');
                const draggedNode = this.findLabelSetNode(draggedName);
                
                // Reset all styles first
                setElement.style.borderTop = '';
                setElement.style.borderBottom = '';
                setElement.style.backgroundColor = '';
                
                // Check if this would create an invalid relationship
                if (draggedNode === node || (isBottomHalf && this.isDescendant(draggedNode, node))) {
                    setElement.style.backgroundColor = 'rgba(255, 200, 200, 0.3)';
                    setElement.title = 'Cannot create circular relationship';
                    return;
                }
                
                // Show appropriate drop indicator
                if (isBottomHalf) {
                    setElement.style.borderBottom = '2px solid #4CAF50';
                    setElement.title = 'Drop to make this a parent';
                } else {
                    setElement.style.borderTop = '2px solid #2196F3';
                    setElement.title = 'Drop to reorder';
                }
            };
            
            setElement.ondragleave = () => {
                setElement.style.borderTop = '';
                setElement.style.borderBottom = '';
                setElement.style.backgroundColor = '';
                setElement.title = '';
            };
            
            setElement.ondrop = (e) => {
                e.preventDefault();
                setElement.style.borderTop = '';
                setElement.style.borderBottom = '';
                setElement.style.backgroundColor = '';
                setElement.title = '';
                
                const draggedName = e.dataTransfer.getData('text/plain');
                const draggedNode = this.findLabelSetNode(draggedName);
                
                if (draggedName === node.labelSet.name) return; // Prevent self-drop
                
                const rect = setElement.getBoundingClientRect();
                const isBottomHalf = e.clientY > rect.top + rect.height / 2;
                
                if (isBottomHalf) {
                    // Attempt to set parent
                    if (!this.setParent(draggedName, node.labelSet.name)) {
                        // If setParent fails, show error feedback
                        const errorDiv = document.createElement('div');
                        errorDiv.textContent = 'Invalid parent-child relationship';
                        errorDiv.style.position = 'absolute';
                        errorDiv.style.backgroundColor = '#ff4444';
                        errorDiv.style.color = 'white';
                        errorDiv.style.padding = '4px 8px';
                        errorDiv.style.borderRadius = '4px';
                        errorDiv.style.fontSize = '12px';
                        errorDiv.style.zIndex = '1000';
                        errorDiv.style.left = `${e.clientX}px`;
                        errorDiv.style.top = `${e.clientY}px`;
                        
                        document.body.appendChild(errorDiv);
                        setTimeout(() => {
                            document.body.removeChild(errorDiv);
                        }, 2000);
                    }
                } else {
                    this.moveSetBefore(draggedName, node.labelSet.name);
                }
                
                this.updateLabelSetsDisplay(container);
            };
            
            return setElement;
        };

        // Recursively create and append elements
        const appendNode = (node, container, isVisible = true) => {
            const element = createSetElement(node, isVisible);
            container.appendChild(element);
            
            // Recursively append children if expanded
            if (node.isExpanded) {
                node.children.forEach(child => {
                    appendNode(child, container, isVisible);
                });
            }
        };

        // Start with root nodes
        let current = this.firstLabelSet;
        while (current) {
            if (!current.parent) {
                appendNode(current, container);
            }
            current = current.next;
        }
    }
    
    loadSkullModel() {
        const loader = new GLTFLoader();
        
        loader.load(
            'models/skull.glb',
            (gltf) => {
                this.skull = gltf.scene;
                this.scene.add(this.skull);
                
                // Center the model
                const box = new THREE.Box3().setFromObject(this.skull);
                const center = box.getCenter(new THREE.Vector3());
                this.skull.position.sub(center);
                
                // Scale the model appropriately
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3 / maxDim;
                this.skull.scale.multiplyScalar(scale);
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('An error occurred loading the model:', error);
            }
        );
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.labelScene, this.camera);
    }

    moveSetAfter(name, targetName) {
        const node = this.findLabelSetNode(name);
        const targetNode = this.findLabelSetNode(targetName);
        
        if (!node || !targetNode || node === targetNode) return false;
        
        // Remove node from current position
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.firstLabelSet = node.next;
        }
        
        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this.lastLabelSet = node.prev;
        }
        
        // Insert after target
        node.next = targetNode.next;
        node.prev = targetNode;
        
        if (targetNode.next) {
            targetNode.next.prev = node;
        } else {
            this.lastLabelSet = node;
        }
        
        targetNode.next = node;
        
        return true;
    }

    moveSetBefore(name, targetName) {
        const node = this.findLabelSetNode(name);
        const targetNode = this.findLabelSetNode(targetName);
        
        if (!node || !targetNode || node === targetNode) return false;
        
        // Remove node from current position
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.firstLabelSet = node.next;
        }
        
        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this.lastLabelSet = node.prev;
        }
        
        // Insert before target
        node.prev = targetNode.prev;
        node.next = targetNode;
        
        if (targetNode.prev) {
            targetNode.prev.next = node;
        } else {
            this.firstLabelSet = node;
        }
        
        targetNode.prev = node;
        
        return true;
    }

    setParent(childName, parentName) {
        const childNode = this.findLabelSetNode(childName);
        const parentNode = parentName ? this.findLabelSetNode(parentName) : null;
        
        if (!childNode || (parentName && !parentNode)) return false;
        
        // Prevent setting a node as its own parent
        if (childNode === parentNode) {
            console.warn('Cannot set a node as its own parent');
            return false;
        }
        
        // Check if the proposed parent is actually a descendant of the child
        const isDescendant = (node, potentialDescendant) => {
            if (!potentialDescendant) return false;
            if (node === potentialDescendant) return true;
            for (const child of potentialDescendant.children) {
                if (isDescendant(node, child)) return true;
            }
            return false;
        };
        
        if (parentNode && isDescendant(childNode, parentNode)) {
            console.warn('Cannot create circular parent-child relationship');
            return false;
        }
        
        // Remove from old parent if exists
        if (childNode.parent) {
            childNode.parent.children.delete(childNode);
        }
        
        // Update parent relationship
        childNode.parent = parentNode;
        if (parentNode) {
            parentNode.children.add(childNode);
            // Update depth for child and all its descendants
            this.updateNodeDepth(childNode, parentNode.depth + 1);
        } else {
            this.updateNodeDepth(childNode, 0);
        }
        
        return true;
    }

    updateNodeDepth(node, newDepth, visited = new Set()) {
        // Prevent infinite recursion
        if (visited.has(node)) {
            console.warn('Circular reference detected in label set hierarchy');
            return;
        }
        
        visited.add(node);
        node.depth = newDepth;
        
        // Update children's depth
        for (const child of node.children) {
            this.updateNodeDepth(child, newDepth + 1, visited);
        }
    }

    isDescendant(node, potentialDescendant) {
        if (!potentialDescendant) return false;
        if (node === potentialDescendant) return true;
        for (const child of potentialDescendant.children) {
            if (this.isDescendant(node, child)) return true;
        }
        return false;
    }

    setupBackground() {
        if (this.backgroundUrl === 'color') {
            // Use solid color background
            this.scene.background = new THREE.Color(this.backgroundColor);
        } else {
            // Create and load the background texture
            const loader = new THREE.TextureLoader();
            loader.load(this.backgroundUrl, 
                (texture) => {
                    texture.minFilter = THREE.LinearFilter; // Prevent pixelation
                    this.scene.background = texture;
                },
                undefined,
                (error) => {
                    console.error('Error loading background:', error);
                    // If loading fails, try loading the default background
                    if (this.backgroundUrl !== this.defaultBackgroundUrl) {
                        this.backgroundUrl = this.defaultBackgroundUrl;
                        localStorage.setItem('backgroundUrl', this.backgroundUrl);
                        this.setupBackground();
                    }
                }
            );
        }
    }

    updateBackground(url, color = null) {
        if (color) {
            this.backgroundColor = color;
            this.backgroundUrl = 'color';
            localStorage.setItem('backgroundColor', color);
        } else {
            this.backgroundUrl = url;
        }
        localStorage.setItem('backgroundUrl', this.backgroundUrl);
        this.setupBackground();
    }

    toggleDevMode() {
        this.isDevelopmentMode = !this.isDevelopmentMode;
        const devModeToggle = document.querySelector('#dev-mode-toggle');
        if (devModeToggle) {
            devModeToggle.style.backgroundColor = this.isDevelopmentMode ? '#ff4444' : '#ffffff';
            devModeToggle.style.color = this.isDevelopmentMode ? '#ffffff' : '#333333';
        }
        this.updateLabelVisibility();
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new SkullGame();
}); 