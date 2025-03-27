// Import the SkullViewer component
import './components/SkullViewer.js';
import { initializeComponents } from './components/index.js';

// Initialize the viewer when the page loads
window.addEventListener('DOMContentLoaded', async () => {
    // Initialize all required components
    await initializeComponents();
    
    // Create and add the skull viewer
    const viewer = document.createElement('skull-viewer');
    document.body.appendChild(viewer);
}); 