import { draw } from 'svelte/transition';
import { enableSelection } from './interactiveEditing.js';
import  ContextMenu from './ContextMenu.svelte'; // Import the context menu component

export function createBasicP5Instance(p5, grid, stitchesDone, isPlaying, verticalSpacing = 15, horizontalSpacing = 15, chColor = "#00DC00", scColor = "#00C800", dcColor = "#00AA00", customStitches = [], onShowContextMenu) {
    let positions = [];
    let positions_null = [];
    let selectionHandler;
    let selectedNodes = [];

    p5.setup = () => {
        p5.createCanvas(800, 600);
        p5.background(255);
        selectionHandler = enableSelection(p5, positions_null);
        
        // Set up the callback for when selection is complete
        if (typeof onShowContextMenu === 'function') {
            selectionHandler.setSelectionCompleteCallback((nodes, x, y) => {
                if (nodes.length > 0) {
                    onShowContextMenu(x, y, {
                        onDelete: () => deleteSelectedNodes(nodes),
                        onDuplicate: () => duplicateSelectedNodes(nodes),
                        onChangeStitchType: () => changeStitchType(nodes)
                    });
                }
            });
        }
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

        if (count >= stitchesDone && isPlaying) {
            p5.fill(180);
        }

        // Draw the node
        p5.ellipse(position.x, position.y, 30, 30);
        p5.noStroke();
        p5.fill(255);
        p5.text(position.stitch, position.x, position.y);
    }
    function deleteSelectedNodes(nodes) {
        nodes.forEach(node => {
            // Find the node in the grid and remove it
            for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
                for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
                    if (positions_null[rowIndex][colIndex] === node) {
                        grid[rowIndex][colIndex] = null;
                    }
                }
            }
        });
        // Clear selection after deletion
        selectionHandler.getSelectedNodes().length = 0;
    }

    function duplicateSelectedNodes(nodes) {
        const newNodes = nodes.map(node => ({
            ...node,
            x: node.x + horizontalSpacing,
            y: node.y
        }));
        
        // Add new nodes to the grid
        newNodes.forEach(newNode => {
            let inserted = false;
            for (let rowIndex = 0; rowIndex < grid.length && !inserted; rowIndex++) {
                for (let colIndex = 0; colIndex < grid[rowIndex].length && !inserted; colIndex++) {
                    if (!grid[rowIndex][colIndex]) {
                        grid[rowIndex][colIndex] = newNode.stitch;
                        inserted = true;
                    }
                }
            }
        });
    }

    function changeStitchType(nodes) {
        const stitchTypes = ['ch', 'sc', 'dc', ...customStitches.map(s => s.name)];
        const currentType = nodes[0].stitch;
        const currentIndex = stitchTypes.indexOf(currentType);
        const nextType = stitchTypes[(currentIndex + 1) % stitchTypes.length];

        nodes.forEach(node => {
            // Find and update the node in the grid
            for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
                for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
                    if (positions_null[rowIndex][colIndex] === node) {
                        grid[rowIndex][colIndex] = nextType;
                    }
                }
            }
        });
    }

    function redrawCanvas() {
        p5.clear();
        p5.draw(); // Call the draw function to refresh the canvas
    }
}