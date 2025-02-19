# Crochet Visualizer
Visualizing 2D crochet patterns based on sequence of stitches

# Rules

This visualizer can render very simple patterns from sequence of stitches.
Usually, a pattern cannot be rendered just from stitches, unless it follows a very specific logic. In this visualizer, we utilize following rules:
* chains are used either as base, or for turning
* base is chain of chains that are done before any other stitch, and they build the first row
* last chain in base is a turning chain
* if a chain occurs after other type of stitch, it is a turning chain
* stitches are built on top of previous row, one by one
* that means, we do not visualize increase or decrease into specific stitch
* if a certain row has more stitches than previous, we just visualize it as an extension of current row (can think of it as increase into last stitch)
* visualization is done in a form that crochet follows, that is a zigzag pattern from right to left, left to right, and so on.

# Run
`
npm run dev
`
assuming you have all other necessary stuff installed