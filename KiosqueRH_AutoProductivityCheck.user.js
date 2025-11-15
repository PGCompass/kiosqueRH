// ==UserScript==
// @name         KiosqueRH - Vérification productivité auto
// @version      2.63
// @description  Calcul automatique des productivités
// @author       Pierre GARDIE - Compass Group France
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

    const pageTitre = bandeauEnteteProd.textContent.trim();
    const el = document.querySelector('.ProdTitreLigneSynth');
    const txt = el.textContent;
    const [m, y] = txt.match(/(\d{2})\.(\d{4})/).slice(1);
    const KiosqueRHMonth = parseInt(m, 10);
    const KiosqueRHYear = parseInt(y, 10);

    
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // mois actuel 1-12
    const currentYear = today.getFullYear();
    const date_jour = today.getDate(); // numéro du jour actuel


    /*************** Fonction utilitaire pour savoir si on doit recalculer ***************/
    function doitRecalculer(NBCOUV, col_id) {
        const isPast =
            KiosqueRHYear < currentYear ||
            (KiosqueRHYear === currentYear && KiosqueRHMonth < currentMonth);
    
        const isFuture =
            KiosqueRHYear > currentYear ||
            (KiosqueRHYear === currentYear && KiosqueRHMonth > currentMonth);
    
        if (isPast) return false;
        if (isFuture) return NBCOUV > 0;
    
        // même mois & même année
        return col_id > date_jour && NBCOUV > 0;
    }



    /*************** Fonction utilitaire pour créer un bouton après BT_exporterTotal ***************/
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
    
        // Choix de l'icône selon le bouton
        let icone = '';
        if(id === 'btnProdAuto') icone = '🧮';         // calculette
        if(id === 'btnVerifProd') icone = '🔍';        // loupe
    
        div.innerHTML = `<em><span>${icone}&nbsp;${label}</span></em>`;
    
        div.onclick = callback;
        div.onmouseover = () => div.className = 'cougar-btn cougar-btn-over cougar-btn-workflow';
        div.onmouseout  = () => div.className = 'cougar-btn cougar-btn-workflow';
        div.onmousedown = () => div.className = 'cougar-btn cougar-btn-over cougar-btn-pressed cougar-btn-workflow';
    
        td.appendChild(div);
        tdParent.parentNode.insertBefore(td, tdParent.nextSibling);
    }

    /*************** Ajout des boutons ***************/
    ajouterBoutonApresExporterTotal('btnProdAuto', 'Prod Auto', recupererContenuPremiereLigneProd);
    ajouterBoutonApresExporterTotal('btnVerifProd', 'Vérif Productivité', verification_prod);

    /*************** Fonctions de calcul de productivité existantes ***************/
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

    function geturdataProd(UR, colonne) {
        const indiceUR = prodCodeUR.findIndex(item => item[0] === UR);
        if (indiceUR !== -1) {
            const urData = prodCodeUR[indiceUR];
            return (colonne >= 0 && colonne < urData.length) ? urData[colonne] : urData[urData.length - 1];
        } else {
            return 40;
        }
    }

    function recalculProd(index, prod) {
        const tablesProd = document.querySelectorAll('.ProdTable');
        if (tablesProd.length === 0) return;
        const lastTableProd = tablesProd[tablesProd.length - 1];

        const getNumericInputValue = (row, column) => parseFloat(
            lastTableProd.querySelectorAll('tr')[row].querySelectorAll('td')[column].querySelector('input')?.value.trim().replace(',', '.') || 0
        );

        const couverts = getNumericInputValue(0, index);
        const total_salaries = parseFloat(lastTableProd.querySelectorAll('tr')[1].querySelectorAll('td')[index].textContent.trim().replace(',', '.') || 0);
        const heure_plus = getNumericInputValue(2, index);
        const interim = parseFloat(lastTableProd.querySelectorAll('tr')[3].querySelectorAll('td')[index].textContent.trim().replace(',', '.') || 0);
        const int_heure_plus = getNumericInputValue(4, index);

        const total_heure = lastTableProd.querySelectorAll('tr')[5].querySelectorAll('td')[index];
        const ETP = lastTableProd.querySelectorAll('tr')[6].querySelectorAll('td')[index];
        const prod_heure = lastTableProd.querySelectorAll('tr')[7].querySelectorAll('td')[index];
        const productivite = lastTableProd.querySelectorAll('tr')[8].querySelectorAll('td')[index];

        const calc_total_heure = total_salaries + heure_plus + interim + int_heure_plus;
        const calc_ETP = calc_total_heure / 7.38;
        const calc_prod_heure = couverts / calc_total_heure;
        const calc_productivite = couverts / calc_ETP;

        total_heure.textContent = calc_total_heure.toFixed(2).replace('.', ',');
        ETP.textContent = calc_ETP.toFixed(2).replace('.', ',');
        prod_heure.textContent = !isNaN(calc_prod_heure) ? calc_prod_heure.toFixed(2).replace('.', ',') : '0,00';
        productivite.textContent = !isNaN(calc_productivite) ? calc_productivite.toFixed(2).replace('.', ',') : '0,00';
        productivite.style.backgroundColor = calc_productivite < (prod * 0.95) ? "red" : "green";
    }

    function recupererContenuPremiereLigneProd() {
        const codeUR = $('#UR').val();
        const td = $('.ProdDonneesCal');
        const nombreDeTD = td.length;
        let id = 0;

        if (td.length === 0) return;

        td.slice(0, nombreDeTD).each(function(index, colonne) {
            let prod = 40;
            const jour = $(colonne).html().split('<br>')[0];
            const NBCOUV = $('#NBCOUV_' + id).val();
            const ajustheure = document.getElementById('AJUSTDIV_' + id);
            const ajustheureint = document.getElementById('AJUSTINT_' + id);
            const valeurTotpla = document.getElementById('TOTPLA_' + id)?.textContent.trim();
            const totalheure = parseFloat(valeurTotpla?.replace(',', '.') || 0);
            if (doitRecalculer(NBCOUV, id + 1)) {
                if (jour === "SA" || jour === "DI" || NBCOUV == 0) {
                    ajustheure.value = -totalheure;
                    ajustheureint.value = "0";
                } else if (NBCOUV < 80 && geturdataProd(codeUR, 1) > 0) {
                    ajustheure.value = -totalheure + geturdataProd(codeUR, 2);
                    ajustheureint.value = 0;
                } else {
                    const tranche = (NBCOUV - (NBCOUV % (100/3))) / (100/3) + 4;
                    prod = geturdataProd(codeUR, tranche);
                    const heureprev = (NBCOUV / prod) * 7.38;
                    const reste = (totalheure - heureprev) % 7.38;
                    const heuretp = totalheure - heureprev - reste;
                    let nbdemi = 0;
    
                    if (reste / 3.7 > 1 && geturdataProd(codeUR, 3) > 0) nbdemi = 5;
    
                    ajustheure.value = (-heuretp - nbdemi).toFixed(2);
                    ajustheureint.value = 0;
                }
    
                let col_id = index + 1;
                recalculProd(col_id, prod);
            }
            id += 1;
        });
    }

    function verification_prod() {
        const codeUR = $('#UR').val();
        const td = $('.ProdDonneesCal');
        const nombreDeTD = td.length;
        let id = 0;
        let prod;

        if (td.length === 0) return;

        td.slice(0, nombreDeTD).each(function(index, colonne) {
            const NBCOUV = $('#NBCOUV_' + id).val();
            const tranche = (NBCOUV - (NBCOUV % (100/3))) / (100/3) + 4;
            prod = geturdataProd(codeUR, tranche);
            let col_id = index + 1;
            if (doitRecalculer(NBCOUV, col_id)) recalculProd(col_id, prod);
            id += 1;
        });
    }

})();
