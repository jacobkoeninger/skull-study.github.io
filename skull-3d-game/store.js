import { createStore } from 'zustand/vanilla';
import { persist, createJSONStorage } from 'zustand/middleware';

// Helper function to create a new label set node
const createLabelSetNode = (labelSet) => ({
    labelSet,
    next: null,
    prev: null,
    isVisible: false,
    parent: null,
    children: new Set(),
    depth: 0,
    isExpanded: true
});

// Create the store with persistence middleware
const store = createStore(
    persist(
        (set, get) => ({
            // UI State
            isDevelopmentMode: false,
            currentRayColor: '#ff0000',
            backgroundUrl: 'https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=1920&q=80',
            backgroundColor: '#000000',
            defaultBackgroundUrl: 'https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=1920&q=80',
            backgroundPresets: [
                { name: 'Deep Space', url: 'https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=1920&q=80' },
                { name: 'Nebula', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80' },
                { name: 'Galaxy', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1920&q=80' },
                { name: 'Abstract', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80' }
            ],

            // Label Management
            labels: [],
            firstLabelSet: null,
            lastLabelSet: null,
            labelSetCount: 0,

            // Actions
            toggleDevMode: () => set(state => {
                const isDevelopmentMode = !state.isDevelopmentMode;
                // Let the components handle their own UI updates through subscriptions
                return { isDevelopmentMode };
            }),
            
            setRayColor: (color) => set({ currentRayColor: color }),
            
            // Single unified background update action
            updateBackground: (url, color = null) => {
                if (url === 'color' && color) {
                    set({ 
                        backgroundUrl: 'color',
                        backgroundColor: color
                    });
                } else if (url !== 'color') {
                    set({ backgroundUrl: url });
                }
            },

            updateBackgroundColor: (color) => set({ backgroundColor: color }),

            setLabels: (labels) => set({ labels }),

            addLabel: (label) => set(state => ({ 
                labels: [...state.labels, label] 
            })),
            
            removeLabel: (labelId) => set(state => ({
                labels: state.labels.filter(label => label.id !== labelId)
            })),

            clearLabels: () => set({ labels: [] }),

            addLabelSet: (labelSet, parentName = null) => {
                const state = get();
                const node = createLabelSetNode(labelSet);

                // Handle parent-child relationship
                if (parentName) {
                    const parentNode = state.findLabelSetNode(parentName);
                    if (parentNode) {
                        node.parent = parentNode;
                        node.depth = parentNode.depth + 1;
                        parentNode.children.add(node);
                    }
                }

                set(state => {
                    if (!state.firstLabelSet) {
                        return {
                            firstLabelSet: node,
                            lastLabelSet: node,
                            labelSetCount: 1
                        };
                    } else {
                        node.prev = state.lastLabelSet;
                        state.lastLabelSet.next = node;
                        return {
                            lastLabelSet: node,
                            labelSetCount: state.labelSetCount + 1
                        };
                    }
                });

                return node;
            },

            removeLabelSet: (name) => {
                const state = get();
                const node = state.findLabelSetNode(name);
                if (!node) return;

                // Remove associated labels if visible
                if (node.isVisible) {
                    set(state => ({
                        labels: state.labels.filter(label => label.setName !== name)
                    }));
                }

                set(state => {
                    const updates = {};
                    
                    if (node.prev) {
                        node.prev.next = node.next;
                    } else {
                        updates.firstLabelSet = node.next;
                    }

                    if (node.next) {
                        node.next.prev = node.prev;
                    } else {
                        updates.lastLabelSet = node.prev;
                    }

                    updates.labelSetCount = state.labelSetCount - 1;
                    return updates;
                });
            },

            findLabelSetNode: (name) => {
                let current = get().firstLabelSet;
                while (current) {
                    if (current.labelSet.name === name) {
                        return current;
                    }
                    current = current.next;
                }
                return null;
            },

            toggleLabelSet: (name) => {
                const state = get();
                const node = state.findLabelSetNode(name);
                if (!node) return;

                if (node.isVisible) {
                    // Hide this set
                    node.isVisible = false;
                    set(state => ({
                        labels: state.labels.filter(label => label.setName !== name)
                    }));
                } else {
                    // Show this set
                    node.isVisible = true;
                    state.loadLabelSet(node.labelSet, name);
                }
            },

            clearAllLabels: () => {
                let current = get().firstLabelSet;
                while (current) {
                    current.isVisible = false;
                    current = current.next;
                }
                set({ labels: [] });
            },

            loadHierarchy: (hierarchyData) => {
                const state = get();
                // Clear existing sets first
                state.clearAllLabels();
                set({
                    firstLabelSet: null,
                    lastLabelSet: null,
                    labelSetCount: 0
                });

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

                    const node = state.addLabelSet(nodeData.labelSet, parent?.labelSet.name);
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
            },

            saveHierarchy: () => {
                const state = get();
                const rootNodes = [];
                let current = state.firstLabelSet;

                while (current) {
                    if (!current.parent) {
                        rootNodes.push({
                            labelSet: current.labelSet,
                            children: Array.from(current.children).map(child => ({
                                labelSet: child.labelSet,
                                children: Array.from(child.children),
                                isExpanded: child.isExpanded
                            })),
                            isExpanded: current.isExpanded
                        });
                    }
                    current = current.next;
                }

                return rootNodes;
            },

            updateRayColor: (color) => set({ currentRayColor: color }),
        }),
        {
            name: 'skull-game-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                currentRayColor: state.currentRayColor,
                backgroundUrl: state.backgroundUrl,
                backgroundColor: state.backgroundColor
            })
        }
    )
);

// Create a hook-like interface for vanilla JS
const useStore = {
    getState: store.getState,
    setState: store.setState,
    subscribe: store.subscribe,
    destroy: store.destroy
};

export default useStore; 