import { draw } from 'svelte/transition';
import * as d3 from 'd3';

let nodes = [];
let links = [];
let simulation;

export function createPhysicsP5Instance(p5, grid, stitchesDone, isPlaying, verticalSpacing = 15, horizontalSpacing = 15, chColor = "#00DC00", scColor = "#00C800", dcColor = "#00AA00", customStitches = []) {
    p5.setup = () => {
        p5.createCanvas(800, 600);
        p5.noLoop();
        p5.background(255);
        createGraph(grid); // Pass the grid to create the graph
    };

    p5.draw = () => {
        p5.clear();
        const ovalSize = 30;
        const stitchSize = 30;

        // Draw edges
        
        links.forEach(link => {
            let fromNode = link.source;
            let toNode = link.target;
            p5.stroke(0);
            p5.strokeWeight(2);
            p5.line(fromNode.x, fromNode.y, toNode.x, toNode.y);

            // Display edge length
            let midX = (fromNode.x + toNode.x) / 2;
            let midY = (fromNode.y + toNode.y) / 2;
            p5.fill(0);
            p5.noStroke();
            //p5.textSize(12);
            //p5.text(link.distance, midX, midY);
        });

        // Draw nodes
        nodes.forEach(node => {
            // Check for custom color first
            if (node.customColor) {
                p5.fill(node.customColor);
            } else {
                // Get color from colorMap or use default based on stitch type
                const customColor = p5.getNodeColor(node.id, node.stitch);
                if (customColor) {
                    p5.fill(customColor);
                } else {
                    // Set the fill color based on the stitch type
                    switch (node.stitch) {
                        case 'ch':
                            p5.fill(chColor);
                            break;
                        case 'sc':
                            p5.fill(scColor);
                            break;
                        case 'dc':
                            p5.fill(dcColor);
                            break;
                        default:
                            // Check for custom stitch color
                            const customStitch = customStitches.find(s => s.name === node.stitch);
                            if (customStitch) {
                                p5.fill(customStitch.color);
                            } else {
                                p5.fill(180); // Default gray for unknown stitch types
                            }
                            break;
                    }
                }
            }

            p5.stroke(0);
            p5.strokeWeight(1);
            p5.ellipse(node.x, node.y, ovalSize, ovalSize); // Draw node as a circle
            p5.fill(0);
            p5.noStroke();
            p5.textAlign(p5.CENTER, p5.CENTER);
            // Display only the stitch type (without color code)
            const displayStitch = node.stitch.includes('_') ? node.stitch.split('_')[0] : node.stitch;
            p5.text(displayStitch, node.x, node.y); // Draw stitch type instead of ID
        });
    };

    function createGraph(grid) {
        nodes = [];
        links = [];
    
        // Create nodes with stitch type explicitly stored
        grid.forEach((row, rowIndex) => {
            row.forEach((stitch, colIndex) => {
                if (stitch) {
                    nodes.push({
                        id: `${rowIndex}-${colIndex}`,
                        stitch: stitch, // explicitly store stitch type
                    });
                }
            });
        });
    
        // Create links between adjacent nodes
        grid.forEach((row, rowIndex) => {
            row.forEach((stitch, colIndex) => {
                if (stitch) {
                    // Link to right neighbor
                    if (colIndex < row.length - 1 && grid[rowIndex][colIndex + 1]) {
                        links.push({
                            source: `${rowIndex}-${colIndex}`,
                            target: `${rowIndex}-${colIndex + 1}`,
                            distance: horizontalSpacing
                        });
                    }
    
                    // Link to node above
                    if (rowIndex > 0 && grid[rowIndex - 1][colIndex]) {
                        links.push({
                            source: `${rowIndex}-${colIndex}`,
                            target: `${rowIndex - 1}-${colIndex}`,
                            distance: verticalSpacing
                        });
                    }
                }
            });
        });
    
        // Initialize D3 force simulation
        simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links)
                .id(d => d.id)
                .distance(d => d.distance)) // keep your dynamic distances
            .force("charge", d3.forceManyBody().strength(-100)) // repulsion
            .force("center", d3.forceCenter(p5.width / 2, p5.height / 2)) // centering force
            .force("collision", d3.forceCollide()
                .radius(30 / 2) // prevent overlap based on oval size
                .strength(0.7)) // you can adjust strength (0 to 1) as needed
            .on("tick", () => p5.redraw()); // trigger p5.js redraw on every tick

      }

    // Function to update nodes and links based on the new grid
    function updateGraph(grid) {
        // Clear existing nodes and links
        nodes.length = 0;
        links.length = 0;

        // Recreate nodes and links based on the updated grid
        createGraph(grid);
    }

    // Call this function whenever the pattern is updated
    function updateNodePositions() {
        nodes.forEach((node, index) => {
            const rowIndex = Math.floor(index / grid[0].length);
            const colIndex = index % grid[0].length;
            if (grid[rowIndex] && grid[rowIndex][colIndex]) {
                node.x = colIndex * horizontalSpacing + 50; // Update x position
                node.y = rowIndex * verticalSpacing + 50; // Update y position
            }
        });
    }

    // Call this function whenever the patternInput changes
    function onPatternInputChange() {
        updateGraph(); // Update the graph based on the new pattern
        updateNodePositions(); // Update node positions based on the grid
    }

    // Add this function to handle changing node colors
    p5.changeNodeColor = function(nodes, color) {
        if (!nodes || nodes.length === 0) return;
        
        // Initialize colorMap if it doesn't exist
        if (!grid.colorMap) {
            grid.colorMap = {};
        }
        
        // Apply the color to each selected node
        nodes.forEach(node => {
            // For physics view, we need to extract the row and column from the node id
            if (node && node.id) {
                const [rowIndex, colIndex] = node.id.split('-').map(Number);
                grid.colorMap[`${rowIndex}-${colIndex}`] = color;
                
                // Also update the node's customColor property for immediate visual feedback
                node.customColor = color;
            }
        });
        
        // Redraw the canvas
        p5.redraw();
    };
    
    // Add this function to get the color for a specific node
    p5.getNodeColor = function(nodeId, stitchType) {
        if (!nodeId) return null;
        
        const [rowIndex, colIndex] = nodeId.split('-').map(Number);
        
        // Check if this node has a custom color
        if (grid.colorMap && grid.colorMap[`${rowIndex}-${colIndex}`]) {
            return grid.colorMap[`${rowIndex}-${colIndex}`];
        }
        
        // Otherwise return the default color for this stitch type
        switch (stitchType) {
            case 'ch':
                return chColor;
            case 'sc':
                return scColor;
            case 'dc':
                return dcColor;
            default:
                const customStitch = customStitches.find(s => s.name === stitchType);
                return customStitch ? customStitch.color : '#000000';
        }
    };
}