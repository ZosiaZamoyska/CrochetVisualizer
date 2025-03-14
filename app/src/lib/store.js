import { writable } from 'svelte/store';

export const patternToLoad = writable(null);
export const nodeDataStore = writable({});

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
