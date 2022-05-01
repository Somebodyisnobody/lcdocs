let bitfieldValue;

function calculateBitfieldValue(e) {
    e = e || window.event;
    var target = e.target || e.srcElement;
    const clickedRow = target.closest('tr');
    const clickedTable = clickedRow.closest('table');
    // Not every table has a header according to the XSD. Check if table has a header as it goes into the rowIndex.
    const bit = tableHasHeader(clickedTable) ? clickedRow.rowIndex - 1 : clickedRow.rowIndex;

    // Get current value from bitfield. If we have more than one bitmask in the document the global variable makes problems.
    // TODO make objects instead global variable
    if (clickedTable.nextElementSibling.nodeName === 'LABEL') {
        bitfieldValue = clickedTable.nextElementSibling.querySelector('input').value;
    }

    // Calculate new bit value. Move 0001 {bit} digits to the left. If bit = 1 => 0010
    bitfieldValue = bitfieldValue ^ (1 << bit);
    markRow(bit, clickedRow)

    // Update numeric input below the table
    if (clickedTable.nextElementSibling.nodeName === 'LABEL') {
        clickedTable.nextElementSibling.querySelector('input').value = bitfieldValue;
    }
}

function bitfieldChange(e) {
    e = e || window.event;
    const bitfield = e.target || e.srcElement;
    if (bitfield.nodeName !== 'INPUT') return;
    const table = bitfield.parentElement.previousElementSibling;

    if (table.nodeName === 'TABLE') calculateTable(bitfield, table);
}

function tableHasHeader(table) {
    return table.querySelectorAll('th').length > 0;
}

 // Mark row that exist in the bitmask
function markRow(bit, row) {
    // Example: 2nd bit (bit = 1), bitfieldValue = 7
    // bitfieldValue in binary == 0111
    // (1 << bit) == (0001 << 1) => 0010
    // Bitwise operation AND-connected 0010 & 0111 == 0010 == in decimal 2 != 0 => evaluates to "true"
    row.classList.toggle("mark", (1 << bit) & bitfieldValue);
}

function calculateTable(bitfield, table) {
        // rows.length may contain header row which we need to ignore
        const rowsCount = tableHasHeader(table) ? table.rows.length - 1 : table.rows.length;

        // bitfield.value must not be larger than the bitmask we can calculate with our set of table rows
        const maximumBitfieldValue = ((1 << rowsCount) - 1);
        if (bitfield.value > maximumBitfieldValue) {
            // Maximum value of the bitmask reached. Resetting input field to maximum value
            bitfieldValue = maximumBitfieldValue;
            bitfield.value = maximumBitfieldValue;
            console.log('Maximum value of the bitmask reached. Resetting input field to maximum value of %s', maximumBitfieldValue);
        } else {
            bitfieldValue = bitfield.value;
        }

        // Send every row to markRow() but mind the table header
        for(let bit = 0; bit < rowsCount; ++bit) markRow(bit, tableHasHeader(table) ? table.rows[bit + 1] : table.rows[bit]);
}

document.addEventListener("DOMContentLoaded", function(event) {
    for (const table of document.querySelectorAll('table')) {
        // Update numeric input below the table. The corresponding numeric input could have a number cached.
        if (table.nextElementSibling.nodeName === 'LABEL') calculateTable(table.nextElementSibling.querySelector('input'), table);
    }
    console.log("Bitmasks loaded");
});
