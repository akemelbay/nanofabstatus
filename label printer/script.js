$(document).ready(function() {
    const range = `${SHEET_NAME}!A1:Z`; // Adjust the range as needed

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            const headers = data.values[0];
            const rows = data.values.slice(1);
            const tableHeader = $('#table-header');

            headers.forEach(header => {
                tableHeader.append($('<th>').text(header));
            });

            // Find the index of the "Material name" column
            const materialNameIndex = headers.indexOf("Material name");

            // Replace values in the "Material name" column based on the provided vocabulary
            if (materialNameIndex !== -1) {
                rows.forEach(row => {
                    if (row[materialNameIndex]) {
                        row[materialNameIndex] = row[materialNameIndex]
                            .replace(/Titanium/g, "Ti")
                            .replace(/Tungsten/g, "W")
                            .replace(/Hafnium/g, "Hf")
                            .replace(/Silicon/g, "Si")
                            .replace(/Niobium/g, "Nb")
                            .replace(/ Nitride/g, "N");
                    }
                });
            }

            const tableBody = $('#example tbody');

            rows.forEach(row => {
                const tr = $('<tr>');
                row.forEach(cell => {
                    tr.append($('<td>').text(cell));
                });
                tableBody.append(tr);
            });

            const columnDefs = headers.map((header, index) => {
                if (header === "Entry date" || header === "XML file path" || header === "CSV file path" || header === "MFC 3 max, sccm") {
                    return {
                        targets: index,
                        visible: false
                    };
                }
                return null;
            }).filter(def => def !== null);

            const table = $('#example').DataTable({
                "order": [
                    [0, "desc"], // First column in descending order
                    [1, "desc"] // Second column in descending order
                ],
                "responsive": false, // Disable responsive functionality
                columnDefs: columnDefs,
                "pageLength": 25, // Set default number of entries shown to 50
                "lengthMenu": [10, 25, 50, 100], // Add items per page selector
                "fixedHeader": true, // Enable fixed header
                "select": {
                    "style": "multi" // Enable multiple row selection
                },
                "dom": '<"top"fBl>rt<"bottom"ip><"clear">', // Add lengthMenu, buttons, and other elements
                "buttons": [{
                    text: 'Create label',
                    action: function(e, dt, node, config) {
                        $('#myModal').css('display', 'block');
                        updateCustomContent();
                    }
                }]
            });

            let selectedRowOrder = [];

            // Track the order of selected rows
            table.on('select', function(e, dt, type, indexes) {
                indexes.forEach(index => {
                    selectedRowOrder.push(index);
                });
            });

            table.on('deselect', function(e, dt, type, indexes) {
                indexes.forEach(index => {
                    selectedRowOrder = selectedRowOrder.filter(i => i !== index);
                });
            });

            // Add checkboxes for each column in the "Custom" tab
            headers.forEach((header, index) => {
                const isChecked = ['Date', 'Substrate name', 'Material name', 'Substrate T, C', 'DC Power max, %', 'Calibrated Rate, A/s'].includes(header) ? 'checked' : '';
                $('#customCheckboxes').append(`
                    <div>
                        <input type="checkbox" id="checkbox${index}" name="checkbox${index}" value="${header}" ${isChecked}>
                        <label for="checkbox${index}">${header}</label>
                    </div>
                `);
            });

            // Add event listeners for checkboxes
            $('input[type="checkbox"]').on('change', function() {
                updateCustomContent();
            });

            function updateCustomContent() {
                let customContent = '';

                selectedRowOrder.forEach(index => {
                    const row = table.row(index).data();
                    customContent += `<div class="process">`;
                    $('input[type="checkbox"]:checked').each(function() {
                        const columnName = $(this).val();
                        const columnValue = row[headers.indexOf(columnName)];
                        customContent += `<p><b>${columnName}:</b> ${columnValue}</p>`;
                    });
                    customContent += `<textarea class="customNotes" placeholder="Add notes here..." rows="4"></textarea></div>`;
                });

                $('#customContent').html(customContent);
            }

            // Close the modal when the user clicks on <span> (x)
            $('.close').on('click', function() {
                $('#myModal').css('display', 'none');
            });

            // Close the modal when the user clicks anywhere outside of the modal
            $(window).on('click', function(event) {
                if (event.target.id === 'myModal') {
                    $('#myModal').css('display', 'none');
                }
            });

            // Print button functionality using html2canvas
            $('#printButton').on('click', function() {
                // Convert textarea text to div and hide textarea for those that have text
                $('#label .customNotes').each(function() {
                    if ($(this).val().trim() !== '') {
                        const text = $(this).val();
                        let addNoteLabel = '';
                        if (selectedRowOrder.length > 0) {
                            addNoteLabel = '<b>Note:</b> ';
                        }
                        const div = $('<div>').html(addNoteLabel + text).css({
                            'white-space': 'pre-wrap',
                            'overflow': 'hidden',
                            'border': 'none',
                            'padding': '0',
                            'font-family': 'Time',
                            'font-size': '12px',
                            'width': $(this).width(),
                            //'min-height': $(this).height()
                        });
                        $(this).after(div).hide();
                    } else {
                        // Hide empty textareas
                        $(this).css('display', 'none');
                    }
                });
                // Remove border before printing
                $('#label').css('border', 'none')

                // Generate image and print. Scale it x10 with html2canvas to increse the resolotion and scale back using css to keep correct dimensions - Might not be needed, depending on printer
                html2canvas(document.querySelector("#label"), {
                    scale: 10
                }).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write('<img style="transform: scale(0.1);transform-origin: 0 0;" src="' + imgData + '" onload="window.print();window.close() " />');
                    printWindow.document.close();

                    // Remove the created div and show textarea again
                    $('#label .customNotes').each(function() {
                        if ($(this).next('div').length) {
                            $(this).next('div').remove();
                            $(this).show();
                        } else {
                            // Show empty textareas again
                            $(this).css('display', 'block');
                            // Show border again
                            $('#label').css('border', '2px solid black')
                        }
                    });
                });
            });
            // Generate anchor elements for all columns
            headers.forEach((header, index) => {
                const toggleLink = `<a href="#" class="toggle-vis" data-column="${index}">${header}</a>`;
                $('#toggleLinksContainer').append(toggleLink);
            });

            // Add event listeners for dynamically generated anchor elements
            document.querySelectorAll('a.toggle-vis').forEach((el) => {
                el.addEventListener('click', function(e) {
                    e.preventDefault();

                    let columnIdx = e.target.getAttribute('data-column');
                    let column = table.column(columnIdx);

                    // Toggle the visibility
                    column.visible(!column.visible());
                });
            });
        })
        .catch(error => console.error('Error fetching data:', error));
});