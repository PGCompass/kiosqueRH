// ==UserScript==
// @name         KiosqueRH - Vérification productivité auto
// @version      2.1
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

    const prodCodeUR = [
        // UR    ,Plusieurs ETP ?, heures minimale, mitemps oui ou non, prod pas de 33 couverts [1 - 33; 34 - 66; 67 - 99; 100 - 133; ...]
        ["234001",0,7.55,0,33,66,99],
        ["304501",1,22.14,0,18,18.3,25,29.6,33.7,33.6,34.7,36.8,39.6,43.7,47.5,48.3,53.9],
        ["960001",1,22.14,1,25,25,25,25,33.5,44.3,41.8,46.9,41.4,40.8,46.2,45.6,48,48,48,48,48,48,48,48],
        ["C48001",1,22.14,1,12,12.2,18.6,25.0,28.1,30.7,36,36.3,37,39.6,41.1,44.8,49.3,54.8,62.2],
        ["D05301",1,22.14,1,16.9,22.7,26.2,30.3,32.9,35.2,41.4,44.0,47.0,50.1,52.9],
        ["D37501",1,22.14,0,19,19.1,28.5,34.6,37.9,41.3,40.4,42.7,47.2],
        ["F17501",1,22.14,0,27,27.5,28,28,28,29,33,36,40,43],
        ["F76701",1,22.14,0,25,25,25,25,25,26.6,31.6,40.0,47.5],
        ["D39901",1,22.14,1,25,25,25,25,33.5,44.3,41.8,46.9,41.4,40.8,46.2,45.6,48,48,48,48,48,48,48,48]
    ];

    const bandeauEnteteProd = document.querySelector('.BandeauEntete');

    if (bandeauEnteteProd && bandeauEnteteProd.textContent.trim() === "Saisie productivité prévisionnelle") {
        attachButtonEvents();
        customizeButtons();
    }

    function attachButtonEvents() {
        const targetElementProd = document.querySelector('[name="BT_exporter"]');
        if (targetElementProd) {
            targetElementProd.onclick = function() {
                const prodTitreLigneSynthElement = document.querySelector('.ProdTitreLigneSynth');
                if (prodTitreLigneSynthElement) {
                    recupererContenuPremiereLigneProd();
                    return false;
                }
            };
        }

        const targetElementbisProd = document.querySelector('[name="BT_exporterTotal"]');
        if (targetElementbisProd) {
            targetElementbisProd.onclick = function() {
                const prodTitreLigneSynthElementbis = document.querySelectorAll('.ProdTitreLigneSynth')[1];
                if (prodTitreLigneSynthElementbis) {
                    verification_prod();
                    return false;
                }
            };
        }
    }

    function customizeButtons() {
        const targetElementspanProd = document.querySelector('.cougar-btn-export');
        if (targetElementspanProd) {
            targetElementspanProd.innerText = '\u00A0\u00A0\u00A0Prod Auto';
        }

        const targetElementspanbisProd = document.querySelectorAll('.cougar-btn-export')[1];
        if (targetElementspanbisProd) {
            targetElementspanbisProd.innerText = '\u00A0\u00A0\u00A0Vérif Productivité';
        }
    }

    function geturdataProd(UR, colonne) {
        const indiceUR = prodCodeUR.findIndex(item => item[0] === UR);
        if (indiceUR !== -1) {
            const urData = prodCodeUR[indiceUR];
            return (colonne >= 0 && colonne < urData.length) ? urData[colonne] : urData[urData.length - 1];
        } else {
            return 40;//productivité de base pour tous les sites non référencés.
        }
    }

    function recalculProd(index, prod) {
        const tablesProd = document.querySelectorAll('.ProdTable');
        if (tablesProd.length > 0) {
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
    }

    function recupererContenuPremiereLigneProd() {
        const codeUR = $('#UR').val();
        const td = $('.ProdDonneesCal');
        const nombreDeTD = $('.ProdDonneesCal').length;
        let id = 0;

        if (td.length > 0) {
            td.slice(0, nombreDeTD).each(function(index, colonne) {
                let prod = 40;
                const jour = $(colonne).html().split('<br>')[0];
                const NBCOUV = $('#NBCOUV_' + id).val();
                const ajustheure = document.getElementById('AJUSTDIV_' + id);
                const ajustheureint = document.getElementById('AJUSTINT_' + id);
                const valeurTotpla = document.getElementById('TOTPLA_' + id).textContent.trim();
                const totalheure = parseFloat(valeurTotpla.replace(',', '.'));

                if (jour === "SA" || jour === "DI") {
                    ajustheure.value = -totalheure;
                    ajustheureint.value = "0";
                } else if (NBCOUV == 0) {
                    ajustheure.value = -totalheure;
                    ajustheureint.value = 0;
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

                    if (reste / 3.7 > 1 && geturdataProd(codeUR, 3) > 0) {
                        nbdemi = 5;
                    }

                    ajustheure.value = (-heuretp - nbdemi).toFixed(2);
                    ajustheureint.value = 0;
                }
                let col_id = index + 1;
                if (NBCOUV > 0) recalculProd(col_id, prod);
                id += 1;
            });
        }
    }

    function verification_prod() {
        const codeUR = $('#UR').val();
        const td = $('.ProdDonneesCal');
        const nombreDeTD = $('.ProdDonneesCal').length;
        let id = 0;
        let prod;

        if (td.length > 0) {
            td.slice(0, nombreDeTD).each(function(index, colonne) {
                const NBCOUV = $('#NBCOUV_' + id).val();
                const tranche = (NBCOUV - (NBCOUV % (100/3))) / (100/3) + 4;
                prod = geturdataProd(codeUR, tranche);
                let col_id = index + 1;
                if (NBCOUV > 0) recalculProd(col_id, prod);
                id += 1;
            });
        }
    }

})();
