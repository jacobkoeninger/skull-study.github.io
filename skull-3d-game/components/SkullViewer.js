import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import useStore from '../store.js';
import { Toast, ensureComponentLoaded } from './index.js';

class SkullViewer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Create styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                width: 100%;
                height: 100vh;
                position: relative;
            }

            .viewer-container {
                width: 100%;
                height: 100%;
                position: relative;
            }

            #scene-container {
                width: 100%;
                height: 100%;
            }

            .controls {
                position: absolute;
                top: 20px;
                left: 20px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 15px;
                background: rgba(255, 255, 255, 0.95);
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.3);
                max-width: 400px;
            }
        `;

        // Create template
        const template = document.createElement('template');
        template.innerHTML = `
            <div class="viewer-container">
                <div id="scene-container"></div>
                <div class="controls">
                    <game-label-manager></game-label-manager>
                    <game-background-manager></game-background-manager>
                    <game-ray-settings></game-ray-settings>
                </div>
            </div>
        `;

        // Attach to shadow DOM
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    async connectedCallback() {
        // Ensure all required components are loaded
        await this.loadComponents();
        
        // Initialize Three.js components
        this.initializeScene();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load the skull model
        this.loadSkullModel();
        
        // Start animation loop
        this.animate();

        // Subscribe to store changes
        this.setupStoreSubscriptions();
    }

    disconnectedCallback() {
        // Cleanup event listeners
        this.cleanupEventListeners();
        
        // Stop animation loop
        this.isAnimating = false;
        
        // Dispose of Three.js resources
        this.dispose();
    }

    async loadComponents() {
        await Promise.all([
            ensureComponentLoaded('LabelManager'),
            ensureComponentLoaded('BackgroundManager'),
            ensureComponentLoaded('RaySettings')
        ]);

        // Get component references after they're loaded
        this.labelManager = this.shadowRoot.querySelector('game-label-manager');
        this.backgroundManager = this.shadowRoot.querySelector('game-background-manager');
        this.raySettings = this.shadowRoot.querySelector('game-ray-settings');
    }

    initializeScene() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.labelScene = new THREE.Scene();
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;

        // Renderer setup
        this.container = this.shadowRoot.querySelector('#scene-container');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // CSS3D renderer setup
        this.labelRenderer = new CSS3DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.container.appendChild(this.labelRenderer.domElement);

        // Controls setup
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Lighting setup
        this.setupLighting();

        // Initialize components
        this.initializeComponents();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        hemisphereLight.position.set(0, 1, 0);
        this.scene.add(hemisphereLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
    }

    initializeComponents() {
        // Initialize managers with necessary references
        if (this.labelManager && this.backgroundManager && this.raySettings) {
            this.labelManager.initialize(this.labelScene, this.scene, this.camera);
            this.backgroundManager.initialize(this.scene);
            this.raySettings.initialize();
        } else {
            console.error('Components not properly loaded');
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

                Toast.success('Skull model loaded successfully');
            },
            (xhr) => {
                const progress = (xhr.loaded / xhr.total * 100).toFixed(1);
                // Could emit a progress event here
            },
            (error) => {
                console.error('Error loading skull model:', error);
                Toast.error('Failed to load skull model');
            }
        );
    }

    setupEventListeners() {
        // Scene click handling
        this.renderer.domElement.addEventListener('click', this.handleSceneClick.bind(this));
        this.renderer.domElement.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        
        // Window resize handling
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Development mode toggle
        window.addEventListener('keydown', this.handleKeyPress.bind(this));
    }

    cleanupEventListeners() {
        window.removeEventListener('resize', this.handleResize.bind(this));
        window.removeEventListener('keydown', this.handleKeyPress.bind(this));
    }

    setupStoreSubscriptions() {
        useStore.subscribe(
            state => state.isDevelopmentMode,
            this.updateDevMode.bind(this)
        );

        useStore.subscribe(
            state => state.backgroundUrl,
            this.updateBackground.bind(this)
        );
    }

    handleSceneClick(event) {
        if (!useStore.getState().isDevelopmentMode) return;

        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        if (this.skull) {
            const intersects = raycaster.intersectObject(this.skull, true);
            if (intersects.length > 0) {
                const intersection = intersects[0];
                this.labelManager.createLabel(intersection.point);
            }
        }
    }

    handleContextMenu(event) {
        event.preventDefault();
        if (!useStore.getState().isDevelopmentMode) return;

        // Handle right-click for ray creation
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        if (this.skull) {
            const intersects = raycaster.intersectObject(this.skull, true);
            if (intersects.length > 0) {
                const intersection = intersects[0];
                const label = this.labelManager.createLabel(intersection.point);
                this.labelManager.toggleLabelRay(label, intersection.face.normal);
            }
        }
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);
    }

    handleKeyPress(event) {
        // Only handle space key when not typing in an input
        if (event.code === 'Space' && !event.repeat && 
            !(event.target instanceof HTMLInputElement) && 
            !(event.target instanceof HTMLTextAreaElement)) {
            event.preventDefault();
            useStore.getState().toggleDevMode();
        }
    }

    updateDevMode(isDev) {
        // Let the LabelManager handle its own updates through its subscription
        this.labelManager?.updateLabelVisibility();
    }

    updateBackground() {
        this.backgroundManager.setupBackground();
    }

    animate() {
        this.isAnimating = true;
        
        const animate = () => {
            if (!this.isAnimating) return;
            
            requestAnimationFrame(animate);
            
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
            this.labelRenderer.render(this.labelScene, this.camera);
        };
        
        animate();
    }

    dispose() {
        // Dispose of geometries
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Dispose of renderers
        this.renderer.dispose();
        this.labelRenderer.domElement.remove();

        // Clear scenes
        this.scene.clear();
        this.labelScene.clear();
    }
}

// Register the custom element
customElements.define('skull-viewer', SkullViewer);

export default SkullViewer; 