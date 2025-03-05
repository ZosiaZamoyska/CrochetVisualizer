import { writable } from 'svelte/store';

export let grid = [];

export function parsePattern(input) {
    let stitches = input.split(" ");
    let tempGrid = [];
    let row = [];
    
    let rowIndex = 0;
    let base = true;
    let chainCount = 0;

    for (let i = 0; i < stitches.length; i++) {
        let stitch = stitches[i];
        
        if (stitch === "ch") {
            if (base) {
                row.push(stitch);
            } else {
                if (row.length > 0) {
                    chainCount++;
                    row.push(stitch);
                }
            }
        } else {
            if (base) {
                base = false;
                if (row.length > 0) {
                    row.pop();
                }
                tempGrid.push(row);
                rowIndex++;
                row = [];
            }
            else if (chainCount == 1)
            {
            tempGrid.push(row);
            rowIndex++;
            row.pop();
            row = [];
            }
            chainCount = 0;
            row.push(stitch);
        }
    }

    if (row.length > 0) {
        tempGrid.push(row);
    }

    let minCol = 0;
    let maxCol = 0;
    let currentCol = 0;

    for (let i = 0; i < tempGrid.length; i++) {
        let r = tempGrid[i];
        
        if (i % 2 === 0) {
            for (let j = 0; j < r.length; j++) {
                currentCol++;
                maxCol = Math.max(maxCol, currentCol);
            }
        } else {
            for (let j = r.length - 1; j >= 0; j--) {
                currentCol--;
                minCol = Math.min(minCol, currentCol);
            }
        }
    }

    let gridWidth = maxCol - minCol;

    let normalizedGrid = [];
    currentCol = 0;
    let startIdx;
    let lastIdx;
    startIdx = Math.abs(minCol);

    for (let i = 0; i < tempGrid.length; i++) {
        let r = tempGrid[i];
        let paddedRow = new Array(gridWidth + 1).fill(null);

        if (i === 0) {
        for (let j = 0; j < r.length; j++) {
                paddedRow[startIdx + j] = r[j];
                lastIdx = startIdx + j;
            }
        } else {
            if (i %2 === 0)
            {
            startIdx = lastIdx;
            for (let j = 0; j < r.length; j++)
            {
                paddedRow[startIdx + j] = r[j];
                lastIdx = startIdx + j;
            }
            }
            else 
            {
            startIdx = lastIdx;
            for (let j = 0; j < r.length; j++) {
                paddedRow[startIdx - j] = r[j];
                lastIdx = startIdx - j;
            }
            }
        }

        normalizedGrid.push(paddedRow);
    }
    grid = normalizedGrid; //.reverse();
}

