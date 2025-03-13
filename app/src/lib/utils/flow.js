/**
 * Gets all nodes connected to a given node in a chain
 * @param {string} nodeId - The ID of the starting node
 * @param {Array} nodes - Array of all nodes
 * @param {Array} edges - Array of all edges
 * @returns {Array} Array of connected nodes
 */
export function getConnectedNodes(nodeId, nodes, edges) {
  const connectedNodes = new Set();
  const visited = new Set();

  function traverse(nodeId, direction = 'backward') {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    connectedNodes.add(node);

    // Find connected edges
    const connectedEdges = edges.filter(edge => 
      direction === 'backward' 
        ? edge.target === nodeId 
        : edge.source === nodeId
    );

    // Traverse connected nodes
    connectedEdges.forEach(edge => {
      const nextNodeId = direction === 'backward' ? edge.source : edge.target;
      traverse(nextNodeId, direction);
    });
  }

  // Traverse both backward and forward from the export node
  traverse(nodeId, 'backward');
  visited.clear();
  traverse(nodeId, 'forward');

  return Array.from(connectedNodes);
} 