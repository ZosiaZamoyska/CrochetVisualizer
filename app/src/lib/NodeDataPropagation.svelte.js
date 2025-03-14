import { get } from 'svelte/store';
import { nodeDataStore } from './store';

/**
 * Propagates data from source nodes to target nodes
 * @param {Object} params - Parameters for propagation
 * @param {Array} params.edges - All edges in the flow
 * @param {Array} params.nodes - All nodes in the flow
 * @param {String} params.sourceId - ID of the source node that was updated
 */
export function propagateData({ edges, nodes, sourceId }) {
  // Get all edges where the source node is the source
  const outgoingEdges = edges.filter(edge => edge.source === sourceId);
  
  if (outgoingEdges.length === 0) return;
  
  // Get the source node data
  const nodeData = get(nodeDataStore);
  const sourceData = nodeData[sourceId];
  
  if (!sourceData) return;
  
  // For each outgoing edge, update the target node
  outgoingEdges.forEach(edge => {
    const targetId = edge.target;
    const targetNode = nodes.find(node => node.id === targetId);
    
    if (!targetNode) return;
    
    // Update the target node based on its type
    updateTargetNode(targetNode, sourceData, nodes, edges);
    
    // Recursively propagate to downstream nodes
    propagateData({ edges, nodes, sourceId: targetId });
  });
}

/**
 * Updates a target node based on its type and the source data
 * @param {Object} targetNode - The target node to update
 * @param {Object} sourceData - The source node data
 * @param {Array} nodes - All nodes in the flow
 * @param {Array} edges - All edges in the flow
 */
function updateTargetNode(targetNode, sourceData, nodes, edges) {
  const targetId = targetNode.id;
  const nodeData = get(nodeDataStore);
  
  // If the target is an export node, collect all incoming data
  if (targetNode.type === 'export') {
    // Get all incoming edges to this node
    const incomingEdges = edges.filter(edge => edge.target === targetId);
    const instructions = [];
    
    // Collect instructions from all source nodes
    // Only include edges where the source node still exists in the store
    incomingEdges.forEach(edge => {
      const sourceId = edge.source;
      const sourceData = nodeData[sourceId];
      
      // Verify the source node still exists in the store
      if (sourceData && sourceData.instructions) {
        // Verify the source node still exists in the nodes array
        const sourceNodeExists = nodes.some(node => node.id === sourceId);
        if (sourceNodeExists) {
          instructions.push(...sourceData.instructions);
        } else {
          console.log(`Source node ${sourceId} no longer exists, skipping its instructions`);
        }
      }
    });
    
    // Update the export node data in the store
    nodeDataStore.update(store => {
      store[targetId] = {
        ...targetNode.data,
        instructions: [...instructions]
      };
      return store;
    });
    
    // Also update the actual node data
    const targetNodeIndex = nodes.findIndex(n => n.id === targetId);
    if (targetNodeIndex !== -1) {
      // Create a new reference to trigger reactivity
      const updatedNode = {
        ...nodes[targetNodeIndex],
        data: {
          ...nodes[targetNodeIndex].data,
          instructions: [...instructions]
        }
      };
      
      // Update the node in the array
      const updatedNodes = [...nodes];
      updatedNodes[targetNodeIndex] = updatedNode;
      
      // If nodes is a writable store, update it
      if (typeof nodes.set === 'function') {
        nodes.set(updatedNodes);
        console.log(`Updated export node ${targetId} with ${instructions.length} instructions`);
      }
    }
  } 
  // For other node types, just pass through the data
  else {
    // Merge the source data with the target data
    nodeDataStore.update(store => {
      store[targetId] = {
        ...targetNode.data,
        sourceData
      };
      return store;
    });
  }
} 