import { draw } from 'svelte/transition';
import { enableSelection } from './interactiveEditing.js';
import  ContextMenu from './ContextMenu.svelte'; // Import the context menu component
import { gridToPattern } from './parser.svelte';
export function createBasicP5Instance(p5, grid, stitchesDone, isPlaying, verticalSpacing = 15, horizontalSpacing = 15, chColor = "#00DC00", scColor = "#00C800", dcColor = "#00AA00", customStitches = [], onShowContextMenu) {
    let positions = [];
    let positions_null = [];
    let selectionHandler;
    let selectedNodes = [];

    p5.setup = () => {
        p5.createCanvas(800, 600);
        p5.background(255);
        //p5.noLoop();
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
      p5.textSize(14);
      p5.textAlign(p5.CENTER, p5.CENTER);
  
      const xStart = 50;
      const yStart = 50;
      const stitchSize = 30;
      const ovalSize = 30;
      const totalHeight = (grid.length-1) * (stitchSize + verticalSpacing); // Total grid height

      grid.forEach((row, rowIndex) => {
        let positions_null_row = [];
        row.forEach((stitch, colIndex) => {
          if (stitch) {
            let xPos = xStart + colIndex * (stitchSize + horizontalSpacing);
            let yPos = yStart + totalHeight - rowIndex * (stitchSize + verticalSpacing);
            if (rowIndex !== 0) {
              xPos = positions_null[rowIndex - 1][colIndex].x;
              yPos = positions_null[rowIndex - 1][colIndex].y  - (stitchSize + verticalSpacing);
            }
            positions_null_row.push({ x: xPos, y: yPos, stitch });
          } else {
            let xPos = xStart + colIndex * (stitchSize + horizontalSpacing);
            let yPos = yStart + totalHeight - rowIndex * (stitchSize + verticalSpacing);
            positions_null_row.push({ x: xPos, y: yPos, stitch });
          }
        });
        positions = positions_null_row.concat(positions);
        positions_null.push(positions_null_row);
      });
  
      function drawArrow(p1, p2, curved, dir) {
        p5.stroke(0);
        p5.strokeWeight(2);
  
        let { x: x1, y: y1 } = p1;
        let { x: x2, y: y2 } = p2;
        let arrowSize = 5;
  
        if (!curved) {
          let angle = Math.atan2(y2 - y1, x2 - x1);
          let stopX = x2 - (stitchSize/2) * Math.cos(angle);
          let stopY = y2 - (stitchSize/2) * Math.sin(angle);
          let arrowX1 = stopX - arrowSize * Math.cos(angle - Math.PI / 6);
          let arrowY1 = stopY - arrowSize * Math.sin(angle - Math.PI / 6);
          let arrowX2 = stopX - arrowSize * Math.cos(angle + Math.PI / 6);
          let arrowY2 = stopY - arrowSize * Math.sin(angle + Math.PI / 6);
  
          p5.line(x1, y1, stopX, stopY);
          p5.line(stopX, stopY, arrowX1, arrowY1);
          p5.line(stopX, stopY, arrowX2, arrowY2);
        } else {
          let controlX1 = x1 + dir * (stitchSize + horizontalSpacing) / 2;
          let controlY1 = y1;
          let controlX2 = x2 + dir * (stitchSize + horizontalSpacing) / 2;
          let controlY2 = y2;
          p5.noFill();
          p5.bezier(x1, y1, controlX1, controlY1, controlX2, controlY2, x2, y2);
  
          let t = 0.74;
          let bx = p5.bezierPoint(x1, controlX1, controlX2, x2, t);
          let by = p5.bezierPoint(y1, controlY1, controlY2, y2, t);
          let bxTangent = p5.bezierTangent(x1, controlX1, controlX2, x2, t);
          let byTangent = p5.bezierTangent(y1, controlY1, controlY2, y2, t);
          let tangentAngle = Math.atan2(byTangent, bxTangent);
  
          let arrowX1 = bx - arrowSize * Math.cos(tangentAngle - Math.PI / 6);
          let arrowY1 = by - arrowSize * Math.sin(tangentAngle - Math.PI / 6);
          let arrowX2 = bx - arrowSize * Math.cos(tangentAngle + Math.PI / 6);
          let arrowY2 = by - arrowSize * Math.sin(tangentAngle + Math.PI / 6);
  
          p5.line(bx, by, arrowX1, arrowY1);
          p5.line(bx, by, arrowX2, arrowY2);
        }
      }
      function createNode(p5, position, ovalSize, chColor, scColor, dcColor, customStitches, stitchesDone, isPlaying) {
        const x = position.x;
        const y = position.y;
        const stitch = position.stitch;

        p5.fill(0, 200, 0);
        p5.noStroke();

        // Set fill color based on stitch type
        if (stitch === 'ch') {
            p5.fill(chColor);
        } else if (stitch === 'sc') {
            p5.fill(scColor);
        } else if (stitch === 'dc') {
            p5.fill(dcColor);
        } else {
            // Check for custom stitch color
            const customStitch = customStitches.find(s => s.name === stitch);
            if (customStitch) {
                p5.fill(customStitch.color);
            } else {
                p5.fill(180); // Default gray for unknown stitch types
            }
        }

        // Adjust fill color if the stitch count exceeds the threshold
        if (count >= stitchesDone && isPlaying) {
            p5.fill(180);
        }

        // Draw the node
        p5.ellipse(x, y, ovalSize, ovalSize);
        p5.noStroke();
        p5.fill(255);
        p5.text(stitch, x, y);
    }
  
      for (let rowIndex = 0; rowIndex < grid.length -1; rowIndex++) {
        let dir = 1;
        let lastColIndex = 0;
        if (rowIndex % 2 === 0) {
          lastColIndex = grid[rowIndex].length - 1;
          while (lastColIndex >= 0 && grid[rowIndex][lastColIndex] === null) {
            lastColIndex--;
          }
        }
        else
        {
          lastColIndex = 0;
          dir = -1;
          while (lastColIndex >= 0 && grid[rowIndex][lastColIndex] === null) {
            lastColIndex++;
          }

        }
        if (lastColIndex >= 0) {
          let x1 = positions_null[rowIndex][lastColIndex].x;
          let y1 = positions_null[rowIndex][lastColIndex].y;
          let x2 = positions_null[rowIndex+1][lastColIndex].x;
          let y2 = positions_null[rowIndex+1][lastColIndex].y;
          drawArrow({x: x1, y: y1}, {x: x2, y: y2}, 1, dir);
        }
      }

      // Horizontal arrows (same row)
      for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
        for (let colIndex = 1; colIndex < grid[rowIndex].length; colIndex++) {
          if (grid[rowIndex][colIndex] && grid[rowIndex][colIndex - 1]) {
            let x1 = positions_null[rowIndex][colIndex].x;
            let y1 = positions_null[rowIndex][colIndex].y;
            let x2 = positions_null[rowIndex][colIndex - 1].x;
            let y2 = positions_null[rowIndex][colIndex - 1].y;

            if (rowIndex % 2 === 1)
            {
              drawArrow({x: x1, y: y1}, {x: x2, y: y2}, false, 1);
            }
            else
            {
              drawArrow({x: x2, y: y2}, {x: x1, y: y1}, false, 1);
            }
          }
        }
      }

      // Vertical lines (same column)
      for (let rowIndex = 1; rowIndex < grid.length; rowIndex++) {
        for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
          if (grid[rowIndex][colIndex] && grid[rowIndex - 1][colIndex] && grid[rowIndex][colIndex] != 'ch') {
            let x1 = positions_null[rowIndex][colIndex].x;
            let y1 = positions_null[rowIndex][colIndex].y;
            let x2 = positions_null[rowIndex - 1][colIndex].x;
            let y2 = positions_null[rowIndex - 1][colIndex].y;

            drawArrow({x: x1, y: y1}, {x: x2, y: y2}, false, 1);
          }
        }
      }

      // Draw stitches
        let count = 0;
        for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
            if (rowIndex % 2 == 0) {
                for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
                    if (positions_null[rowIndex][colIndex].stitch) {
                        count += 1;
                        drawNode(positions_null[rowIndex][colIndex], count);
                    }
                }
            } else {
                for (let colIndex = grid[rowIndex].length - 1; colIndex >= 0; colIndex--) {
                    if (positions_null[rowIndex][colIndex].stitch) {
                        count += 1;
                        drawNode(positions_null[rowIndex][colIndex], count);
                    }
                }
            }
        }
        if (selectionHandler) {
            selectionHandler.drawSelectionArea();
        }
    };
    p5.mousePressed = () => {
        // Only handle selection through the selectionHandler
        if (selectionHandler && !selectionHandler.isCurrentlySelecting()) {
            selectedNodes = [];
        }
    };

    function drawNode(position, count) {
        const selectedNodes = selectionHandler ? selectionHandler.getSelectedNodes() : [];
        const isSelected = selectedNodes.includes(position);
        p5.noStroke();
        
        // Set fill color based on selection and stitch type
        if (isSelected) {
            p5.fill(30, 30, 30, 200); // Highlight selected nodes
        } else {
            // Find the position of this node in the grid
            let nodeRowCol = null;
            for (let rowIndex = 0; rowIndex < positions_null.length; rowIndex++) {
                for (let colIndex = 0; colIndex < positions_null[rowIndex].length; colIndex++) {
                    if (positions_null[rowIndex][colIndex] === position) {
                        nodeRowCol = `${rowIndex}-${colIndex}`;
                        break;
                    }
                }
                if (nodeRowCol) break;
            }
            
            // Check if this specific node has a custom color in the colorMap
            if (nodeRowCol && grid.colorMap && grid.colorMap[nodeRowCol]) {
                p5.fill(grid.colorMap[nodeRowCol]);
            } else {
                // Use default color based on stitch type
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
        }

        if (count >= stitchesDone && isPlaying) {
            p5.fill(180);
        }

        // Draw the node
        p5.ellipse(position.x, position.y, 30, 30);
        p5.noStroke();
        p5.fill(255);
        // Display only the stitch type (without color code)
        const displayStitch = position.stitch.includes('_') ? position.stitch.split('_')[0] : position.stitch;
        p5.text(displayStitch, position.x, position.y);
    }
    function deleteSelectedNodes(nodes) {
        if (!nodes || nodes.length === 0) {
            return;
        }

        nodes.forEach(node => {
            for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
                for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
                    if (positions_null[rowIndex][colIndex] === node) {
                        grid[rowIndex][colIndex] = null;
                    }
                }
            }
        });
        // Update pattern input after deletion
        gridToPattern();

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
            for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
                for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
                    if (positions_null[rowIndex][colIndex] === node) {
                        // Create a new node with the same stitch type
                        const newNode = {
                            ...node,
                            x: node.x + horizontalSpacing, // Adjust position for duplication
                            y: node.y // Keep the same y position
                        };

                        // Find the first available position in the grid to insert the new node
                        let inserted = false;
                        for (let r = 0; r < grid.length && !inserted; r++) {
                            for (let c = 0; c < grid[r].length && !inserted; c++) {
                                if (!grid[r][c]) { // Check for an empty spot
                                    grid[r][c] = newNode.stitch; // Place the stitch type in the grid
                                    inserted = true; // Mark as inserted
                                }
                            }
                        }
                    }
                }
            }
        });

        // Update pattern input after duplication
        gridToPattern();

        // Force a redraw
        p5.redraw();
    }

    function changeStitchType(nodes, stitchType) {
        const stitchTypes = ['ch', 'sc', 'dc', ...customStitches.map(s => s.name)];
        // Update the nodes with the new stitch type
        nodes.forEach(node => {
            // Find and update the node in the grid
            for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
                for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
                    if (positions_null[rowIndex][colIndex] === node) {
                        grid[rowIndex][colIndex] = stitchType; // Update to the new stitch type
                    }
                }
            }
        });
    }

    // Make sure these are properly exposed
    p5.getSelectedNodes = () => {
        const nodes = selectionHandler ? selectionHandler.getSelectedNodes() : [];
        console.log("getSelectedNodes called, returning:", nodes);
        return nodes;
    };
    p5.deleteSelectedNodes = deleteSelectedNodes;
    p5.duplicateSelectedNodes = duplicateSelectedNodes;
    p5.changeStitchType = changeStitchType;

    // Add this function to handle changing node colors
    p5.changeNodeColor = function(nodes, color) {
        if (!nodes || nodes.length === 0) return;
        
        // Initialize colorMap if it doesn't exist
        if (!grid.colorMap) {
            grid.colorMap = {};
        }
        
        // Apply the color to each selected node
        nodes.forEach(node => {
            // Find the position of this node in the grid
            for (let rowIndex = 0; rowIndex < positions_null.length; rowIndex++) {
                for (let colIndex = 0; colIndex < positions_null[rowIndex].length; colIndex++) {
                    if (positions_null[rowIndex][colIndex] === node) {
                        // Store the color in the colorMap using the position as the key
                        grid.colorMap[`${rowIndex}-${colIndex}`] = color;
                        
                        // Also update the node's customColor property for immediate visual feedback
                        node.customColor = color;
                    }
                }
            }
        });
        
        // Redraw the canvas
        p5.redraw();
    };

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