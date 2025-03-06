import * as THREE from 'three';

// Constants
export const EDGE_LENGTH = 100;
export const SHAPE_TYPES = {
  SQUARE: 'square',
  HEXAGON: 'hexagon',
  TRIANGLE: 'triangle'
};

// Shape patterns with their geometry definitions
export const PATTERNS = {
  [SHAPE_TYPES.SQUARE]: {
    id: SHAPE_TYPES.SQUARE,
    name: 'Square',
    createGeometry: () => {
      const geometry = new THREE.BufferGeometry();
      // Define vertices in clockwise order starting from bottom-left
      const vertices = [
        new THREE.Vector2(-EDGE_LENGTH/2, -EDGE_LENGTH/2),  // Bottom-left
        new THREE.Vector2(EDGE_LENGTH/2, -EDGE_LENGTH/2),   // Bottom-right
        new THREE.Vector2(EDGE_LENGTH/2, EDGE_LENGTH/2),    // Top-right
        new THREE.Vector2(-EDGE_LENGTH/2, EDGE_LENGTH/2)    // Top-left
      ];
      
      // Create edges in clockwise order
      const edges = vertices.map((vertex, i) => ({
        id: `edge-${i}`,
        start: vertex,
        end: vertices[(i + 1) % vertices.length]
      }));

      // Set geometry attributes
      const positions = new Float32Array(vertices.flatMap(v => [v.x, v.y, 0]));
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      // Add indices for proper face winding (two triangles)
      const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      
      geometry.computeVertexNormals();
      return { geometry, edges };
    }
  },
  [SHAPE_TYPES.HEXAGON]: {
    id: SHAPE_TYPES.HEXAGON,
    name: 'Hexagon',
    createGeometry: () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      
      // Create regular hexagon with given edge length
      // Start from bottom vertex and go clockwise
      for (let i = 0; i < 6; i++) {
        const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2; // Start from bottom
        const x = EDGE_LENGTH * Math.cos(angle);
        const y = EDGE_LENGTH * Math.sin(angle);
        vertices.push(new THREE.Vector2(x, y));
      }

      // Create edges in clockwise order
      const edges = vertices.map((vertex, i) => ({
        id: `edge-${i}`,
        start: vertex,
        end: vertices[(i + 1) % vertices.length]
      }));

      // Set geometry attributes
      const positions = new Float32Array(vertices.flatMap(v => [v.x, v.y, 0]));
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      // Add indices for triangulation (fan from first vertex)
      const indices = [];
      for (let i = 1; i < vertices.length - 1; i++) {
        indices.push(0, i, i + 1);
      }
      geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
      
      geometry.computeVertexNormals();
      return { geometry, edges };
    }
  },
  [SHAPE_TYPES.TRIANGLE]: {
    id: SHAPE_TYPES.TRIANGLE,
    name: 'Triangle',
    createGeometry: () => {
      const geometry = new THREE.BufferGeometry();
      // Equilateral triangle with given edge length
      const height = EDGE_LENGTH * Math.sqrt(3) / 2;
      const vertices = [
        new THREE.Vector2(0, -height/2),           // Top
        new THREE.Vector2(EDGE_LENGTH/2, height/2), // Bottom-right
        new THREE.Vector2(-EDGE_LENGTH/2, height/2) // Bottom-left
      ];
      
      // Create edges in clockwise order
      const edges = vertices.map((vertex, i) => ({
        id: `edge-${i}`,
        start: vertex,
        end: vertices[(i + 1) % vertices.length]
      }));

      // Set geometry attributes
      const positions = new Float32Array(vertices.flatMap(v => [v.x, v.y, 0]));
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      // Add indices for single triangle
      const indices = new Uint16Array([0, 1, 2]);
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      
      geometry.computeVertexNormals();
      return { geometry, edges };
    }
  }
};

