// ==UserScript==
// @name         KiosqueRH - Mise en page collaborateurs
// @version      3.49
// @description  Reorder <tr> elements in the ProdTable within the 'colonne' div based on a predefined list of priorities
// @author       Pierre GARDIE - Compass Group France
// @match        https://hr-services.fr.adp.com/*
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_CollabLayout.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_CollabLayout.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // === Sécurité : attendre le DOM ADP ===
  const waitForDom = setInterval(() => {
    const colonneDiv = document.getElementById('colonne');
    const secondDiv = document.getElementById('ligne');
    if (colonneDiv && colonneDiv.nextElementSibling && secondDiv) {
      clearInterval(waitForDom);
      main();
    }
  }, 500);

  // === Fonction principale ===
  function main() {
    // --- LISTE DES PRIORITÉS PAR RÔLES -----------------------------------------
    const priorities = [
      ["DIR RESTAU", "GERANT(E)", "CHEF GERAN", "RESP PT VE", "MAITRE D'H", "ADJ RESP R", "GERANT ADJ", "APP MAN RE", "RESP POINT", "ASS ADMINI", "APP MARKET"],
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
      "ROUSSY SABINE": 3,
      "KANE YAYA": 4
    };

    // --- FONCTIONS UTILITAIRES -------------------------------------------------
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

    function createEmptyRow() {
      const emptyRow = document.createElement('tr');
      emptyRow.style.height = '12px';
      emptyRow.style.border = '1px solid transparent';
      return emptyRow;
    }

    const hoursTable = [];

    function addHours(qualificationId, htmlContent) {
      if (!(htmlContent instanceof HTMLElement)) return;
      const allDays = htmlContent.querySelectorAll('td');
      const days = Array.from(allDays).slice(1, -1);
      days.forEach((day, index) => {
        const hours = parseFloat(day.textContent.trim().replace(',', '.'));
        if (isNaN(hours)) return;
        if (!hoursTable[qualificationId]) hoursTable[qualificationId] = {};
        if (!hoursTable[qualificationId][index]) hoursTable[qualificationId][index] = 0;
        if (hours > 0) hoursTable[qualificationId][index] += 1;
      });
    }

    function writeDataToRows(data) {
      const colonneDiv = document.getElementById('colonne');
      const rows = Array.from(colonneDiv.querySelectorAll('td.ProdTitreLigne'));
      let targetRowIndex = rows.findIndex(r => r.textContent.trim() === "Total Salariés");

      if (rows.length >= 3) {
        const rename = (el, txt) => {
          if (!el) return;
          el.textContent = txt;
          el.style.textAlign = 'right';
          el.style.fontWeight = 'bold';
        };
          rename(rows[targetRowIndex], "Nombre de cuisinier");
          rename(rows[rows.length - 2], "Nombre d'EDR");
          rename(rows[rows.length - 1], "Nombre de plongeur");

      }

      const lastDiv = colonneDiv.nextElementSibling;
      if (!lastDiv) return;
      const rowsLastDiv = Array.from(lastDiv.querySelectorAll('tr'));
      const penultimate2Row = rowsLastDiv[targetRowIndex + 5];
      const penultimate1Row = lastDiv.querySelector('tr:nth-last-of-type(2)');
      const lastRow = lastDiv.querySelector('tr:last-of-type');
      const tablesProd = document.querySelectorAll('.ProdTable');
      const lastTableProd = tablesProd[tablesProd.length - 1];

      const getNumericInputValue = (row, column) =>
        parseFloat(lastTableProd.querySelectorAll('tr')[row]
          ?.querySelectorAll('td')[column]
          ?.querySelector('input')?.value.trim().replace(',', '.') || 0);

      const writeDataInRow = (row, data) => {
        if (!row) return;
        const cells = row.querySelectorAll('td.ProdNBH');
        const cells_tot = row.querySelectorAll('td.ProdNBHTot');
        if (cells_tot[0]) cells_tot[0].textContent = "";
        let index = 0;
        for (const key in data) {
          if (index >= cells.length) break;
          const couverts = getNumericInputValue(0, index + 1);
          const cell = cells[index];
          cell.textContent = data[key] === 0 ? "" : data[key];
          cell.style.textAlign = "center";
          cell.style.fontWeight = "bold";
          if (couverts == 0 && data[key] > 0) cell.style.backgroundColor = '#FF0000';
          index++;
        }
      };

      writeDataInRow(penultimate2Row, data[1] || {});
      writeDataInRow(penultimate1Row, data[3] || {});
      writeDataInRow(lastRow, data[4] || {});
    }

    function sortAndGroupRows(rows, rows2) {
      const sortedRows = Array(priorities.length).fill().map(() => []);
      const otherRows = [];
      const sortedRows2 = Array(priorities.length).fill().map(() => []);
      const otherRows2 = [];
      const inactiveRows = [];
      const inactiveRows2 = [];

      rows.forEach((row, i) => {
        const role = row.querySelector('.PRODFonc')?.innerText.trim() || "";
        const name = row.querySelector('.PRODNomPre')?.innerText.trim() || "";
        const totalHours = parseFloat(rows2[i]?.querySelector('td.ProdNBHTot')?.textContent.trim().replace(',', '.') || 0);

        if (totalHours <= 0) {
          inactiveRows.push(row);
          inactiveRows2.push(rows2[i]);
          return;
        }

        let found = false;
        if (name && Role_employees[name] !== undefined) {
          const idx = Role_employees[name];
          sortedRows[idx].push(row);
          sortedRows2[idx].push(rows2[i]);
          if ([1, 3, 4].includes(idx)) addHours(idx, rows2[i]);
          found = true;
        } else {
          priorities.forEach((group, idx) => {
            if (group.includes(role)) {
              sortedRows[idx].push(row);
              sortedRows2[idx].push(rows2[i]);
              if ([1, 3, 4].includes(idx)) addHours(idx, rows2[i]);
              found = true;
            }
          });
        }

        if (!found) {
          otherRows.push(row);
          otherRows2.push(rows2[i]);
        }
      });

      writeDataToRows(hoursTable);

      const flatRows = sortedRows.flatMap(g => g.length ? [...g, createEmptyRow()] : []);
      const flatRows2 = sortedRows2.flatMap(g => g.length ? [...g, createEmptyRow()] : []);
      const spacer = document.createElement('tr');
      spacer.style.height = '30px';

      return {
        sortedRows: flatRows.concat(otherRows).concat([spacer]).concat(inactiveRows),
        sortedRows2: flatRows2.concat(otherRows2).concat([spacer.cloneNode()]).concat(inactiveRows2)
      };
    }

    function insertRowsIntoTable(rows, table) {
      if (!table) return;
      rows.forEach(row => table.appendChild(row));
    }

    const colonneRows = getRowsFromContainer('colonne', 26);
    const colonneRows2 = getSecondDivRows(24);
    if (colonneRows.length && colonneRows2.length) {
      const { sortedRows, sortedRows2 } = sortAndGroupRows(colonneRows, colonneRows2);
      const mainTableBody = document.querySelector('div#colonne table.ProdTable tbody') ||
                            document.querySelector('div#colonne table.ProdTable');
      const secondTable = document.querySelector('div#colonne').nextElementSibling.querySelector('table');
      insertRowsIntoTable(sortedRows, mainTableBody);
      insertRowsIntoTable(sortedRows2, secondTable);
    }

    // --- MASQUAGE DE LA DERNIÈRE COLONNE --------------------------------------
    function hideLastTdInRows(container) {
      if (!container) return;
      container.querySelectorAll('tr').forEach(row => {
        const lastTd = row.querySelector('td:last-child');
        if (lastTd) lastTd.style.display = 'none';
      });
    }

    const secondDiv = document.getElementById('ligne');
    const colonneDiv = document.getElementById('colonne');
    const lastDiv = colonneDiv.nextElementSibling;
    hideLastTdInRows(secondDiv);
    hideLastTdInRows(lastDiv);
  }
})();
