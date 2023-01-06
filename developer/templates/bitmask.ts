class Bitmask {
    table;
    bitfield;
    rowsCount;
    minimumBitfieldValue;
    maximumBitfieldValue;
    bitfieldValue;
    usingCustomBitPositions;

    constructor(bitmaskDiv) {
        this.table = bitmaskDiv.getElementsByTagName('table')[0];
        this.bitfield = bitmaskDiv.getElementsByTagName('input')[bitmaskDiv.getElementsByTagName('input').length - 1];
        // rows.length may contain header row which we need to ignore.
        this.rowsCount = this.tableHasHeader() ? this.table.rows.length - 1 : this.table.rows.length;

        // Check if custom bit values are used.
        this.usingCustomBitPositions = false;
        for (const row of this.table.rows) {
            if (row.hasAttribute('data-custom-bit-pos')) this.usingCustomBitPositions = true;
        }
        if (this.usingCustomBitPositions) {
            let highestBitPosition = 0;
            for (const row of this.table.rows) {
                // We don't care about table header rows.
                if (this.isHeaderRow(row)) continue;
                // Check if all rows have a custom bit, otherwise stop.
                if (!row.hasAttribute('data-custom-bit-pos')) this.lockAndEscape("Detected rows with and without \"data-custom-bit-pos\"-attribute. If the attribute is set, all rows (not the header row) need to have it.");
                const customBitPosition = parseInt(row.getAttribute('data-custom-bit-pos'));
                // Check if all rows have a valid bit set.
                if (isNaN(customBitPosition) || customBitPosition > 32 || customBitPosition < 0) this.lockAndEscape(`Detected row with invalid \\"data-custom-bit-pos\\"-attribute in row ${row.rowIndex}`);
                highestBitPosition = Math.max(highestBitPosition, customBitPosition);
            }
            this.determineBitfieldLimits(highestBitPosition);
        } else {
            this.determineBitfieldLimits(this.rowsCount)
        }

        // Update numeric input below the table. The corresponding numeric input could have a number cached.
        this.bitfieldValue = parseInt(this.bitfield.value);
        // Update table
        this.calculateTable();

        //Add event listeners for input field and table body
        this.table.querySelector('tbody').addEventListener("click",
            (e) => {
                e = e || window.event;
                const clickedElement = e.target || e.srcElement;
                const clickedRow = clickedElement.closest('tr');
                if (clickedRow === null) return;
                this.calculateBitfieldValue(clickedRow);
            }
        );
        this.bitfield.addEventListener("input",
            (e) => {
                this.calculateTable();
            }
        );
        this.bitfield.disabled = false;
    }

    lockAndEscape(reason) {
        this.bitfield.disabled = true;
        throw new DOMException(reason + "\nDisabling input field.");
    }

    determineBitfieldLimits(highestBitPosition) {
        // We can handle a maximum of 32 bit as clonk works with a 32-bit integer.
        if (highestBitPosition > 32) {
            this.lockAndEscape("The maximum allowed row count for bitmasks is 32 as clonk uses a 32-bit integer.")
        } else if (highestBitPosition === 32) {
            // When we have 32 bit we need to adjust the allowed input field range as the 32. bit is responsible for the range 0 to -2147483648 while bit 1 to 31 are responsible for the range 0 to 2147483647.
            this.minimumBitfieldValue = -2147483648
            this.maximumBitfieldValue = 2147483647
        } else {
            this.minimumBitfieldValue = 0
            this.maximumBitfieldValue = ((1 << highestBitPosition) - 1)
        }
    }

    calculateBitfieldValue(clickedRow) {
        let bitPosition;
        if (this.usingCustomBitPositions === false) {
            // Not every table has a header according to the XSD. Check if table has a header as it goes into the rowIndex.
            bitPosition = this.tableHasHeader() ? clickedRow.rowIndex : clickedRow.rowIndex + 1;
        } else {
            const customBit = parseInt(clickedRow.getAttribute('data-custom-bit-pos'));
            if (customBit > 0) {
                bitPosition = customBit;
            } else {
                // This row must be 0 or has an invalid value and doesn't count to the bitmask.
                return;
            }
        }
        // Calculate new bitmask value. Move 0001 {bitPosition - 1} digits to the left. If bitPosition = 2 => 0010.
        this.bitfieldValue = this.bitfieldValue ^ (1 << bitPosition - 1);
        // Update numeric input below the table
        this.bitfield.value = this.bitfieldValue;
        this.calculateTable();
    }

    tableHasHeader() {
        return this.table.querySelectorAll('th').length > 0;
    }

    isHeaderRow(row) {
        return row.querySelectorAll('th').length > 0;
    }

    // Mark rows that exist in the bitmask.
    markRow(bitPosition, row) {
        // If bitmask value is zero we can mark the "All" or "None" lines which have no bit position (bit position = 0).
        if (bitPosition === 0) {
            row.classList.toggle("mark", this.bitfieldValue === 0);
            return;
        }
        // For bitwise operation we need to subtract by one. We don't want to shift 0001 one to the left if we handle the 1st bitPosition.
        const shiftBy = bitPosition - 1;
        // Example: 2nd bit (bit = 1), bitfieldValue = 7
        // bitfieldValue in binary == 0111
        // (1 << bit) == (0001 << 1) => 0010
        // Bitwise operation AND-connected 0010 & 0111 == 0010 == in decimal 2 != 0 => evaluates to "true"
        row.classList.toggle("mark", (1 << shiftBy) & this.bitfieldValue);
    }

    calculateTable() {
        // bitfield.value must not be larger (or negative smaller) than the bitmask we can calculate with our set of table rows.
        if (this.bitfield.value < this.minimumBitfieldValue) {
            this.bitfield.value = this.minimumBitfieldValue;
            console.log('Minimum value of the bitmask reached. Resetting input field to minimum value of %s', this.minimumBitfieldValue);
        } else if (this.bitfield.value > this.maximumBitfieldValue) {
            this.bitfield.value = this.maximumBitfieldValue;
            console.log('Maximum value of the bitmask reached. Resetting input field to maximum value of %s', this.maximumBitfieldValue);
        }
        this.bitfieldValue = parseInt(this.bitfield.value);

        if (this.usingCustomBitPositions === false) {
            let bitPosition = 1;
            for (const row of this.table.rows) {
                // We don't care about table header rows.
                if (this.isHeaderRow(row)) continue;
                this.markRow(bitPosition, row);
                bitPosition++;
            }
        } else {
            for (const row of this.table.rows) {
                const customBitPosition = parseInt(row.getAttribute('data-custom-bit-pos'));
                // We don't care about table header rows.
                if (this.isHeaderRow(row)) continue;
                this.markRow(customBitPosition, row);
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", function (event) {
    let loadedBitmasks = 0;
    for (const div of <HTMLCollectionOf<HTMLDivElement>>document.getElementsByClassName('bitmaskTable')) {
        try {
            new Bitmask(div);
            loadedBitmasks++;
        } catch (e) {
            console.error(e)
        }
    }
    console.log("%s Bitmask%s loaded", loadedBitmasks, loadedBitmasks !== 1 ? "s" : "");
});
