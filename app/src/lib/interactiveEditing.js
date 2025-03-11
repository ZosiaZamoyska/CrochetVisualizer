// app/src/lib/interactiveEditing.js
export function enableSelection(p5Instance, positions_null) {
    let isSelecting = false;
    let selectionStart = { x: 0, y: 0 };
    let selectionEnd = { x: 0, y: 0 };
    let selectedNodes = [];

    p5Instance.mousePressed = () => {
        // Only start new selection if it's a left click and not clicking on the context menu
        if (p5Instance.mouseButton === p5Instance.LEFT && 
            !document.querySelector('.context-menu')?.contains(event.target)) {
            isSelecting = true;
            selectionStart = { x: p5Instance.mouseX, y: p5Instance.mouseY };
            selectionEnd = { x: p5Instance.mouseX, y: p5Instance.mouseY };
            // Clear previous selection only when starting a new one
            selectedNodes = [];
            console.log("Selection started at:", selectionStart);
        }
    };

    p5Instance.mouseDragged = () => {
        if (isSelecting) {
            selectionEnd = { x: p5Instance.mouseX, y: p5Instance.mouseY };
        }
    };

    p5Instance.mouseReleased = () => {
        if (isSelecting) {
            selectionEnd = { x: p5Instance.mouseX, y: p5Instance.mouseY };
            updateSelectedNodes();
            isSelecting = false;
            console.log("Selection completed, selected nodes:", selectedNodes);
        }
    };

    function updateSelectedNodes() {
        const minX = Math.min(selectionStart.x, selectionEnd.x);
        const maxX = Math.max(selectionStart.x, selectionEnd.x);
        const minY = Math.min(selectionStart.y, selectionEnd.y);
        const maxY = Math.max(selectionStart.y, selectionEnd.y);

        positions_null.forEach(row => {
            row.forEach(node => {
                if (node && node.stitch && 
                    node.x >= minX && node.x <= maxX &&
                    node.y >= minY && node.y <= maxY) {
                    selectedNodes.push(node);
                }
            });
        });
        console.log("Updated selected nodes:", selectedNodes);
    }

    function drawSelectionArea() {
        if (isSelecting) {
            p5Instance.push();
            p5Instance.noFill();
            p5Instance.stroke(0, 150, 255);
            p5Instance.strokeWeight(2);
            const width = selectionEnd.x - selectionStart.x;
            const height = selectionEnd.y - selectionStart.y;
            p5Instance.rect(selectionStart.x, selectionStart.y, width, height);
            p5Instance.pop();
        }

        // Draw highlight for selected nodes even when not selecting
        if (selectedNodes.length > 0) {
            p5Instance.push();
            p5Instance.noFill();
            p5Instance.stroke(0, 150, 255);
            p5Instance.strokeWeight(2);
            selectedNodes.forEach(node => {
                p5Instance.ellipse(node.x, node.y, 35, 35);
            });
            p5Instance.pop();
        }
    }

    return {
        drawSelectionArea,
        getSelectedNodes: () => selectedNodes,
        isCurrentlySelecting: () => isSelecting,
        clearSelection: () => {
            selectedNodes = [];
        }
    };
}