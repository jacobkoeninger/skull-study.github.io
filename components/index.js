export { default as Tooltip } from './Tooltip.js';
export { default as Toolbar } from './Toolbar.js';

// Initialize all components
const components = {
    Modal: () => import('./Modal.js'),
    Button: () => import('./Button.js'),
    Collapsible: () => import('./Collapsible.js'),
    Toast: () => import('./Toast.js'),
    Tooltip: () => import('./Tooltip.js'),
    Toolbar: () => import('./Toolbar.js'),
    Dropdown: () => import('./Dropdown.js'),
    LabelManager: () => import('./LabelManager.js'),
    BackgroundManager: () => import('./BackgroundManager.js'),
    RaySettings: () => import('./RaySettings.js'),
    SkullViewer: () => import('./SkullViewer.js')
}; 