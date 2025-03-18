import { writable } from 'svelte/store';

export const patternToLoad = writable(null);
export const nodeDataStore = writable({});

// User study metrics store
export const userStudyMetrics = writable({
  isRecording: false,
  startTime: null,
  endTime: null,
  corrections: {
    total: 0,
    byStitchType: {}
  },
  timeSpent: {
    stitchRecording: 0,
    patternEditing: 0,
    projectComposition: 0,
    lastPhaseStartTime: null,
    currentPhase: null
  },
  visualizationChanges: 0,
  patternSaveExports: 0
});


// Function to update node data and trigger propagation
export function updateNodeData(nodeId, data) {
  nodeDataStore.update(store => {
    store[nodeId] = data;
    return store;
  });
}

// Function to get node data
export function getNodeData(nodeId) {
  let result;
  nodeDataStore.subscribe(store => {
    result = store[nodeId];
  })();
  return result;
}
