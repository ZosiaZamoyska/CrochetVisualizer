import { enableSelection } from './interactiveEditing.js';
import  ContextMenu from './ContextMenu.svelte'; // Import the context menu component

export function createRoundP5Instance(p5, grid, stitchesDone, isPlaying, roundSpacing = 50, horizontalSpacing = 15, chColor = "#00DC00", scColor = "#00C800", dcColor = "#00AA00", customStitches = [], onShowContextMenu, isExpertView = false, angle = 360) {
    let positions = [];
    let positions_null = [];
    let selectionHandler;
    let selectedNodes = [];
    
    // Round crochet specific variables
    //let angle = 360; // Total angle in degrees (full circle)
    let centerX, centerY;
    
    p5.setup = () => {
        p5.createCanvas(800, 600);
        p5.angleMode(p5.DEGREES);
        centerX = p5.width / 2;
        centerY = p5.height / 2;
        
        // We'll initialize the selection handler in the draw function
        // to ensure it has the correct reference to positions_null
    };
    
    // Remove the p5.mousePressed override to allow the selection handler to work properly
    
    p5.draw = () => {
        p5.clear();
        // Reset positions arrays
        positions = [];
        positions_null = [];
        
        // Draw the round crochet pattern
        drawCrochetPattern();
        
        // Update the selection handler with the new positions array
        if (!selectionHandler) {
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
        } else {
            // Update the selection handler with the new positions array
            selectionHandler.updatePositions(positions_null);
        }
        
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
                    
                    // Create position object with grid coordinates for reference
                    const posObj = { 
                        x, 
                        y, 
                        stitch, 
                        theta,
                        gridRow: roundIndex,  // Store grid coordinates
                        gridCol: colIndex
                    };
                    
                    // Check if this position has a custom color in the colorMap
                    if (grid.colorMap && grid.colorMap[`${roundIndex}-${colIndex}`]) {
                        posObj.customColor = grid.colorMap[`${roundIndex}-${colIndex}`];
                    }
                    
                    // Store position
                    positions_null_round.push(posObj);
                    stitchIndex++;
                } else {
                    // For null stitches, still need a placeholder
                    positions_null_round.push({ 
                        x: 0, 
                        y: 0, 
                        stitch: null, 
                        theta: 0,
                        gridRow: roundIndex,
                        gridCol: colIndex
                    });
                }
            }
            
            positions = positions.concat(positions_null_round.filter(pos => pos.stitch !== null));
            positions_null.push(positions_null_round);
        }
        
        // Draw connections between rounds
        if (!isExpertView) {
            drawConnections();
        }
        
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
            
            // Get valid stitches from both rounds (excluding nulls and chains in current round)
            const validPrevStitches = prevRound.filter(pos => pos.stitch !== null);
            const validCurrentStitches = currentRound.filter(pos => pos.stitch !== null && pos.stitch !== 'ch');
            
            if (validPrevStitches.length === 0 || validCurrentStitches.length === 0) continue;
            
            // Calculate the ideal number of connections per previous stitch
            const connectionsPerPrevStitch = Math.ceil(validCurrentStitches.length / validPrevStitches.length);
            
            // Track how many connections each previous stitch has
            const connectionCounts = new Array(validPrevStitches.length).fill(0);
            
            // Track which current stitches have been connected
            const connectedCurrentStitches = new Set();
            
            // First pass: Connect each current stitch to its closest previous stitch
            // as long as the previous stitch hasn't exceeded its connection limit
            for (let i = 0; i < validCurrentStitches.length; i++) {
                const currentStitch = validCurrentStitches[i];
                
                // Find the closest previous stitch that hasn't reached its connection limit
                let closestIndex = -1;
                let closestDist = Number.MAX_VALUE;
                
                for (let j = 0; j < validPrevStitches.length; j++) {
                    if (connectionCounts[j] >= connectionsPerPrevStitch) continue;
                    
                    const prevStitch = validPrevStitches[j];
                    const dist = p5.dist(
                        currentStitch.x, 
                        currentStitch.y, 
                        prevStitch.x, 
                        prevStitch.y
                    );
                    
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestIndex = j;
                    }
                }
                
                // If we found a valid previous stitch, connect to it
                if (closestIndex !== -1) {
                    drawConnection(currentStitch, validPrevStitches[closestIndex]);
                    connectionCounts[closestIndex]++;
                    connectedCurrentStitches.add(i);
                }
            }
            
            // Second pass: Connect any remaining current stitches
            // to the previous stitches with the fewest connections
            for (let i = 0; i < validCurrentStitches.length; i++) {
                if (connectedCurrentStitches.has(i)) continue;
                
                const currentStitch = validCurrentStitches[i];
                
                // Find the previous stitch with the fewest connections
                let minConnectionsIndex = 0;
                let minConnections = connectionCounts[0];
                
                for (let j = 1; j < validPrevStitches.length; j++) {
                    if (connectionCounts[j] < minConnections) {
                        minConnections = connectionCounts[j];
                        minConnectionsIndex = j;
                    }
                }
                
                // Connect to the previous stitch with the fewest connections
                drawConnection(currentStitch, validPrevStitches[minConnectionsIndex]);
                connectionCounts[minConnectionsIndex]++;
            }
        }
        
        // Draw connections within the same round
        for (let roundIndex = 0; roundIndex < positions_null.length; roundIndex++) {
            const round = positions_null[roundIndex];
            
            // Find all valid stitches in this round
            const validStitches = [];
            for (let i = 0; i < round.length; i++) {
                if (round[i].stitch) {
                    validStitches.push({
                        index: i,
                        position: round[i]
                    });
                }
            }
            
            // Skip if there are no valid stitches
            if (validStitches.length === 0) continue;
            
            // Connect adjacent stitches
            for (let i = 0; i < validStitches.length - 1; i++) {
                const current = validStitches[i].position;
                const next = validStitches[i + 1].position;
                
                // Check if these stitches are too far apart (would wrap around the circle)
                const angleDiff = Math.abs(current.theta - next.theta);
                
                // Only connect if the angle difference is reasonable
                // This prevents connecting across the gap when angle < 360
                if (angleDiff <= 360 / validStitches.length * 1.5) {
                    drawRoundConnection(current, next);
                }
            }
            
            // Only connect the last stitch to the first one if we're making a full circle
            if (angle >= 359 && validStitches.length > 1) {
                const first = validStitches[0].position;
                const last = validStitches[validStitches.length - 1].position;
                
                // Check if the angle between first and last is reasonable
                const angleDiff = Math.abs(first.theta - last.theta);
                
                // Only connect if the angle difference is reasonable
                if (angleDiff <= 360 / validStitches.length * 1.5 || angleDiff >= 360 - (360 / validStitches.length * 1.5)) {
                    drawRoundConnection(last, first);
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
        
        // Check if this is likely the connection between last and first node
        // This happens when the angle difference is large (close to the total angle)
        const angleDiff = Math.abs(from.theta - to.theta);
        const isLastToFirst = angleDiff > 270; // If angle difference is large, it's likely last-to-first
        
        // Calculate the midpoint
        let midRadius;
        if (isLastToFirst) {
            // For last-to-first connection, make the curve much flatter (closer to the nodes)
            midRadius = p5.dist(centerX, centerY, from.x, from.y) * 0.98;
        } else {
            // For regular connections, keep the original curve
            midRadius = p5.dist(centerX, centerY, from.x, from.y) * 0.9;
        }
        
        const midTheta = (from.theta + to.theta) / 2;
        
        // Handle the case where midTheta might need adjustment for last-to-first connection
        let adjustedMidTheta = midTheta;
        if (isLastToFirst) {
            // If connecting across the 0/360 boundary, adjust the midpoint angle
            if (Math.abs(from.theta - to.theta) > 180) {
                adjustedMidTheta = (from.theta + to.theta + 360) / 2 % 360;
            }
        }
        
        const midX = centerX + p5.cos(adjustedMidTheta) * midRadius;
        const midY = centerY + p5.sin(adjustedMidTheta) * midRadius;
        
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
            // First check if this node has a custom color assigned
            if (position.customColor) {
                p5.fill(position.customColor);
            } else if (position.stitch === 'ch') {
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
        // Display only the stitch type (without color code)
        const displayStitch = stitch.includes('_') ? stitch.split('_')[0] : stitch;
        p5.text(displayStitch, 0, 0);
        
        p5.pop();
    }
    
    function drawExpertStitchSymbol(position) {
        const x = position.x;
        const y = position.y;
        const stitch = position.stitch;
        const theta = position.theta;
        
        // Find the current round index for this position
        let currentRoundIndex = -1;
        for (let i = 0; i < positions_null.length; i++) {
            if (positions_null[i].some(pos => pos === position)) {
                currentRoundIndex = i;
                break;
            }
        }
        
        // Skip the first round (chains) or if we couldn't find the round
        if (currentRoundIndex <= 0 || currentRoundIndex === -1) {
            // Just draw at the original position for the first round
            p5.push();
            p5.translate(x, y);
            p5.rotate(theta + 90); // Align upright relative to center
            drawStitchSymbol(stitch);
            p5.pop();
            return;
        }
        
        // Find the closest node in the previous round
        const prevRound = positions_null[currentRoundIndex - 1];
        const validPrevStitches = prevRound.filter(pos => pos.stitch !== null);
        
        if (validPrevStitches.length === 0) {
            // No previous stitches to connect to, use original position
            p5.push();
            p5.translate(x, y);
            p5.rotate(theta + 90); // Align upright relative to center
            drawStitchSymbol(stitch);
            p5.pop();
            return;
        }
        
        // Find the closest previous stitch
        let closestPrevStitch = null;
        let closestDist = Number.MAX_VALUE;
        
        for (let j = 0; j < validPrevStitches.length; j++) {
            const prevStitch = validPrevStitches[j];
            const dist = p5.dist(x, y, prevStitch.x, prevStitch.y);
            
            if (dist < closestDist) {
                closestDist = dist;
                closestPrevStitch = prevStitch;
            }
        }
        
        if (closestPrevStitch) {
            // Calculate the angle between the current node and the previous node
            const connectionAngle = p5.atan2(closestPrevStitch.y - y, closestPrevStitch.x - x);
            
            // Calculate the position along the connection line
            // Position it 30% of the way from the current node to the previous node
            const offsetX = (closestPrevStitch.x - x) * 0.3;
            const offsetY = (closestPrevStitch.y - y) * 0.3;
            
            // Draw the stitch symbol at the offset position, rotated to align with the connection
            p5.push();
            p5.translate(x + offsetX, y + offsetY);
            p5.rotate(connectionAngle + 90); // Rotate to align with the connection line
            drawStitchSymbol(stitch);
            p5.pop();
        } else {
            // Fallback to original position
            p5.push();
            p5.translate(x, y);
            p5.rotate(theta + 90); // Align upright relative to center
            drawStitchSymbol(stitch);
            p5.pop();
        }
    }
    
    // Helper function to draw the stitch symbol
    function drawStitchSymbol(stitch) {
        p5.stroke(0);
        p5.noFill();
        const h = 15; // Height of stitch symbol
        
        // Draw the appropriate stitch symbol
        if (stitch === 'ch') {
            p5.ellipse(0, 0, 10, 10); // Chain as small circle
        } else if (stitch === 'sc') {
            p5.line(0, -h, 0, h); // Single crochet as vertical line
            p5.line(-5, 0, 5, 0); // Line across
        } else if (stitch === 'hdc') {
            p5.line(0, -h, 0, h); // Double crochet as taller line
            p5.line(-5, h, 5, h); // Line hat
        }
        else if (stitch === 'dc') {
            p5.line(0, -h, 0, h); // Double crochet as taller line
            p5.line(-5, h, 5, h); // Line hat
            p5.line(-5, -h / 3, 5, h / 3); // Line across vertical
        } else if (stitch === 'tr') {
            p5.line(0, -h, 0, h); // Treble as even taller line
            p5.line(-5, h, 5, h); // Line hat
            p5.line(-5, -3-h/3, 5, -3+h/3);
            p5.line(-5, -h/3, 5, h/3);

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
            // Display only the stitch type (without color code)
            const displayStitch = stitch.includes('_') ? stitch.split('_')[0] : stitch;
            p5.text(displayStitch, 0, 0);
        }
    }
    
    function deleteSelectedNodes(nodes) {
        if (!nodes || nodes.length === 0) {
            return;
        }
        
        nodes.forEach(node => {
            // Use the stored grid coordinates to find the node in the grid
            if (node.gridRow !== undefined && node.gridCol !== undefined) {
                grid[node.gridRow][node.gridCol] = null;
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
        });
        
        // Force a redraw
        p5.redraw();
    }
    
    function changeStitchType(nodes, stitchType) {
        // Update the nodes with the new stitch type
        nodes.forEach(node => {
            // Use the stored grid coordinates to update the stitch type
            if (node.gridRow !== undefined && node.gridCol !== undefined) {
                grid[node.gridRow][node.gridCol] = stitchType;
            }
        });
        
        // Force a redraw
        p5.redraw();
    }
    
    // Make sure these are properly exposed
    p5.getSelectedNodes = () => {
        const nodes = selectionHandler ? selectionHandler.getSelectedNodes() : [];
        return nodes;
    };
    p5.deleteSelectedNodes = deleteSelectedNodes;
    p5.duplicateSelectedNodes = duplicateSelectedNodes;
    p5.changeStitchType = changeStitchType;
    
    // Add a function to change the color of selected nodes
    function changeNodeColor(nodes, color) {
        if (!nodes || nodes.length === 0) {
            return;
        }
        
        // Initialize colorMap if it doesn't exist
        if (!grid.colorMap) {
            grid.colorMap = {};
        }
        
        nodes.forEach(node => {
            // Use the stored grid coordinates to update the color
            if (node.gridRow !== undefined && node.gridCol !== undefined) {
                // Store the color in the colorMap using the position as the key
                grid.colorMap[`${node.gridRow}-${node.gridCol}`] = color;
                
                // Also update the node's customColor property for immediate visual feedback
                node.customColor = color;
            }
        });
        
        // Force a redraw
        p5.redraw();
    }
    
    p5.changeNodeColor = changeNodeColor;
    
    // Add this function to get the color for a specific node
    p5.getNodeColor = function(row, col, stitchType) {
        // Check if this node has a custom color
        if (grid.colorMap && grid.colorMap[`${row}-${col}`]) {
            return grid.colorMap[`${row}-${col}`];
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
    
    return p5;
}
