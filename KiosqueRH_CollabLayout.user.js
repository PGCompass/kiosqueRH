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
    const rows = Array.from(colonneDiv.querySelectorAll('td.ProdTitreLigne'));

    // On cherche l'index de la ligne "Total Salariés" pour s'aligner
    let targetRowIndex = -1;
    rows.forEach((row, index) => {
      if (row && row.textContent.trim() === "Total Salariés") {
        targetRowIndex = index;
      }
    });

    // On renomme 3 libellés (en supposant la structure courante)
    if (rows.length >= 3) {
      const firstTdPenultimate2 = rows[targetRowIndex]; // placé sur "Total Salariés"
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

    // On récupère les lignes cibles dans le bloc de droite (mêmes positions)
    const lastDiv = colonneDiv.nextElementSibling;
    const rowsLastDiv = Array.from(lastDiv.querySelectorAll('tr'));
    const penultimate2Row = rowsLastDiv[targetRowIndex + 5]; // alignement empirique
    const penultimate1Row = lastDiv.querySelector('tr:nth-last-of-type(2)');
    const lastRow = lastDiv.querySelector('tr:last-of-type');

    // Table support pour lire "couverts" (champ input) et colorer en rouge si 0
    const tablesProd = document.querySelectorAll('.ProdTable');
    const lastTableProd = tablesProd[tablesProd.length - 1];

    // Lit un input numérique (remplace la virgule par un point)
    const getNumericInputValue = (row, column) => parseFloat(
      lastTableProd.querySelectorAll('tr')[row]
        .querySelectorAll('td')[column]
        .querySelector('input')?.value.trim().replace(',', '.') || 0
    );

    if (!penultimate1Row || !lastRow) {
      console.error('Les lignes spécifiées ne sont pas trouvées dans les divs');
      return;
    }

    // Écrit un objet { jourIndex: compteur } dans les cellules d'une ligne
    const writeDataInRow = (row, data) => {
      const cells = row.querySelectorAll('td.ProdNBH');
      const cells_tot = row.querySelectorAll('td.ProdNBHTot');

      // Vide la cellule total (colonne de gauche)
      cells_tot[0].textContent = "";

      let index = 0;

      // Si data vide → vide toutes les cellules de la ligne
      if (!data || Object.keys(data).length === 0) {
        cells.forEach(cell => {
          cell.textContent = "";
          cell.style.textAlign = "center";
          cell.style.fontWeight = "bold";
        });
        return;
      }

      // Sinon, on remplit cellule par cellule
      for (const key in data) {
        if (index < cells.length) {
          // couverts = valeur saisie en face (ligne 0, colonne jour+1)
          const couverts = getNumericInputValue(0, index + 1);

          cells[index].textContent = data[key] === 0 ? "" : data[key];
          cells[index].style.textAlign = "center";
          cells[index].style.fontWeight = "bold";

          // Mise en évidence si couverts==0 mais présence de personnel
          if (couverts == 0 && data[key] > 0) {
            cells[index].style.backgroundColor = '#FF0000';
          }
          index++;
        } else {
          break;
        }
      }
    };

    // Ecrit les compteurs par groupe (indices 1,3,4) sur 3 lignes cibles
    writeDataInRow(penultimate2Row, data[1] || {}); // Cuisiniers
    writeDataInRow(penultimate1Row, data[3] || {}); // EDR
    writeDataInRow(lastRow,      data[4] || {});    // Plongeurs
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
