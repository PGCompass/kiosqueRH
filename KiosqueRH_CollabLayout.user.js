// ==UserScript==
// @name         KiosqueRH - Mise en page collaborateurs
// @version      3.47
// @description  Reorder <tr> elements in the ProdTable within the 'colonne' div based on a predefined list of priorities
// @author       Pierre GARDIE - Compass Group France
// @match        https://hr-services.fr.adp.com/*
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_CollabLayout.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_CollabLayout.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const priorities = [
        ["DIR RESTAU", "GERANT(E)", "CHEF GERAN", "RESP PT VE", "MAITRE D'H", "ADJ RESP R", "GERANT ADJ", "APP MAN RE", "RESP POINT", "ASS ADMINI"],
        ["CHEF DE CU", "SECOND CUI", "CUISINIER", "CHEF DE PA", "COMMIS CUI", "CHEF EXECU", "APP CUISI", "CHEF CUISI", "CHEF PRODU", "AIDE DE CU"],
        ["CHEF PATIS", "PATISSIER(", "COMMIS PAT"],
        ["EMPL POLY", "EMP REST C", "EMPL RESTA", "EMPL DE RE","EMP QUALIF", "CAISSIER (", "EMP TECH R", "RESP PREPA","CHEF DE GR", "CAISSIER R", "EMPLOYE SE", "EMP TECH S", "EMP POLY R"],
        ["PLONGEUR(E", "MAGASINIER", "PLONGEUR B", "AGENT ENTR", "PLONGEUR M", "PLONG AIDE", "AIDE MAGAS", "CHEF PLONG"],
        ["HOTE(SSE)"],
        ["TEST", "TEST2"]
    ];

    const Role_employees = {
        "SIBON FRANCK": 1,
        "APPOLON BEATRIC": 1,
        "BANVAR CEDRIQU": 3,
        "DJAFFRI FARIDA": 3,
        "HARDION AGNES O": 3,
        "IMAM FATIHA": 3,
        "KANE YAYA": 4
    };

    function getRowsFromContainer(containerId, sliceFrom = 0) {
        const container = document.getElementById(containerId);
        if (!container) return [];
        const table = container.querySelector('table.ProdTable');
        if (!table) return [];
        return Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr')).slice(sliceFrom);
    }

    function getSecondDivRows(sliceFrom = 0) {
        const colonneDiv = document.getElementById('colonne');
        if (!colonneDiv) return [];
        const nextDiv = colonneDiv.nextElementSibling;
        if (!nextDiv) return [];
        return Array.from(nextDiv.getElementsByTagName('tr')).slice(sliceFrom);
    }

    function writeDataToRows(data) {
        const colonneDiv = document.getElementById('colonne');
        const allTd = Array.from(colonneDiv.querySelectorAll('td.ProdTitreLigne'));

        // Trouver ou créer les lignes
        let rowCuisinier = allTd.find(td => td.textContent.trim() === "Nombre de cuisinier")?.parentElement;
        let rowEDR       = allTd.find(td => td.textContent.trim() === "Nombre d'EDR")?.parentElement;
        let rowPlongeur  = allTd.find(td => td.textContent.trim() === "Nombre de plongeur")?.parentElement;

        function createRow(label) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.className = "ProdTitreLigne";
            td.textContent = label;
            td.style.textAlign = 'right';
            td.style.fontWeight = 'bold';
            tr.appendChild(td);
            return tr;
        }

        if (!rowCuisinier) rowCuisinier = createRow("Nombre de cuisinier");
        if (!rowEDR)       rowEDR       = createRow("Nombre d'EDR");
        if (!rowPlongeur)  rowPlongeur  = createRow("Nombre de plongeur");

        // Réinsérer dans le bon ordre après "Total Salariés"
        const totalRow = allTd.find(td => td.textContent.trim() === "Total Salariés")?.parentElement;
        if (totalRow) {
            const tbody = totalRow.parentElement;
            tbody.insertBefore(rowCuisinier, totalRow.nextSibling);
            tbody.insertBefore(rowEDR, rowCuisinier.nextSibling);
            tbody.insertBefore(rowPlongeur, rowEDR.nextSibling);
        }

        const lastDiv = colonneDiv.nextElementSibling;
        const rowsLastDiv = Array.from(lastDiv.querySelectorAll('tr'));

        const penultimate2Row = rowCuisinier;
        const penultimate1Row = rowEDR;
        const lastRow         = rowPlongeur;

        const tablesProd = document.querySelectorAll('.ProdTable');
        const lastTableProd = tablesProd[tablesProd.length - 1];

        const getNumericInputValue = (row, column) => parseFloat(
            lastTableProd.querySelectorAll('tr')[row].querySelectorAll('td')[column].querySelector('input')?.value.trim().replace(',', '.') || 0
        );

        const writeDataInRow = (row, dataset) => {
            const cells = row.querySelectorAll('td.ProdNBH');
            const cells_tot = row.querySelectorAll('td.ProdNBHTot');
            if (cells_tot[0]) cells_tot[0].textContent = "";

            if (!dataset || Object.keys(dataset).length === 0) {
                cells.forEach(cell => {
                    cell.textContent = "";
                    cell.style.textAlign = "center";
                    cell.style.fontWeight = "bold";
                });
                return;
            }

            let index = 0;
            for (const key in dataset) {
                if (index < cells.length) {
                    const couverts = getNumericInputValue(0, index + 1);
                    cells[index].textContent = dataset[key] === 0 ? "" : dataset[key];
                    cells[index].style.textAlign = "center";
                    cells[index].style.fontWeight = "bold";
                    if (couverts == 0 && dataset[key] > 0) {
                        cells[index].style.backgroundColor = '#FF0000';
                    }
                    index++;
                }
            }
        };

        writeDataInRow(penultimate2Row, data[1] || {});
        writeDataInRow(penultimate1Row, data[3] || {});
        writeDataInRow(lastRow, data[4] || {});
    }

    const hoursTable = [];

    function addHours(qualificationId, htmlContent) {
        if (!(htmlContent instanceof HTMLElement)) return;
        const days = Array.from(htmlContent.querySelectorAll('td')).slice(1, -1);
        days.forEach((day, index) => {
            const hours = parseFloat(day.textContent.trim().replace(',', '.'));
            if (isNaN(hours)) return;
            if (!hoursTable[qualificationId]) hoursTable[qualificationId] = {};
            if (!hoursTable[qualificationId][index]) hoursTable[qualificationId][index] = 0;
            if (hours > 0) hoursTable[qualificationId][index] += 1;
        });
    }

    function createEmptyRow() {
        const emptyRow = document.createElement('tr');
        emptyRow.style.height = '12px';
        emptyRow.style.border = '1px solid transparent';
        return emptyRow;
    }

    function sortAndGroupRows(rows, rows2) {
        const sortedRows = Array(priorities.length).fill().map(() => []);
        const otherRows = [];
        const sortedRows2 = Array(priorities.length).fill().map(() => []);
        const otherRows2 = [];
        const inactiveRows = [];
        const inactiveRows2 = [];

        rows.forEach((row, i) => {
            const roleElement = row.querySelector('.PRODFonc');
            const role = roleElement ? roleElement.innerText.trim() : null;
            const nameElement = row.querySelector('.PRODNomPre');
            const name = nameElement ? nameElement.innerText.trim() : null;
            const totalHoursCell = rows2[i].querySelector('td.ProdNBHTot');
            const totalHours = totalHoursCell ? parseFloat(totalHoursCell.textContent.trim().replace(',', '.')) : null;

            if (totalHours !== null && totalHours <= 0) {
                inactiveRows.push(row);
                inactiveRows2.push(rows2[i]);
                return;
            }

            let isSorted = false;
            if (name && Role_employees.hasOwnProperty(name)) {
                const specificGroupIndex = Role_employees[name];
                sortedRows[specificGroupIndex].push(row);
                sortedRows2[specificGroupIndex].push(rows2[i]);
                if ([1, 3, 4].includes(specificGroupIndex)) addHours(specificGroupIndex, rows2[i]);
                isSorted = true;
            } else {
                priorities.forEach((group, index) => {
                    if (group.includes(role)) {
                        sortedRows[index].push(row);
                        sortedRows2[index].push(rows2[i]);
                        if ([1, 3, 4].includes(index)) addHours(index, rows2[i]);
                        isSorted = true;
                    }
                });
            }

            if (!isSorted) {
                otherRows.push(row);
                otherRows2.push(rows2[i]);
            }
        });

        writeDataToRows(hoursTable);

        const flatSortedRows = sortedRows.flatMap(groupRows => groupRows.length ? [...groupRows, createEmptyRow()] : []);
        const flatSortedRows2 = sortedRows2.flatMap(groupRows2 => groupRows2.length ? [...groupRows2, createEmptyRow()] : []);

        const spacerRow = document.createElement('tr');
        spacerRow.style.height = '30px';

        return {
            sortedRows: flatSortedRows.concat(otherRows).concat([spacerRow]).concat(inactiveRows),
            sortedRows2: flatSortedRows2.concat(otherRows2).concat([spacerRow.cloneNode()]).concat(inactiveRows2)
        };
    }

    function insertRowsIntoTable(rows, table) {
        if (!table) return;
        rows.forEach(row => table.appendChild(row));
    }

    const colonneRows = getRowsFromContainer('colonne', 26);
    const colonneRows2 = getSecondDivRows(24);

    if (colonneRows.length > 0 && colonneRows2.length > 0) {
        const { sortedRows, sortedRows2 } = sortAndGroupRows(colonneRows, colonneRows2);
        const mainTableBody = document.querySelector('div#colonne table.ProdTable tbody') || document.querySelector('div#colonne table.ProdTable');
        const secondTable = document.querySelector('div#colonne').nextElementSibling.querySelector('table');
        insertRowsIntoTable(sortedRows, mainTableBody);
        insertRowsIntoTable(sortedRows2, secondTable);
    }

    function hideLastTdInRows(container) {
        const rows = container.querySelectorAll('tr');
        rows.forEach(row => {
            const lastTd = row.querySelector('td:last-child');
            if (lastTd) lastTd.style.display = 'none';
        });
    }

    hideLastTdInRows(document.getElementById('ligne'));
    hideLastTdInRows(document.getElementById('colonne').nextElementSibling);

})();
