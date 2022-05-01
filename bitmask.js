let bitfieldValue;

function calculateBitfieldValue(e) {
    e = e || window.event;
    var target = e.target || e.srcElement;
    const clickedRow = target.closest('tr');
    const clickedTable = clickedRow.closest('table');
    const bit = clickedRow.rowIndex - 1;

    bitfieldValue = bitfieldValue ^ (1 << bit);
    markField(clickedRow.rowIndex, clickedTable)

    if (clickedTable.nextElementSibling.nodeName === 'LABEL') {
        clickedTable.nextElementSibling.querySelector('input').value = bitfieldValue;
    }
}


function markField(rowIndex, table) {
    const bit = rowIndex - 1;
    const row = table.rows[rowIndex];

    row.classList.toggle("mark", (1 << bit) & bitfieldValue);
}

function calculateTable(e) {
    e = e || window.event;
    const bitfield = e.target || e.srcElement;
    if (bitfield.nodeName !== 'INPUT') return;
    const table = bitfield.parentElement.previousElementSibling;

    if (table.nodeName === 'TABLE') {
        // rows.length contains header row.
        const rowsCount = table.rows.length - 1;
        const maximumBitfieldValue = ((1 << rowsCount) - 1);

        if (bitfield.value > maximumBitfieldValue) {
            // Maximum value of the bitmask reached. Resetting input field to maximum value;
            bitfieldValue = maximumBitfieldValue;
            bitfield.value = maximumBitfieldValue;
            console.log('Maximum value of the bitmask reached. Resetting input field to maximum value of %s', maximumBitfieldValue);
        } else {
            bitfieldValue = bitfield.value;
        }

        for(let i = 1; i <= rowsCount; ++i) markField(i, table);
    }
}
