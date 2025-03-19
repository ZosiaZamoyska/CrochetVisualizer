import { writable } from 'svelte/store';

export let grid = [];
export const patternInput = writable('');

export function setGrid(newGrid) {
    grid = newGrid;
}

export function parsePattern(input) {
    // make sure input is valid 
    /*if (input === null || input === undefined || input === '') {
        console.error('parsePattern: Invalid input:', input);  
    }*/
    let stitches = input.split(" ");
    let tempGrid = [];
    let row = [];
    
    let rowIndex = 0;
    let base = true;
    let chainCount = 0;

    for (let i = 0; i < stitches.length; i++) {
        let stitch = stitches[i];
        //console.log(stitch);
        
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

export function gridToPattern() {
    let pattern = [];

    for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
        
        let row = grid[rowIndex];
        let rowStitches = [];
        // Find first and last non-null stitch in the row
        let start = row.findIndex(stitch => stitch !== null);
        let end = row.length - 1;
        while (end >= 0 && row[end] === null) end--;
        if (rowIndex !== 0) {
            rowStitches.push('ch');
        }
        if (start === -1) continue; // Skip empty rows

        // Push stitches based on row index
        if (rowIndex % 2 === 0) { // Even row
            for (let i = start; i <= end; i++) {
                if (row[i] !== null) {
                    rowStitches.push(row[i]);
                }
            }
        } else { // Odd row
            for (let i = end; i >= start; i--) {
                if (row[i] !== null) {
                    rowStitches.push(row[i]);
                }
            }
        }
        pattern.push(rowStitches.join(' '));
    }
    let patternString = pattern.join(' ');
    console.log(patternString);

    patternInput.set(patternString);
    return patternString;
}


