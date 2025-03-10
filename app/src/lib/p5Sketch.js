import { draw } from 'svelte/transition';
import * as d3 from 'd3';

let nodes = [];
let links = [];
let simulation;

export function createPhysicsP5Instance(p5, grid, stitchesDone, isPlaying, verticalSpacing = 15, horizontalSpacing = 15, chColor = "#00DC00", scColor = "#00C800", dcColor = "#00AA00", customStitches = []) {
    p5.setup = () => {
        p5.createCanvas(600, 400);
        p5.background(255);
        createGraph(grid); // Pass the grid to create the graph
    };

    p5.draw = () => {
        p5.clear();
        p5.background(255);

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
            p5.textSize(12);
            p5.text(link.distance, midX, midY);
        });

        // Draw nodes
        nodes.forEach(node => {
            p5.fill(255, 0, 0); // Node color
            p5.stroke(0);
            p5.strokeWeight(2);
            p5.ellipse(node.x, node.y, 20, 20); // Draw node as a circle
            p5.fill(0);
            p5.noStroke();
            p5.textAlign(p5.CENTER, p5.CENTER);
            p5.text(node.stitch, node.x, node.y); // Draw stitch type instead of ID
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
            .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.distance))
            .force("charge", d3.forceManyBody().strength(-50))
            .force("center", d3.forceCenter(p5.width / 2, p5.height / 2))
            .on("tick", () => p5.redraw());
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
}