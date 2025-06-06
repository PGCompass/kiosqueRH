// ==UserScript==
// @name         KiosqueRH - Mise en page collaborateurs
// @version      3.1
// @description  Reorder <tr> elements in the ProdTable within the 'colonne' div based on a predefined list of priorities
// @author       Pierre GARDIE - Compass Group France
// @match        https://hr-services.fr.adp.com/*
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_CollabLayout.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_CollabLayout.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Liste des priorités par rôles
    const priorities = [
        ["DIR RESTAU", "GERANT(E)", "CHEF GERAN", "RESP PT VE", "MAITRE D'H", "ADJ RESP R", "GERANT ADJ", "APP MAN RE", "RESP POINT", "ASS ADMINI"],
        ["CHEF DE CU", "SECOND CUI", "CUISINIER", "CHEF DE PA", "COMMIS CUI", "CHEF EXECU", "APP CUISI"],
        ["CHEF PATIS", "PATISSIER("],
        ["EMPL POLY", "EMP REST C", "EMPL RESTA", "EMPL DE RE","EMP QUALIF", "CAISSIER (", "EMP TECH R", "RESP PREPA","CHEF DE GR", "CAISSIER R", "EMPLOYE SE"],
        ["PLONGEUR(E", "MAGASINIER", "PLONGEUR B", "AGENT ENTR", "PLONGEUR M", "PLONG AIDE", "AIDE MAGAS", "CHEF PLONG"],
        ["HOTE(SSE)"],
        ["TEST", "TEST2"]
    ];

    const Inactive_employees = ["LU JUN", "CISSE AMINATA", "SOW SIMBALA", "BAH ALPHA A", "ID HAISSOU NOUZHA", "DEREVIANKI EMILIE", "MEGUERDITC JEAN MA", "DREAN FLORENC", "COMMAILLE ELODIE", "AMGHAR SABIHA", "DUCLOS LOIC", "CABY ANGELIQ", "ABE TEWABEC", "HAMZA MAKRAM","MBEMBA JEANNET"];

    // Liste de rôles spécifiques avec leur groupe d'attribution
    const Role_employees = {
        // CUISINIER
        "SIBON FRANCK": 1,
        "APPOLON BEATRIC": 1,
        // EDR
        "BANVAR CEDRIQU": 3,
        "DJAFFRI FARIDA": 3,
        "HARDION AGNES O": 3,
        "IMAM FATIHA": 3,
        // PLONGEUR
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
        const rows = Array.from(colonneDiv.querySelectorAll('td.ProdTitreLigne'));

        let targetRowIndex = -1;
        rows.forEach((row, index) => {
            if (row && row.textContent.trim() === "Total Salariés") {
                targetRowIndex = index;
            }
        });

        if (rows.length >= 3) {
            const firstTdPenultimate2 = rows[targetRowIndex];
            if (firstTdPenultimate2) {
                firstTdPenultimate2.textContent = "Nombre de cuisinier";
                firstTdPenultimate2.style.textAlign = 'right';
                firstTdPenultimate2.style.fontWeight = 'bold';
            }

            const firstTdPenultimate1 = rows[rows.length - 2];
            if (firstTdPenultimate1) {
                firstTdPenultimate1.textContent = "Nombre d'EDR";
                firstTdPenultimate1.style.textAlign = 'right';
                firstTdPenultimate1.style.fontWeight = 'bold';
            }

            const firstTdLast = rows[rows.length - 1];
            if (firstTdLast) {
                firstTdLast.textContent = "Nombre de plongeur";
                firstTdLast.style.textAlign = 'right';
                firstTdLast.style.fontWeight = 'bold';
            }
        } else {
            console.error('Il n\'y a pas assez de <tr> dans colonneDiv');
        }

        const lastDiv = colonneDiv.nextElementSibling;
        const rowsLastDiv = Array.from(lastDiv.querySelectorAll('tr'));
        const penultimate2Row = rowsLastDiv[targetRowIndex + 5];
        const penultimate1Row = lastDiv.querySelector('tr:nth-last-of-type(2)');
        const lastRow = lastDiv.querySelector('tr:last-of-type');

        const tablesProd = document.querySelectorAll('.ProdTable');
        const lastTableProd = tablesProd[tablesProd.length - 1];
        const getNumericInputValue = (row, column) => parseFloat(
            lastTableProd.querySelectorAll('tr')[row].querySelectorAll('td')[column].querySelector('input')?.value.trim().replace(',', '.') || 0
        );


        if (!penultimate1Row || !lastRow) {
            console.error('Les lignes spécifiées ne sont pas trouvées dans les divs');
            return;
        }

        const writeDataInRow = (row, data) => {
            const cells = row.querySelectorAll('td.ProdNBH');
            const cells_tot = row.querySelectorAll('td.ProdNBHTot');
            cells_tot[0].textContent = "";

            let index = 0;
            // Si 'data' est vide ou mal défini, on met "" dans toutes les cellules
            if (!data || Object.keys(data).length === 0) {
                // Si 'data' est vide, mettre "" dans toutes les cellules
                cells.forEach(cell => {
                    cell.textContent = "";
                    cell.style.textAlign = "center";
                    cell.style.fontWeight = "bold";
                });
                return;
            }

            // Si 'data' est valide, on écrit les valeurs dans les cellules
            for (const key in data) {
                if (index < cells.length) {
                    const couverts = getNumericInputValue(0, index + 1);
                    cells[index].textContent = data[key] === 0 ? "" : data[key];
                    cells[index].style.textAlign = "center";
                    cells[index].style.fontWeight = "bold";
                    if (couverts == 0 && data[key] > 0) {cells[index].style.backgroundColor = '#FF0000'};
                    index++;
                } else {
                    break;
                }
            }
        };

        // Si 'data' est vide ou mal défini, on applique "" dans les lignes correspondantes
        writeDataInRow(penultimate2Row, data[1] || {});
        writeDataInRow(penultimate1Row, data[3] || {});
        writeDataInRow(lastRow, data[4] || {});
    }

    const hoursTable = [];

    function addHours(qualificationId, htmlContent) {
        if (!(htmlContent instanceof HTMLElement)) {
            console.error('htmlContent doit être un élément DOM');
            return;
        }

        const allDays = htmlContent.querySelectorAll('td');
        const days = Array.from(allDays).slice(1, -1);

        days.forEach((day, index) => {
            const hours = parseFloat(day.textContent.trim().replace(',', '.'));
            if (isNaN(hours)) {
                console.warn(`Heures invalides pour l'élément à l'index ${index}: "${day.textContent}"`);
                return;
            }

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

            if (name && Inactive_employees.includes(name)) {
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
            if (lastTd) {
                lastTd.style.display = 'none';
            }
        });
    }

    const secondDiv = document.getElementById('ligne');
    const colonneDiv = document.getElementById('colonne');
    const lastDiv = colonneDiv.nextElementSibling;
    hideLastTdInRows(secondDiv);
    hideLastTdInRows(lastDiv);

})();
