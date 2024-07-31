// ==UserScript==
// @name         KiosqueRH - Mise en page collaborateurs
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Reorder <tr> elements in the ProdTable within the 'colonne' div based on a predefined list of priorities
// @author       Pierre GARDIE CGF
// @match        https://hr-services.fr.adp.com/*
// @updateURL    https://github.com/PGCompass/Script/raw/main/KiosqueRH%20-%20Mise%20en%20page%20collaborateurs.user.js
// @downloadURL  https://github.com/PGCompass/Script/raw/main/KiosqueRH%20-%20Mise%20en%20page%20collaborateurs.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Liste des priorités
    const priorities = [
        ["DIR RESTAU", "GERANT(E)", "CHEF GERAN", "RESP PT VE", "MAITRE D'H", "ADJ RESP R"],
        ["CHEF DE CU", "SECOND CUI", "CUISINIER", "CHEF DE PA", "COMMIS CUI", "CHEF EXECU"],
        ["CHEF PATIS", "PATISSIER("],
        ["EMPL POLY", "EMP REST C", "EMPL RESTA", "EMPL DE RE","EMP QUALIF", "CAISSIER (", "EMP TECH R", "RESP PREPA"],
        ["PLONGEUR(E", "MAGASINIER", "PLONGEUR B"],
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

    // Tableau global pour stocker les données accumulées des heures
    const hoursTable = [];

    // Fonction pour ajouter les heures et afficher le tableau mis à jour
    function addHours(qualificationId, htmlContent) {
        // Vérifier que htmlContent est un élément DOM
        if (!(htmlContent instanceof HTMLElement)) {
            console.error('htmlContent doit être un élément DOM');
            return;
        }

        // Trouver tous les éléments td
        const allDays = htmlContent.querySelectorAll('td');
        const days = Array.from(allDays).slice(1, -1); // Exclure le premier et le dernier élément td

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

        console.log(hoursTable); // Afficher le tableau mis à jour dans la console
    }

    // Fonction pour créer une ligne vide
    function createEmptyRow() {
        const emptyRow = document.createElement('tr');
        emptyRow.style.height = '12px';
        emptyRow.style.border = '1px solid transparent';
        return emptyRow;
    }

    // Fonction pour classer les lignes <tr> selon la liste des priorités
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

    // Exécution du script
    const colonneRows = getRowsFromContainer('colonne', 15);
    const colonneRows2 = getSecondDivRows(14);

    if (colonneRows.length > 0 && colonneRows2.length > 0) {
        const { sortedRows, sortedRows2 } = sortAndGroupRows(colonneRows, colonneRows2);

        const mainTableBody = document.querySelector('div#colonne table.ProdTable tbody') || document.querySelector('div#colonne table.ProdTable');
        const secondTable = document.querySelector('div#colonne').nextElementSibling.querySelector('table');

        insertRowsIntoTable(sortedRows, mainTableBody);
        insertRowsIntoTable(sortedRows2, secondTable);
    }

})();
