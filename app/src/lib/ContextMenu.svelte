<script>
    export let x = 0;
    export let y = 0;
    export let onDelete;
    export let onDuplicate;
    export let onChangeStitchType;

    const handleDelete = () => {
        onDelete();
    };

    const handleDuplicate = () => {
        onDuplicate();
    };

    const handleChangeStitchType = () => {
        onChangeStitchType();
    };

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
</style>

<div class="context-menu" 
    style="top: {y}px; left: {x}px;"
    on:click={handleMenuClick}
>
    <div class="context-menu-item" on:click={handleDelete}>Delete</div>
    <div class="context-menu-item" on:click={handleDuplicate}>Duplicate</div>
    <div class="context-menu-item" on:click={handleChangeStitchType}>Change Stitch Type</div>
</div>