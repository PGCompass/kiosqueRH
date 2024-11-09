// ==UserScript==
// @name         KiosqueRH - Mise en page collaborateurs
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Reorder <tr> elements in the ProdTable within the 'colonne' div based on a predefined list of priorities
// @author       Pierre GARDIE CGF
// @match        https://hr-services.fr.adp.com/*
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_CollabLayout.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_CollabLayout.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Liste des priorités par rôles
    const priorities = [
        ["DIR RESTAU", "GERANT(E)", "CHEF GERAN", "RESP PT VE", "MAITRE D'H", "ADJ RESP R"],
        ["CHEF DE CU", "SECOND CUI", "CUISINIER", "CHEF DE PA", "COMMIS CUI", "CHEF EXECU"],
        ["CHEF PATIS", "PATISSIER("],
        ["EMPL POLY", "EMP REST C", "EMPL RESTA", "EMPL DE RE","EMP QUALIF", "CAISSIER (", "EMP TECH R", "RESP PREPA","CHEF DE GR"],
        ["PLONGEUR(E", "MAGASINIER", "PLONGEUR B", "AGENT ENTR"],
        ["TEST", "TEST2"]
    ];

    // Fonction pour obtenir les lignes <tr> de premier niveau à partir d'un div avec un ID donné
    function getRowsFromContainer(containerId, sliceFrom = 0) {
        const container = document.getElementById(containerId);
        if (!container) return [];

        const table = container.querySelector('table.ProdTable');
        if (!table) return [];

        return Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr')).slice(sliceFrom);
    }

    // Fonction pour obtenir les lignes <tr> du deuxième div adjacent au div 'colonne'
    function getSecondDivRows(sliceFrom = 0) {
        const colonneDiv = document.getElementById('colonne');
        if (!colonneDiv) return [];

        const nextDiv = colonneDiv.nextElementSibling;
        if (!nextDiv) return [];

        return Array.from(nextDiv.getElementsByTagName('tr')).slice(sliceFrom);
    }

    // Fonction pour écrire les données dans les trois dernières lignes du tableau
    function writeDataToRows(data) {
        const colonneDiv = document.getElementById('colonne');
        const rows = Array.from(colonneDiv.querySelectorAll('td.ProdTitreLigne'));

        // Trouver la ligne qui contient un <td> avec le texte "Total Salariés"
        let targetRowIndex = -1;
        rows.forEach((row, index) => {
            if (row && row.textContent.trim() === "Total Salariés") {
                targetRowIndex = index;
                console.log(targetRowIndex);
            }
        });

        // Vérifie qu'il y a au moins trois lignes dans le tableau
        if (rows.length >= 3) {
            // Avant-avant-dernier <tr>
            const firstTdPenultimate2 = rows[targetRowIndex];
            if (firstTdPenultimate2) {
                firstTdPenultimate2.textContent = "Nombre de cuisinier";
                firstTdPenultimate2.style.textAlign = 'right';
                firstTdPenultimate2.style.fontWeight = 'bold';
            }

            // Avant-dernier <tr>
            const firstTdPenultimate1 = rows[rows.length - 2];
            if (firstTdPenultimate1) {
                firstTdPenultimate1.textContent = "Nombre d'EDR";
                firstTdPenultimate1.style.textAlign = 'right';
                firstTdPenultimate1.style.fontWeight = 'bold';
            }

            // Dernier <tr>
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
        // Récupérer les <tr> spécifiés dans le deuxième div adjacent
        const rowsLastDiv = Array.from(lastDiv.querySelectorAll('tr'));
        const penultimate2Row = rowsLastDiv[targetRowIndex + 1];
        const penultimate1Row = lastDiv.querySelector('tr:nth-last-of-type(2)');
        const lastRow = lastDiv.querySelector('tr:last-of-type');

        if (!penultimate1Row || !lastRow) {
            console.error('Les lignes spécifiées ne sont pas trouvées dans les divs');
            return;
        }

        // Fonction pour écrire les données dans une ligne donnée
        const writeDataInRow = (row, data) => {
            const cells = row.querySelectorAll('td.ProdNBH');
            const cells_tot = row.querySelectorAll('td.ProdNBHTot');
            cells_tot[0].textContent = "";

            let index = 0;
            for (const key in data) {
                if (index < cells.length) {
                    cells[index].textContent = data[key] === 0 ? "" : data[key];
                    cells[index].style.textAlign = "center";
                    cells[index].style.fontWeight = "bold";
                    index++;
                } else {
                    break;
                }
            }
        };

        writeDataInRow(penultimate2Row, data[1]);
        writeDataInRow(penultimate1Row, data[3]);
        writeDataInRow(lastRow, data[4]);
    }

    const hoursTable = [];

    // Fonction pour ajouter les heures et afficher le tableau mis à jour
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

    // Fonction pour créer une ligne vide pour espacer les groupes
    function createEmptyRow() {
        const emptyRow = document.createElement('tr');
        emptyRow.style.height = '12px';
        emptyRow.style.border = '1px solid transparent';
        return emptyRow;
    }

    // Fonction pour classer et grouper les lignes <tr> selon la liste des priorités
    function sortAndGroupRows(rows, rows2) {
        const sortedRows = Array(priorities.length).fill().map(() => []);
        const otherRows = [];
        const sortedRows2 = Array(priorities.length).fill().map(() => []);
        const otherRows2 = [];

        rows.forEach((row, i) => {
            const roleElement = row.querySelector('.PRODFonc');
            const role = roleElement ? roleElement.innerText.trim() : null;

            let isSorted = false;
            priorities.forEach((group, index) => {
                if (group.includes(role)) {
                    sortedRows[index].push(row);
                    sortedRows2[index].push(rows2[i]);
                    if ([1, 3, 4].includes(index)) addHours(index, rows2[i]);
                    isSorted = true;
                }
            });

            if (!isSorted) {
                otherRows.push(row);
                otherRows2.push(rows2[i]);
            }
        });

        writeDataToRows(hoursTable); // Ecrire les données dans les 3 derniers TR

        const flatSortedRows = sortedRows.flatMap(groupRows => groupRows.length ? [...groupRows, createEmptyRow()] : []);
        const flatSortedRows2 = sortedRows2.flatMap(groupRows2 => groupRows2.length ? [...groupRows2, createEmptyRow()] : []);

        return {
            sortedRows: flatSortedRows.concat(otherRows),
            sortedRows2: flatSortedRows2.concat(otherRows2)
        };
    }

    // Fonction pour réinsérer les lignes classées dans un tableau
    function insertRowsIntoTable(rows, table) {
        if (!table) return;
        rows.forEach(row => table.appendChild(row));
    }

    // Exécution du script : récupération des lignes de deux divs et tri/groupement
    const colonneRows = getRowsFromContainer('colonne', 15);
    const colonneRows2 = getSecondDivRows(14);

    if (colonneRows.length > 0 && colonneRows2.length > 0) {
        const { sortedRows, sortedRows2 } = sortAndGroupRows(colonneRows, colonneRows2);

        const mainTableBody = document.querySelector('div#colonne table.ProdTable tbody') || document.querySelector('div#colonne table.ProdTable');
        const secondTable = document.querySelector('div#colonne').nextElementSibling.querySelector('table');

        insertRowsIntoTable(sortedRows, mainTableBody);
        insertRowsIntoTable(sortedRows2, secondTable);
    }

    // Fonction pour masquer le dernier <td> de chaque <tr> dans un élément conteneur donné
    function hideLastTdInRows(container) {
        // Sélectionner tous les <tr> dans le conteneur
        const rows = container.querySelectorAll('tr');

        // Parcourir chaque <tr>
        rows.forEach(row => {
            // Sélectionner le dernier <td> dans le <tr>
            const lastTd = row.querySelector('td:last-child');

            // Si un dernier <td> est trouvé, masquer ce <td>
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
