// app/src/lib/interactiveEditing.js
export function enableSelection(p5Instance, positions_null) {
    let isSelecting = false;
    let selectionStart = { x: 0, y: 0 };
    let selectionEnd = { x: 0, y: 0 };
    let selectedNodes = [];
    let onSelectionComplete = null;

    p5Instance.mousePressed = () => {
        if (p5Instance.mouseButton === p5Instance.LEFT) {
            // Start selection when left mouse button is pressed
            isSelecting = true;
            selectionStart = { x: p5Instance.mouseX, y: p5Instance.mouseY };
            selectionEnd = { x: p5Instance.mouseX, y: p5Instance.mouseY };
            // Clear existing selection when starting new one
            selectedNodes = [];
        }
    };

    p5Instance.mouseDragged = () => {
        // Update selection area while dragging
        if (isSelecting) {
            selectionEnd = { x: p5Instance.mouseX, y: p5Instance.mouseY };
        }
    };

    p5Instance.mouseReleased = () => {
        // Finalize selection when mouse is released
        if (isSelecting) {
            selectionEnd = { x: p5Instance.mouseX, y: p5Instance.mouseY };
            updateSelectedNodes(positions_null);
            isSelecting = false;
            
            // If nodes were selected and we have a callback, call it
            if (selectedNodes.length > 0 && onSelectionComplete) {
                onSelectionComplete(selectedNodes, p5Instance.mouseX, p5Instance.mouseY);
            }
        }
    };

    function updateSelectedNodes(positions_null) {
        selectedNodes = [];
        const minX = Math.min(selectionStart.x, selectionEnd.x);
        const maxX = Math.max(selectionStart.x, selectionEnd.x);
        const minY = Math.min(selectionStart.y, selectionEnd.y);
        const maxY = Math.max(selectionStart.y, selectionEnd.y);

        // Check each node if it's within the selection area
        positions_null.forEach(row => {
            row.forEach(node => {
                if (node.stitch && 
                    node.x >= minX && node.x <= maxX &&
                    node.y >= minY && node.y <= maxY) {
                    selectedNodes.push(node);
                }
            });
        });
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
    }

    function getSelectedNodes() {
        return selectedNodes;
    }

    function isCurrentlySelecting() {
        return isSelecting;
    }

    function setSelectionCompleteCallback(callback) {
        onSelectionComplete = callback;
    }

    return {
        drawSelectionArea,
        getSelectedNodes,
        isCurrentlySelecting,
        setSelectionCompleteCallback
    };
}