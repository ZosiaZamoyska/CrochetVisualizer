<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let x = 0;
    export let y = 0;
    export let stitchesType = ['ch', 'sc', 'dc'];
    let showStitchTypes = false;

    function handleDelete() {
        console.log("ContextMenu: handleDelete called");
        dispatch('delete');
    }

    function handleDuplicate() {
        console.log("ContextMenu: handleDuplicate called");
        dispatch('duplicate');
    }

    function handleStitchTypeChange(selectedType) {
        dispatch('changeStitchType', { stitchType: selectedType });
        showStitchTypes = false; // Hide submenu after selection
    }

    function handleMenuClick(event) {
        // Prevent the click from bubbling up to the document
        event.stopPropagation();
    }
</script>

<style>
    .context-menu {
        position: absolute;
        background: white;
        border: 1px solid #ccc;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
        z-index: 1000;
    }
    .context-menu-item {
        padding: 8px 12px;
        cursor: pointer;
    }
    .context-menu-item:hover {
        background: #f0f0f0;
    }
    
    .stitch-type-submenu {
        position: absolute; /* Position it absolutely */
        left: 100%; /* Align to the right of the parent item */
        top: 0; /* Align to the top of the parent item */
        background: white; /* Background color */
        border: 1px solid #ccc; /* Border for the submenu */
        z-index: 1000; /* Ensure it appears above other elements */
        display: none; /* Initially hidden */
    }

    .context-menu-item:hover .stitch-type-submenu {
        display: block; /* Show submenu on hover */
    }

    .stitch-type-item {
        padding: 8px; /* Padding for each item */
        cursor: pointer; /* Pointer cursor on hover */
    }

    .stitch-type-item:hover {
        background-color: #f0f0f0; /* Highlight on hover */
    }
</style>

<div class="context-menu" 
    style="top: {y}px; left: {x}px;"
    on:click={handleMenuClick}
>
    <div class="context-menu-item" on:click={handleDelete}>Delete</div>
    <div class="context-menu-item" on:click={handleDuplicate}>Duplicate</div>
    <div class="context-menu-item" on:mouseenter={() => showStitchTypes = true} on:mouseleave={() => showStitchTypes = false}>
        Change Stitch Type
        {#if showStitchTypes}
            <div class="stitch-type-submenu">
                {#each stitchesType as stitch}
                    <div class="stitch-type-item" on:click={() => handleStitchTypeChange(stitch)}>
                        {stitch}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>