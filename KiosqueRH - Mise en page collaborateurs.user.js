// ==UserScript==
// @name         KiosqueRH - Mise en page collaborateurs
// @namespace    http://tampermonkey.net/
// @version      2.3
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
        ["DIR RESTAU", "GERANT(E)", "CHEF GERAN", "RESP PT VE", "MAITRE D'H"],
        ["CHEF DE CU", "SECOND CUI", "CUISINIER", "CHEF DE PA", "COMMIS CUI", "CHEF EXECU"],
        ["CHEF PATIS", "PATISSIER("],
        ["EMPL POLY", "EMP REST C", "EMPL RESTA", "EMPL DE RE","EMP QUALIF", "CAISSIER (", "EMP TECH R", "RESP PREPA"],
        ["PLONGEUR(E", "MAGASINIER", "PLONGEUR B"],
        ["TEST", "TEST2"]
    ];

    // Fonction pour obtenir les lignes <tr> de premier niveau à partir du div avec l'id 'colonne'
    function getTopLevelRows() {
        const colonneDiv = document.getElementById('colonne');
        if (!colonneDiv) return [];

        const table = colonneDiv.querySelector('table.ProdTable');
        if (!table) return [];

        // Sélectionner uniquement les <tr> de premier niveau
        return Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr')).slice(15);
    }

    function sortSecondDiv() {
        const colonneDiv = document.getElementById('colonne');
        if (!colonneDiv) return [];

        const lastDiv = colonneDiv.nextElementSibling;
        if (!lastDiv) return [];

        return Array.from(lastDiv.getElementsByTagName('tr')).slice(14);
    }

    // Fonction pour classer les lignes <tr> selon la liste des priorités
    function sortRows(rows, rows2) {
        let sortedRows = [];
        let otherRows = [];
        let sortedRows2 = [];
        let otherRows2 = [];

        rows.forEach((row, i) => {
            const roleElement = row.querySelector('.PRODFonc');
            if (roleElement) {
                const role = roleElement.innerText.trim();
                let isSorted = false;
                priorities.forEach((group, index) => {
                    if (group.includes(role)) {
                        if (!sortedRows[index]) sortedRows[index] = [];
                        if (!sortedRows2[index]) sortedRows2[index] = [];
                        sortedRows[index].push(row);
                        sortedRows2[index].push(rows2[i]);
                        isSorted = true;
                    }
                });
                if (!isSorted) {
                    otherRows.push(row);
                    otherRows2.push(rows2[i]);
                }
            } else {
                otherRows.push(row);
                otherRows2.push(rows2[i]);
            }
        });

        // Créer des lignes vides avec une hauteur spécifique pour les rendre visibles
        const flatSortedRows = sortedRows.flatMap(groupRows => groupRows ? [...groupRows, createEmptyRow()] : []);
        const flatSortedRows2 = sortedRows2.flatMap(groupRows2 => groupRows2 ? [...groupRows2, createEmptyRow()] : []);

        return {
            sortedRows: flatSortedRows.concat(otherRows),
            sortedRows2: flatSortedRows2.concat(otherRows2)
        };
    }

    // Fonction pour créer une ligne vide
    function createEmptyRow() {
        const emptyRow = document.createElement('tr');
        emptyRow.style.height = '12px'; // Ajuster la hauteur si nécessaire
        emptyRow.style.border = '1px solid transparent'; // Style pour voir la ligne vide
        return emptyRow;
    }

    // Fonction pour réinsérer les lignes classées
    function insertSortedRows(sortedRows, container) {
        if (!container) return;

        sortedRows.forEach(row => container.appendChild(row));
    }

    // Exécution du script
    const colonneRows = getTopLevelRows();
    const colonneRows2 = sortSecondDiv();

    if (colonneRows.length > 0 && colonneRows2.length > 0) {
        const { sortedRows, sortedRows2 } = sortRows(colonneRows, colonneRows2);

        // Sélectionner les tables de destination
        const table = document.querySelector('div#colonne table.ProdTable tbody') || document.querySelector('div#colonne table.ProdTable');
        const lastDivTable = document.querySelector('div#colonne').nextElementSibling.querySelector('table');

        // Réinsérer les lignes triées dans les tables appropriées
        insertSortedRows(sortedRows, table);
        insertSortedRows(sortedRows2, lastDivTable);
    }
})();
