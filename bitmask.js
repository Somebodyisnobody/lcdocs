class Bitmask {
    table;
    bitfield;
    rowsCount;
    maximumBitfieldValue;
    bitfieldValue;

    constructor(bitmaskDiv) {
        this.table = bitmaskDiv.getElementsByTagName('table')[0];
        this.bitfield = bitmaskDiv.getElementsByTagName('input')[bitmaskDiv.getElementsByTagName('input').length - 1];
        // rows.length may contain header row which we need to ignore
        this.rowsCount = this.tableHasHeader() ? this.table.rows.length - 1 : this.table.rows.length;
        if (this.rowsCount > 32) {
            this.bitfield.disabled = true;
            throw new DOMException("The maximum allowed row count for bitmasks is 32 as clonk uses a 32-bit integer.\nDisabling input field.");
        }
        this.maximumBitfieldValue = ((1 << this.rowsCount) - 1)

        // Update numeric input below the table. The corresponding numeric input could have a number cached.
        this.bitfieldValue = this.bitfield.value;
        // Update table
        this.calculateTable();

        //Add event listeners for input field and table body
        this.table.querySelector('tbody').addEventListener("click",
            (e) => {
                e = e || window.event;
                const clickedElement = e.target || e.srcElement;
                this.calculateBitfieldValue(clickedElement.closest('tr'));
            }
        );
        this.bitfield.addEventListener("input",
            (e) => {
                this.calculateTable();
            }
        );
    }

    calculateBitfieldValue(clickedRow) {
        // Not every table has a header according to the XSD. Check if table has a header as it goes into the rowIndex.
        const bit = this.tableHasHeader() ? clickedRow.rowIndex - 1 : clickedRow.rowIndex;

        // Calculate new bit value. Move 0001 {bit} digits to the left. If bit = 1 => 0010
        this.bitfieldValue = this.bitfieldValue ^ (1 << bit);
        this.markRow(bit, clickedRow)

        // Update numeric input below the table
        this.bitfield.value = this.bitfieldValue;
    }

    tableHasHeader() {
        return this.table.querySelectorAll('th').length > 0;
    }

    // Mark rows that exist in the bitmask
    markRow(bit, row) {
        // Example: 2nd bit (bit = 1), bitfieldValue = 7
        // bitfieldValue in binary == 0111
        // (1 << bit) == (0001 << 1) => 0010
        // Bitwise operation AND-connected 0010 & 0111 == 0010 == in decimal 2 != 0 => evaluates to "true"
        row.classList.toggle("mark", (1 << bit) & this.bitfieldValue);
    }

    calculateTable() {
        // bitfield.value must not be larger than the bitmask we can calculate with our set of table rows
        if (this.bitfield.value > this.maximumBitfieldValue) {
            // Maximum value of the bitmask reached. Resetting input field to maximum value
            this.bitfield.value = this.maximumBitfieldValue;
            console.log('Maximum value of the bitmask reached. Resetting input field to maximum value of %s', this.maximumBitfieldValue);
        }
        this.bitfieldValue = this.bitfield.value;

        // Send every row to markRow() but mind the table header
        for(let bit = 0; bit < this.rowsCount; ++bit) this.markRow(bit, this.tableHasHeader() ? this.table.rows[bit + 1] : this.table.rows[bit]);
    }
}

document.addEventListener("DOMContentLoaded", function(event) {
    let loadedBitmasks = 0;
    for (const div of document.getElementsByClassName('bitmaskTable')) {
        try {
            new Bitmask(div);
            loadedBitmasks++;
        } catch (e) {
            console.error(e)
        }
    }
    console.log("%s Bitmask%s loaded", loadedBitmasks, loadedBitmasks > 1 ? "s" : "");
});
