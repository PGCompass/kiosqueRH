// ==UserScript==
// @name         KiosqueRH - Mise en page collaborateurs
// @version      3.60
// @description  Reorder <tr> elements in the ProdTable within the 'colonne' div based on a predefined list of priorities
// @author       Pierre GARDIE - Compass Group France
// @match        https://hr-services.fr.adp.com/*
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_CollabLayout.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_CollabLayout.user.js
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // --- LISTE DES PRIORITÉS PAR RÔLES -----------------------------------------
  // Chaque sous-tableau = un groupe (index 0,1,2,...). L'ordre détermine le tri.
  // NB: la correspondance est une égalité stricte via .includes(role) dans sortAndGroupRows.
  const priorities = [
    ["DIR RESTAU", "GERANT(E)", "CHEF GERAN", "RESP PT VE", "MAITRE D'H", "ADJ RESP R", "GERANT ADJ", "APP MAN RE", "RESP POINT", "ASS ADMINI", "APP MARKET"],
    ["CHEF DE CU", "SECOND CUI", "CUISINIER", "CHEF DE PA", "COMMIS CUI", "CHEF EXECU", "APP CUISI", "CHEF CUISI", "CHEF PRODU", "AIDE DE CU"],
    ["CHEF PATIS", "PATISSIER(", "COMMIS PAT"],
    ["EMPL POLY", "EMP REST C", "EMPL RESTA", "EMPL DE RE","EMP QUALIF", "CAISSIER (", "EMP TECH R", "RESP PREPA","CHEF DE GR", "CAISSIER R", "EMPLOYE SE", "EMP TECH S", "EMP POLY R"],
    ["PLONGEUR(E", "MAGASINIER", "PLONGEUR B", "AGENT ENTR", "PLONGEUR M", "PLONG AIDE", "AIDE MAGAS", "CHEF PLONG"],
    ["HOTE(SSE)"],
    ["TEST", "TEST2"]
  ];

  // --- FORÇAGE D'ATTRIBUTION PAR NOM -----------------------------------------
  // Assigne certains salariés à un groupe précis (index du tableau priorities).
  // ⚠️ Dépendance forte à l'orthographe/majuscules des noms affichés.
  const Role_employees = {
    // CUISINIER
    "SIBON FRANCK": 1,
    "APPOLON BEATRIC": 1,
    // EDR
    "BANVAR CEDRIQU": 3,
    "DJAFFRI FARIDA": 3,
    "HARDION AGNES O": 3,
    "IMAM FATIHA": 3,
    "ROUSSY SABINE": 3,
    // PLONGEUR
    "KANE YAYA": 4
  };

  // --- RÉCUPÈRE LES LIGNES DU TABLEAU PRINCIPAL ------------------------------
  // sliceFrom = 26 : on saute les lignes d'en-tête/infos avant les collaborateurs.
  // ⚠️ Fragile si la structure HTML ADP change.
  function getRowsFromContainer(containerId, sliceFrom = 0) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const table = container.querySelector('table.ProdTable');
    if (!table) return [];
    return Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr')).slice(sliceFrom);
  }

  // --- RÉCUPÈRE LES LIGNES DU 2e TABLEAU (à droite) --------------------------
  // sliceFrom = 24 : idem, on saute l'entête présumée.
  function getSecondDivRows(sliceFrom = 0) {
    const colonneDiv = document.getElementById('colonne');
    if (!colonneDiv) return [];
    const nextDiv = colonneDiv.nextElementSibling;
    if (!nextDiv) return [];
    return Array.from(nextDiv.getElementsByTagName('tr')).slice(sliceFrom);
  }

  // --- ÉCRITURE DES COMPTEURS EN BAS DE TABLE --------------------------------
  // Affiche "Nombre de cuisinier / d'EDR / de plongeur" et remplit les cellules
  // avec des totaux par jour (données issues de hoursTable).
    function writeDataToRows(data) {
        const colonneDiv = document.getElementById('colonne');
        if (!colonneDiv) return;

        const leftRows = Array.from(colonneDiv.querySelectorAll('td.ProdTitreLigne'));

        // --- TROUVE LES LIGNES REPÈRES ---
        const indexCuis   = leftRows.findIndex(r => r.textContent.trim() === "Total Salariés");
        const indexEDR    = leftRows.findIndex(r => r.textContent.trim() === "Total Intérimaires");
        const indexPlong  = leftRows.findIndex(r => r.textContent.trim() === "Total");

        if (indexCuis < 0 || indexEDR < 0 || indexPlong < 0) {
            console.error("Impossible de trouver toutes les lignes repères pour les compteurs");
            return;
        }

        // --- RENOMMAGE DES LIGNES ---
        leftRows[indexCuis].textContent  = "Nombre de cuisinier";
        leftRows[indexEDR].textContent   = "Nombre d'EDR";
        leftRows[indexPlong].textContent = "Nombre de plongeur";

        [indexCuis, indexEDR, indexPlong].forEach(i => {
            leftRows[i].style.textAlign = 'right';
            leftRows[i].style.fontWeight = 'bold';
        });

        // --- COLONNE DE DROITE ---
        const lastDiv = colonneDiv.nextElementSibling;
        if (!lastDiv) return;
        const rightRows = Array.from(lastDiv.querySelectorAll('tr'));
        const rightTable = document.querySelectorAll('.ProdTable');
        const lastTableProd = rightTable[rightTable.length - 1];

        // --- TROUVE LA LIGNE DROITE LA PLUS PROCHE DE CHAQUE REPÈRE ---
        function findCorrespondingRightRow(leftRow) {
            const leftTop = leftRow.getBoundingClientRect().top;
            let closest = null;
            let minDistance = Infinity;
            rightRows.forEach(r => {
                const top = r.getBoundingClientRect().top;
                const distance = Math.abs(top - leftTop);
                if (distance < minDistance) {
                    minDistance = distance;
                    closest = r;
                }
            });
            return closest;
        }

        const rowCuis  = findCorrespondingRightRow(leftRows[indexCuis]);
        const rowEDR   = findCorrespondingRightRow(leftRows[indexEDR]);
        const rowPlong = findCorrespondingRightRow(leftRows[indexPlong]);

        if (!rowCuis || !rowEDR || !rowPlong) {
            console.error("Impossible de trouver les lignes correspondantes dans le tableau de droite");
            return;
        }

        const getNumericInputValue = (row, col) => {
            const tr = lastTableProd.querySelectorAll('tr')[row] || {};
            const input = tr.querySelectorAll('td')[col]?.querySelector('input');
            return parseFloat(input?.value.trim().replace(',', '.') || 0);
        };

        // --- ÉCRITURE DES COMPTEURS ---
        const writeDataInRow = (row, dataObj, referenceRow = 0) => {
            if (!row) return;
            const cells = row.querySelectorAll('td.ProdNBH');
            const cellsTot = row.querySelectorAll('td.ProdNBHTot');
            if (cellsTot[0]) cellsTot[0].textContent = "";

            if (!dataObj || Object.keys(dataObj).length === 0) {
                cells.forEach(cell => {
                    cell.textContent = "";
                    cell.style.textAlign = "center";
                    cell.style.fontWeight = "bold";
                });
                return;
            }

            let i = 0;
            for (const key in dataObj) {
                if (i >= cells.length) break;
                const couverts = getNumericInputValue(referenceRow, i + 1);
                cells[i].textContent = dataObj[key] === 0 ? "" : dataObj[key];
                cells[i].style.textAlign = "center";
                cells[i].style.fontWeight = "bold";
                if (couverts === 0 && dataObj[key] > 0) {
                    cells[i].style.backgroundColor = '#FF0000';
                }
                i++;
            }
        };

        writeDataInRow(rowCuis,  data[1] || {}, 0);
        writeDataInRow(rowEDR,   data[3] || {}, 0);
        writeDataInRow(rowPlong, data[4] || {}, 0);
    }



  // --- TABLEAU DES COMPTEURS PAR JOUR ----------------------------------------
  // hoursTable[groupeIndex][jourIndex] = nombre de salariés avec >0h ce jour-là
  const hoursTable = [];

  // Ajoute +1 si la case jour contient un nombre >0 (on compte des têtes, pas des heures)
  function addHours(qualificationId, htmlContent) {
    if (!(htmlContent instanceof HTMLElement)) {
      console.error('htmlContent doit être un élément DOM');
      return;
    }
    const allDays = htmlContent.querySelectorAll('td');
    const days = Array.from(allDays).slice(1, -1); // ignore 1ère et dernière colonne

    days.forEach((day, index) => {
      const hours = parseFloat(day.textContent.trim().replace(',', '.'));
      if (isNaN(hours)) return;

      if (!hoursTable[qualificationId]) hoursTable[qualificationId] = {};
      if (!hoursTable[qualificationId][index]) hoursTable[qualificationId][index] = 0;

      if (hours > 0) hoursTable[qualificationId][index] += 1; // on incrémente le compteur
    });
  }

  // Ligne vide (séparateur visuel entre groupes)
  function createEmptyRow() {
    const emptyRow = document.createElement('tr');
    emptyRow.style.height = '12px';
    emptyRow.style.border = '1px solid transparent';
    return emptyRow;
  }

  // --- TRI + GROUPEMENT ------------------------------------------------------
  // rows  = lignes du tableau gauche (identité/rôle)
  // rows2 = lignes miroir du tableau droit (heures)
  function sortAndGroupRows(rows, rows2) {
    const sortedRows  = Array(priorities.length).fill().map(() => []);
    const otherRows   = [];
    const sortedRows2 = Array(priorities.length).fill().map(() => []);
    const otherRows2  = [];
    const inactiveRows  = [];
    const inactiveRows2 = [];

    rows.forEach((row, i) => {
      const roleElement = row.querySelector('.PRODFonc');
      const role = roleElement ? roleElement.innerText.trim() : null;

      const nameElement = row.querySelector('.PRODNomPre');
      const name = nameElement ? nameElement.innerText.trim() : null;

      const totalHoursCell = rows2[i].querySelector('td.ProdNBHTot');
      const totalHours = totalHoursCell ? parseFloat(totalHoursCell.textContent.trim().replace(',', '.')) : null;

      // Si total <= 0 → on classe en "inactifs" (fin du tableau)
      if (totalHours !== null && totalHours <= 0) {
        inactiveRows.push(row);
        inactiveRows2.push(rows2[i]);
        return;
      }

      let isSorted = false;

      // Priorité : affectation par NOM exact si présent dans Role_employees
      if (name && Role_employees.hasOwnProperty(name)) {
        const specificGroupIndex = Role_employees[name];
        sortedRows[specificGroupIndex].push(row);
        sortedRows2[specificGroupIndex].push(rows2[i]);

        // On alimente les compteurs pour certains groupes seulement (1,3,4)
        if ([1, 3, 4].includes(specificGroupIndex)) addHours(specificGroupIndex, rows2[i]);
        isSorted = true;
      } else {
        // Sinon, affectation par correspondance stricte du rôle dans priorities
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

    // Écrit les 3 lignes de totaux (cuisiniers/EDR/plongeurs)
    writeDataToRows(hoursTable);

    // Aplatissement + insertion de lignes vides entre groupes
    const flatSortedRows  = sortedRows .flatMap(groupRows  => groupRows.length  ? [...groupRows,  createEmptyRow()] : []);
    const flatSortedRows2 = sortedRows2.flatMap(groupRows2 => groupRows2.length ? [...groupRows2, createEmptyRow()] : []);

    const spacerRow = document.createElement('tr');
    spacerRow.style.height = '30px';

    return {
      // Ordre final : groupes triés + autres + espace + inactifs
      sortedRows:  flatSortedRows .concat(otherRows ).concat([spacerRow]).concat(inactiveRows),
      sortedRows2: flatSortedRows2.concat(otherRows2).concat([spacerRow.cloneNode()]).concat(inactiveRows2)
    };
  }

  // Insère une liste de <tr> à la fin d'une table/tbody
  function insertRowsIntoTable(rows, table) {
    if (!table) return;
    rows.forEach(row => table.appendChild(row));
  }

  // --- MAIN : récupération, tri, réinjection --------------------------------
  const colonneRows  = getRowsFromContainer('colonne', 26); // ⚠️ index fixe
  const colonneRows2 = getSecondDivRows(24);                 // ⚠️ index fixe

  if (colonneRows.length > 0 && colonneRows2.length > 0) {
    const { sortedRows, sortedRows2 } = sortAndGroupRows(colonneRows, colonneRows2);

    const mainTableBody = document.querySelector('div#colonne table.ProdTable tbody')
                         || document.querySelector('div#colonne table.ProdTable');
    const secondTable = document.querySelector('div#colonne').nextElementSibling.querySelector('table');

    insertRowsIntoTable(sortedRows,  mainTableBody);
    insertRowsIntoTable(sortedRows2, secondTable);
  }

  // --- MASQUAGE DE LA DERNIÈRE COLONNE --------------------------------------
  // Cache systématiquement le dernier <td> de chaque ligne (gauche et droite).
  function hideLastTdInRows(container) {
    const rows = container.querySelectorAll('tr');
    rows.forEach(row => {
      const lastTd = row.querySelector('td:last-child');
      if (lastTd) {
        lastTd.style.display = 'none';
      }
    });
  }

  const secondDiv  = document.getElementById('ligne');
  const colonneDiv = document.getElementById('colonne');
  const lastDiv    = colonneDiv.nextElementSibling;

  hideLastTdInRows(secondDiv);
  hideLastTdInRows(lastDiv);

})();
