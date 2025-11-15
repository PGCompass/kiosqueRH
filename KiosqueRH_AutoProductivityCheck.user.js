// ==UserScript==
// @name         KiosqueRH - Vérification productivité auto
// @version      2.42
// @description  Calcul automatique des productivités
// @author       Pierre
// @match        https://hr-services.fr.adp.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_AutoProductivityCheck.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_AutoProductivityCheck.user.js
// ==/UserScript==

/* global $ */

(function() {
    'use strict';

    const bandeauEnteteProd = document.querySelector('.BandeauEntete');
    if (!bandeauEnteteProd) return;

    const periode = $('#PERIODE').val().split('.');
    const KiosqueRHMonth = parseInt(periode[0], 10);
    const KiosqueRHYear = parseInt(periode[1], 10);

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const date_jour = today.getDate();

    /******************** LOGIQUE ANTI-MOIS ANTÉRIEURS ********************/
    function doitRecalculer(NBCOUV, dayNumber) {
        NBCOUV = parseInt(NBCOUV, 10) || 0;

        // ⛔ Mois ou années passés → jamais recalculer
        if (KiosqueRHYear < currentYear ||
           (KiosqueRHYear === currentYear && KiosqueRHMonth < currentMonth)) {
            return false;
        }

        // ✅ Mois / années futurs → recalcul complet si NBCOUV > 0
        if (KiosqueRHYear > currentYear || KiosqueRHMonth > currentMonth) {
            return NBCOUV > 0;
        }

        // 📌 Même mois + même année → jours STRICTEMENT > aujourd'hui
        return NBCOUV > 0 && dayNumber > date_jour;
    }

    /******************** BOUTONS ********************/
    function ajouterBoutonApresExporterTotal(id, label, callback) {
        const ref = document.getElementsByName('BT_exporterTotal')[0];
        if (!ref || document.getElementById(id)) return;

        const tdParent = ref.parentElement;
        const td = document.createElement('td');
        td.innerHTML = '&nbsp;';

        const div = document.createElement('div');
        div.id = id;
        div.className = 'cougar-btn cougar-btn-workflow';
        div.style.width = '110px';

        let icone = '';
        if(id === 'btnProdAuto') icone = '🧮';
        if(id === 'btnVerifProd') icone = '🔍';

        div.innerHTML = `<em><span>${icone}&nbsp;${label}</span></em>`;

        div.onclick = callback;
        div.onmouseover = () => div.className = 'cougar-btn cougar-btn-over cougar-btn-workflow';
        div.onmouseout  = () => div.className = 'cougar-btn cougar-btn-workflow';
        div.onmousedown = () => div.className = 'cougar-btn cougar-btn-over cougar-btn-pressed cougar-btn-workflow';

        td.appendChild(div);
        tdParent.parentNode.insertBefore(td, tdParent.nextSibling);
    }

    ajouterBoutonApresExporterTotal('btnProdAuto', 'Prod Auto', recupererContenuPremiereLigneProd);
    ajouterBoutonApresExporterTotal('btnVerifProd', 'Vérif Productivité', verification_prod);

    /******************** TABLE PROD & CALCULS ********************/
    const prodCodeUR = [
        ["234001",0,7.55,0,33,66,99],
        ["304501",1,22.14,0,18,18.3,25,29.6,33.7,33.6,34.7,36.8,39.6,43.7,47.5,48.3,53.9],
        ["960001",1,22.14,1,25,25,25,25,33.5,.3,41.8,46.9,41.4,40.8,46.2,45.6,48,48,48,48,48,48,48,48],
        ["C48001",1,22.14,1,12,12.2,18.6,25.0,28.1,30.7,36,36.3,37,39.6,41.1,44.8,49.3,54.8,62.2],
        ["D05301",1,22.14,1,16.9,22.7,26.2,30.3,32.9,35.2,41.4,44.0,47.0,50.1,52.9],
        ["D37501",1,22.14,0,19,19.1,28.5,34.6,37.9,41.3,40.4,42.7,47.2],
        ["D39901",1,22.14,1,25,25,25,25,30.5,32.3,34.8,36.9,41.4,40.8,46.2,45.6,48,48,48,48,48,48,48,48],
        ["F17501",1,22.14,0,27,27.5,28,28,28,29,33,36,40,43],
        ["F36501",1,22.14,1,25,25,25,25,33.5,38.3,41.8,46.9,41.4,40.8,46.2,45.6,48,48,48,48,48,48,48,48],
        ["F76701",1,22.14,0,25,25,25,25,25,26.6,31.6,40.0,47.5],
        ["G46201",1,22.14,1,25,25,25,25,33.5,38.3,41.8,46.9,41.4,40.8,46.2,45.6,48,48,48,48,48,48,48,48],
        ["G76301",1,22.14,1,25,25,25,25,33.5,38.3,41.8,46.9,41.4,40.8,46.2,45.6,48,48,48,48,48,48,48,48]
    ];

    function geturdataProd(UR, col) {
        const row = prodCodeUR.find(r => r[0] === UR);
        if (!row) return 40;
        return row[col] ?? row[row.length - 1];
    }

    function recalculProd(index, prod) {
        const tables = document.querySelectorAll('.ProdTable');
        if (tables.length === 0) return;
        const table = tables[tables.length - 1];

        const getInput = (r, c) =>
            parseFloat(table.querySelectorAll('tr')[r].querySelectorAll('td')[c].querySelector('input')?.value.replace(',', '.') || 0);

        const couverts = getInput(0, index);
        const total_salaries = parseFloat(table.querySelectorAll('tr')[1].querySelectorAll('td')[index].textContent.replace(',', '.') || 0);

        const heure_plus = getInput(2, index);
        const interim = parseFloat(table.querySelectorAll('tr')[3].querySelectorAll('td')[index].textContent.replace(',', '.') || 0);
        const int_heure_plus = getInput(4, index);

        const total_heure = total_salaries + heure_plus + interim + int_heure_plus;
        const calc_ETP = total_heure / 7.38;
        const calc_prod_heure = couverts / total_heure;
        const calc_productivite = couverts / calc_ETP;

        table.querySelectorAll('tr')[5].querySelectorAll('td')[index].textContent = total_heure.toFixed(2).replace('.', ',');
        table.querySelectorAll('tr')[6].querySelectorAll('td')[index].textContent = calc_ETP.toFixed(2).replace('.', ',');
        table.querySelectorAll('tr')[7].querySelectorAll('td')[index].textContent = isNaN(calc_prod_heure) ? "0,00" : calc_prod_heure.toFixed(2).replace('.', ',');

        const tdProd = table.querySelectorAll('tr')[8].querySelectorAll('td')[index];
        tdProd.textContent = isNaN(calc_productivite) ? "0,00" : calc_productivite.toFixed(2).replace('.', ',');
        tdProd.style.backgroundColor = calc_productivite < (prod * 0.95) ? "red" : "green";
    }

    /******************** PROD AUTO ********************/
    function recupererContenuPremiereLigneProd() {
        const codeUR = $('#UR').val();
        const td = $('.ProdDonneesCal');
        let id = 0;

        td.each(function(index, colonne) {
            const NBCOUV = $('#NBCOUV_' + id).val();

            // récupérer le numéro réel du jour
            const dayPart = $(colonne).html().split('<br>')[1] || '';
            const dayNumber = parseInt(dayPart.replace(/\D/g, ''), 10);

            let tranche = (NBCOUV - (NBCOUV % (100/3))) / (100/3) + 4;
            let prod = geturdataProd(codeUR, tranche);

            if (doitRecalculer(NBCOUV, dayNumber))
                recalculProd(index + 1, prod);

            id++;
        });
    }

    /******************** VÉRIFICATION PROD ********************/
    function verification_prod() {
        const codeUR = $('#UR').val();
        const td = $('.ProdDonneesCal');
        let id = 0;

        td.each(function(index, colonne) {
            const NBCOUV = $('#NBCOUV_' + id).val();

            const dayPart = $(colonne).html().split('<br>')[1] || '';
            const dayNumber = parseInt(dayPart.replace(/\D/g, ''), 10);

            let tranche = (NBCOUV - (NBCOUV % (100/3))) / (100/3) + 4;
            let prod = geturdataProd(codeUR, tranche);

            if (doitRecalculer(NBCOUV, dayNumber))
                recalculProd(index + 1, prod);

            id++;
        });
    }

})();