// Utility functions
export function getRandomPosition(canvas) {
  const padding = 50;
  return new THREE.Vector2(
    padding + Math.random() * (canvas.clientWidth - 2 * padding),
    padding + Math.random() * (canvas.clientHeight - 2 * padding)
  );
}

export function getEdgePath(edge, shape) {
  const start = edge.start.clone().add(shape.position);
  const end = edge.end.clone().add(shape.position);
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

export function getShapePath(shape) {
  const vertices = shape.geometry.attributes.position.array;
  const points = [];
  for (let i = 0; i < vertices.length; i += 3) {
    points.push(`${vertices[i] + shape.position.x} ${vertices[i + 1] + shape.position.y}`);
  }
  return `M ${points.join(' L ')} Z`;
}

export function alignShapes(shape1, edge1, shape2, edge2) {
  // Create vectors for the edges
  const edge1Start = edge1.start.clone().add(shape1.position);
  const edge1End = edge1.end.clone().add(shape1.position);
  const edge2Start = edge2.start.clone().add(shape2.position);
  const edge2End = edge2.end.clone().add(shape2.position);

  // Calculate edge directions
  const edge1Dir = edge1End.clone().sub(edge1Start);
  const edge2Dir = edge2End.clone().sub(edge2Start);

  // Calculate angles
  const angle1 = Math.atan2(edge1Dir.y, edge1Dir.x);
  const angle2 = Math.atan2(edge2Dir.y, edge2Dir.x);
  const rotation = angle1 - angle2;

  // Create rotation matrix manually
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  // Function to calculate overlap area between two edges
  function calculateOverlap(start1, end1, start2, end2) {
    // Calculate bounding boxes
    const minX1 = Math.min(start1.x, end1.x);
    const maxX1 = Math.max(start1.x, end1.x);
    const minY1 = Math.min(start1.y, end1.y);
    const maxY1 = Math.max(start1.y, end1.y);
    
    const minX2 = Math.min(start2.x, end2.x);
    const maxX2 = Math.max(start2.x, end2.x);
    const minY2 = Math.min(start2.y, end2.y);
    const maxY2 = Math.max(start2.y, end2.y);

    // Calculate intersection
    const xOverlap = Math.max(0, Math.min(maxX1, maxX2) - Math.max(minX1, minX2));
    const yOverlap = Math.max(0, Math.min(maxY1, maxY2) - Math.max(minY1, minY2));

    return xOverlap * yOverlap;
  }

  // Try both orientations
  const overlap1 = calculateOverlap(edge1Start, edge1End, edge2Start, edge2End);
  const overlap2 = calculateOverlap(edge1Start, edge1End, edge2End, edge2Start);

  // Choose orientation with less overlap
  const shouldFlip = overlap2 < overlap1;

  // Apply rotation to shape2's geometry
  const positions = shape2.geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    const point = new THREE.Vector2(positions[i], positions[i + 1]);
    // Apply rotation manually
    const x = point.x * cos - point.y * sin;
    const y = point.x * sin + point.y * cos;
    positions[i] = x;
    positions[i + 1] = y;
  }
  shape2.geometry.attributes.position.needsUpdate = true;

  // Update edges
  shape2.edges.forEach(edge => {
    // Apply rotation to start point
    const startX = edge.start.x * cos - edge.start.y * sin;
    const startY = edge.start.x * sin + edge.start.y * cos;
    edge.start.x = startX;
    edge.start.y = startY;

    // Apply rotation to end point
    const endX = edge.end.x * cos - edge.end.y * sin;
    const endY = edge.end.x * sin + edge.end.y * cos;
    edge.end.x = endX;
    edge.end.y = endY;
  });

  // Calculate the translation to align edge endpoints
  const translation = edge1Start.clone().sub(shouldFlip ? edge2End : edge2Start);
  
  // Move shape2 to align with shape1
  shape2.position.add(translation);

  // Add a small offset to prevent perfect overlap
  const offset = 2;
  const offsetVector = edge1Dir.normalize().multiplyScalar(offset);
  shape2.position.add(offsetVector);

  return shape2;
} 