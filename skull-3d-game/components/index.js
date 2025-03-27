export { default as Modal } from './Modal.js';
export { default as Button } from './Button.js';
export { default as Collapsible } from './Collapsible.js';
export { default as Toast } from './Toast.js';
export { default as Tooltip } from './Tooltip.js';
export { default as Dropdown } from './Dropdown.js';
export { default as LabelManager } from './LabelManager.js';
export { default as BackgroundManager } from './BackgroundManager.js';
export { default as RaySettings } from './RaySettings.js';
export { default as SkullViewer } from './SkullViewer.js';

// Initialize all components
const components = {
    Modal: () => import('./Modal.js'),
    Button: () => import('./Button.js'),
    Collapsible: () => import('./Collapsible.js'),
    Toast: () => import('./Toast.js'),
    Tooltip: () => import('./Tooltip.js'),
    Dropdown: () => import('./Dropdown.js'),
    LabelManager: () => import('./LabelManager.js'),
    BackgroundManager: () => import('./BackgroundManager.js'),
    RaySettings: () => import('./RaySettings.js'),
    SkullViewer: () => import('./SkullViewer.js')
};

// Lazy load components when needed
export const loadComponent = async (name) => {
    if (components[name]) {
        return (await components[name]()).default;
    }
    throw new Error(`Component ${name} not found`);
};

// Helper function to ensure components are loaded
export const ensureComponentLoaded = async (name) => {
    if (!customElements.get(`game-${name.toLowerCase()}`)) {
        await loadComponent(name);
    }
};

// Initialize all required components
export const initializeComponents = async () => {
    await Promise.all([
        ensureComponentLoaded('Modal'),
        ensureComponentLoaded('Button'),
        ensureComponentLoaded('Collapsible'),
        ensureComponentLoaded('Toast'),
        ensureComponentLoaded('LabelManager'),
        ensureComponentLoaded('BackgroundManager'),
        ensureComponentLoaded('RaySettings'),
        ensureComponentLoaded('SkullViewer')
    ]);
}; 