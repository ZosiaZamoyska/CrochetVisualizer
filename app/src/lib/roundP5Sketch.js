import { enableSelection } from './interactiveEditing.js';

export function createRoundP5Instance(p5, grid, stitchesDone, isPlaying, roundSpacing = 50, horizontalSpacing = 15, chColor = "#00DC00", scColor = "#00C800", dcColor = "#00AA00", customStitches = [], onShowContextMenu, isExpertView = false) {
    let positions = [];
    let positions_null = [];
    let selectionHandler;
    let selectedNodes = [];
    
    // Round crochet specific variables
    let angle = 300; // Total angle in degrees (full circle)
    let centerX, centerY;
    
    p5.setup = () => {
        p5.createCanvas(800, 600);
        p5.background(255);
        p5.angleMode(p5.DEGREES);
        centerX = p5.width / 2;
        centerY = p5.height / 2;
        
        selectionHandler = enableSelection(p5, positions_null);
        
        // Add right-click handler for context menu
        p5.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const nodes = selectionHandler.getSelectedNodes();
            if (nodes.length > 0) {
                onShowContextMenu(event.clientX, event.clientY);
            }
            event.stopPropagation();
        });
    };
    
    p5.draw = () => {
        p5.clear();
        p5.background(255);
        
        // Reset positions arrays
        positions = [];
        positions_null = [];
        
        // Draw the round crochet pattern
        drawCrochetPattern();
        
        if (selectionHandler) {
            selectionHandler.drawSelectionArea();
        }
    };
    
    function drawCrochetPattern() {
        // Process grid into rounds
        // Each row in the grid becomes a round in the circular pattern
        for (let roundIndex = 0; roundIndex < grid.length; roundIndex++) {
            let positions_null_round = [];
            const row = grid[roundIndex];
            const validStitches = row.filter(stitch => stitch !== null);
            const radius = (roundIndex + 1) * roundSpacing;
            
            // Skip empty rounds
            if (validStitches.length === 0) continue;
            
            // Calculate angle step based on number of stitches in the round
            const stepAngle = angle / validStitches.length;
            
            let stitchIndex = 0;
            
            // Place each stitch in the round
            for (let colIndex = 0; colIndex < row.length; colIndex++) {
                const stitch = row[colIndex];
                
                if (stitch) {
                    // Calculate position on the circle
                    const theta = stitchIndex * stepAngle - 90; // -90 to start at the top
                    const x = centerX + p5.cos(theta) * radius;
                    const y = centerY + p5.sin(theta) * radius;
                    
                    // Store position
                    positions_null_round.push({ x, y, stitch, theta });
                    stitchIndex++;
                } else {
                    // For null stitches, still need a placeholder
                    positions_null_round.push({ x: 0, y: 0, stitch: null, theta: 0 });
                }
            }
            
            positions = positions.concat(positions_null_round.filter(pos => pos.stitch !== null));
            positions_null.push(positions_null_round);
        }
        
        // Draw connections between rounds
        drawConnections();
        
        // Draw stitches
        let count = 0;
        for (let roundIndex = 0; roundIndex < positions_null.length; roundIndex++) {
            for (let i = 0; i < positions_null[roundIndex].length; i++) {
                const position = positions_null[roundIndex][i];
                if (position.stitch) {
                    count++;
                    drawNode(position, count);
                }
            }
        }
    }
    
    function drawConnections() {
        // Draw connections between rounds
        for (let roundIndex = 1; roundIndex < positions_null.length; roundIndex++) {
            const prevRound = positions_null[roundIndex - 1];
            const currentRound = positions_null[roundIndex];
            
            for (let i = 0; i < currentRound.length; i++) {
                if (currentRound[i].stitch) {
                    // Find the closest stitch in the previous round
                    let closestIndex = 0;
                    let closestDist = Number.MAX_VALUE;
                    
                    for (let j = 0; j < prevRound.length; j++) {
                        if (prevRound[j].stitch) {
                            const dist = p5.dist(
                                currentRound[i].x, 
                                currentRound[i].y, 
                                prevRound[j].x, 
                                prevRound[j].y
                            );
                            
                            if (dist < closestDist) {
                                closestDist = dist;
                                closestIndex = j;
                            }
                        }
                    }
                    
                    // Draw connection to closest stitch in previous round
                    if (prevRound[closestIndex].stitch) {
                        drawConnection(currentRound[i], prevRound[closestIndex]);
                    }
                }
            }
        }
        
        // Draw connections within the same round
        for (let roundIndex = 0; roundIndex < positions_null.length; roundIndex++) {
            const round = positions_null[roundIndex];
            
            for (let i = 0; i < round.length; i++) {
                if (round[i].stitch) {
                    // Find the next stitch in this round
                    let nextIndex = (i + 1) % round.length;
                    while (nextIndex !== i && !round[nextIndex].stitch) {
                        nextIndex = (nextIndex + 1) % round.length;
                    }
                    
                    // Draw connection to next stitch if it exists and isn't the same stitch
                    if (nextIndex !== i && round[nextIndex].stitch) {
                        drawRoundConnection(round[i], round[nextIndex]);
                    }
                }
            }
        }
    }
    
    function drawConnection(from, to) {
        p5.stroke(0);
        p5.strokeWeight(1);
        p5.line(from.x, from.y, to.x, to.y);
    }
    
    function drawRoundConnection(from, to) {
        p5.stroke(0);
        p5.strokeWeight(1);
        
        // Calculate the midpoint slightly closer to the center
        const midRadius = p5.dist(centerX, centerY, from.x, from.y) * 0.9;
        const midTheta = (from.theta + to.theta) / 2;
        const midX = centerX + p5.cos(midTheta) * midRadius;
        const midY = centerY + p5.sin(midTheta) * midRadius;
        
        // Draw a curved line
        p5.noFill();
        p5.beginShape();
        p5.vertex(from.x, from.y);
        p5.quadraticVertex(midX, midY, to.x, to.y);
        p5.endShape();
    }
    
    function drawNode(position, count) {
        const selectedNodes = selectionHandler ? selectionHandler.getSelectedNodes() : [];
        const isSelected = selectedNodes.includes(position);
        
        // Check if we should gray out this stitch (for playback)
        const isGrayedOut = count >= stitchesDone && isPlaying;
        
        // Set fill color based on selection and stitch type
        if (isSelected) {
            p5.fill(30, 30, 30, 200); // Highlight selected nodes
        } else {
            if (position.stitch === 'ch') {
                p5.fill(chColor);
            } else if (position.stitch === 'sc') {
                p5.fill(scColor);
            } else if (position.stitch === 'dc') {
                p5.fill(dcColor);
            } else {
                const customStitch = customStitches.find(s => s.name === position.stitch);
                if (customStitch) {
                    p5.fill(customStitch.color);
                } else {
                    p5.fill(180);
                }
            }
        }
        
        if (isGrayedOut) {
            p5.fill(180);
        }
        
        // Draw the stitch symbol based on view mode
        if (isExpertView) {
            drawExpertStitchSymbol(position);
        } else {
            drawBasicStitchSymbol(position);
        }
    }
    
    function drawBasicStitchSymbol(position) {
        const x = position.x;
        const y = position.y;
        const stitch = position.stitch;
        const theta = position.theta;
        
        p5.push();
        p5.translate(x, y);
        p5.rotate(theta + 90); // Align upright relative to center
        
        p5.noStroke();
        
        // Draw the node circle
        p5.ellipse(0, 0, 30, 30);
        
        // Draw the stitch text
        p5.fill(255);
        p5.textSize(14);
        p5.textAlign(p5.CENTER, p5.CENTER);
        p5.text(stitch, 0, 0);
        
        p5.pop();
    }
    
    function drawExpertStitchSymbol(position) {
        const x = position.x;
        const y = position.y;
        const stitch = position.stitch;
        const theta = position.theta;
        
        p5.push();
        p5.translate(x, y);
        p5.rotate(theta + 90); // Align upright relative to center
        
        p5.stroke(0);
        p5.noFill();
        const h = 15; // Height of stitch symbol
        
        // Draw the appropriate stitch symbol
        if (stitch === 'ch') {
            p5.ellipse(0, 0, 10, 10); // Chain as small circle
        } else if (stitch === 'sc') {
            p5.line(0, -h / 2, 0, h / 2); // Single crochet as vertical line
        } else if (stitch === 'dc') {
            p5.line(0, -h, 0, h); // Double crochet as taller line
            p5.line(-5, -h / 2, 5, -h / 2); // Line across
        } else if (stitch === 'tr') {
            p5.line(0, -h * 1.2, 0, h * 1.2); // Treble as even taller line
            p5.line(-5, -h * 0.8, 5, -h * 0.8);
            p5.line(-5, 0, 5, 0); // Two cross lines
        } else if (stitch.includes('+')) {
            // Handle combined stitches like 'sc+ch'
            const parts = stitch.split('+');
            if (parts.includes('sc')) {
                p5.line(0, -h / 2, 0, h / 2); // SC part
            }
            if (parts.includes('ch')) {
                p5.ellipse(0, h, 10, 10); // CH part
            }
        } else {
            // Default for custom stitches - draw a circle with the stitch name
            p5.ellipse(0, 0, 20, 20);
            p5.noStroke();
            p5.fill(0);
            p5.textSize(10);
            p5.textAlign(p5.CENTER, p5.CENTER);
            p5.text(stitch, 0, 0);
        }
        
        p5.pop();
    }
    
    function deleteSelectedNodes(nodes) {
        if (!nodes || nodes.length === 0) {
            return;
        }
        
        nodes.forEach(node => {
            for (let roundIndex = 0; roundIndex < grid.length; roundIndex++) {
                for (let colIndex = 0; colIndex < grid[roundIndex].length; colIndex++) {
                    if (positions_null[roundIndex][colIndex] === node) {
                        grid[roundIndex][colIndex] = null;
                    }
                }
            }
        });
        
        // Clear selection after deletion
        if (selectionHandler) {
            selectionHandler.getSelectedNodes().length = 0;
        }
        
        // Force a redraw
        p5.redraw();
    }
    
    function duplicateSelectedNodes(nodes) {
        if (!nodes || nodes.length === 0) {
            return;
        }
        
        nodes.forEach(node => {
            for (let roundIndex = 0; roundIndex < grid.length; roundIndex++) {
                for (let colIndex = 0; colIndex < grid[roundIndex].length; colIndex++) {
                    if (positions_null[roundIndex][colIndex] === node) {
                        // Find the first available position in the grid to insert the new node
                        let inserted = false;
                        for (let r = 0; r < grid.length && !inserted; r++) {
                            for (let c = 0; c < grid[r].length && !inserted; c++) {
                                if (!grid[r][c]) { // Check for an empty spot
                                    grid[r][c] = node.stitch; // Place the stitch type in the grid
                                    inserted = true; // Mark as inserted
                                }
                            }
                        }
                    }
                }
            }
        });
        
        // Force a redraw
        p5.redraw();
    }
    
    function changeStitchType(nodes, stitchType) {
        // Update the nodes with the new stitch type
        nodes.forEach(node => {
            // Find and update the node in the grid
            for (let roundIndex = 0; roundIndex < grid.length; roundIndex++) {
                for (let colIndex = 0; colIndex < grid[roundIndex].length; colIndex++) {
                    if (positions_null[roundIndex][colIndex] === node) {
                        grid[roundIndex][colIndex] = stitchType; // Update to the new stitch type
                    }
                }
            }
        });
        
        // Force a redraw
        p5.redraw();
    }
    
    // Mouse event handlers
    p5.mousePressed = () => {
        // Only handle selection through the selectionHandler
        if (selectionHandler && !selectionHandler.isCurrentlySelecting()) {
            selectedNodes = [];
        }
    };
    
    // Make sure these are properly exposed
    p5.getSelectedNodes = () => {
        const nodes = selectionHandler ? selectionHandler.getSelectedNodes() : [];
        return nodes;
    };
    p5.deleteSelectedNodes = deleteSelectedNodes;
    p5.duplicateSelectedNodes = duplicateSelectedNodes;
    p5.changeStitchType = changeStitchType;
    
    return p5;
}
