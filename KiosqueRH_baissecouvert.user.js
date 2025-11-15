// ==UserScript==
// @name         KiosqueRH - Baisse Couverts en %
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Ajoute un bouton Baisse % qui applique une réduction sur un jour du calendrier
// @match        https://hr-services.fr.adp.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @updateURL
// @downloadURL
// @grant        none
// ==/UserScript==

/* global $ */
(function() {
    'use strict';

    // --- Récupère mois + année depuis le menu PERIODE ---
    function getMoisAnDepuisPeriode() {
        const periode = $("#PERIODE").val(); // ex : "12.2025"
        if (!periode) return null;

        const match = periode.match(/(\d{1,2})\.(\d{4})/);
        if (!match) return null;

        return {
            mois: parseInt(match[1], 10),
            annee: parseInt(match[2], 10)
        };
    }

    // --- récupère numéro jour dans la ligne 1 du calendrier ---
    function getJourById(id) {
        const c = document.querySelectorAll('#ligne table.ProdTable tr:first-of-type td.ProdDonneesCal');
        if (!c[id]) return "";
        return c[id].innerText.replace(/\u00A0/g,'').split('\n')[1].replace(/^0/,'').trim();
    }

    // Trouve dans le tableau la colonne correspondant au jour donné
    function findIndexByDay(day) {
        const cells = document.querySelectorAll('#ligne table.ProdTable tr:first-of-type td.ProdDonneesCal');
        for (let i = 0; i < cells.length; i++) {
            const txt = cells[i].innerText.replace(/\u00A0/g,'');
            const parts = txt.split('\n');
            if (parts.length >= 2) {
                const j = parts[1].replace(/^0/,'').trim();
                if (parseInt(j, 10) === day) return i;
            }
        }
        return -1;
    }

    // --- Bouton Baisse % ---
    function ajouterBoutonBaisse() {
        const ref = document.getElementById('id_btn_name_btnOk');
        if (!ref || document.getElementById('id_btn_name_btnBaisse')) return;

        const tdParent = ref.parentElement;
        const td = document.createElement('td');
        td.innerHTML = '&nbsp;';

        const div = document.createElement('div');
        div.id = 'id_btn_name_btnBaisse';
        div.className = 'cougar-btn cougar-btn-workflow';
        div.style.width = '100px';
        div.innerHTML = '<em><span>&#xFF05;&nbsp;Baisse couverts</span></em>';

        div.onclick = () => openPopupBaisse();
        div.onmouseover = () => div.className = 'cougar-btn cougar-btn-over cougar-btn-workflow';
        div.onmouseout  = () => div.className = 'cougar-btn cougar-btn-workflow';
        div.onmousedown = () => div.className = 'cougar-btn cougar-btn-over cougar-btn-pressed cougar-btn-workflow';

        td.appendChild(div);
        tdParent.parentNode.insertBefore(td, tdParent.nextSibling);
    }

    // --- Popup ---
    function openPopupBaisse() {
        if (document.getElementById('popupBaissePercent')) return;

        const periode = $("#PERIODE").val(); // ex: "12.2025"
        if (!periode) return;

        const [moisStr, anneeStr] = periode.split(".");
        const mois = parseInt(moisStr, 10);
        const annee = parseInt(anneeStr, 10);

        // Construction MIN / MAX **en string directe**, SANS new Date()
        const minDate = `${annee}-${String(mois).padStart(2, '0')}-01`;

        // Dernier jour du mois : fabriquer directement
        const lastDay = new Date(annee, mois, 0).getDate(); // OK ici !
        const maxDate = `${annee}-${String(mois).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const pop = document.createElement('div');
        pop.id = 'popupBaissePercent';
        pop.style = `
        position: fixed;
        top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 16px;
        border: 2px solid #555; border-radius: 8px;
        box-shadow: 0 0 12px rgba(0,0,0,0.3);
        z-index: 999999;
        min-width: 260px;
    `;

        pop.innerHTML = `
        <h3 style="margin:0 0 8px 0;">Baisse % — ${moisStr}.${anneeStr}</h3>

        <label>Date :</label>
        <input type="date" id="baisse_date"
            min="${minDate}"
            max="${maxDate}"
            value="${minDate}"
            style="width:100%; margin-top:4px;"><br><br>

        <label>Baisse (%) :</label>
        <input type="number" id="baisse_pct" min="0" max="100" placeholder="ex : 20"
               style="width:100%; margin-top:4px;"><br><br>

        <div style="text-align:right;">
            <button id="baisse_exec" style="padding:6px 12px;">Exécuter</button>
            <button id="baisse_close" style="padding:6px 12px; margin-left:8px;">Fermer</button>
        </div>
    `;

        document.body.appendChild(pop);

        // Fermer
        $('#baisse_close').on('click', () => pop.remove());

        // Appliquer
        $('#baisse_exec').on('click', () => {
            const dateVal = $('#baisse_date').val();
            const pct = parseFloat($('#baisse_pct').val());
            if (!dateVal || isNaN(pct)) return;

            const d = new Date(dateVal);
            const day = d.getDate();

            const idx = findIndexByDay(day);
            if (idx === -1) return;

            const input = $(`#NBCOUV_${idx}`);
            if (!input.length) return;

            const actuel = parseInt(input.val()) || 0;
            const nouveau = Math.max(0, Math.round(actuel * (1 - pct / 100)));

            input.val(nouveau).trigger('change');

            pop.remove();
        });
    }


    // --- Appliquer réduction ---
    function runBaisse() {
        const dateVal = $('#baisse_date').val();
        const pct = parseFloat($('#baisse_pct').val());
        const msgEl = $('#baisse_msg');

        msgEl.hide();

        if (!dateVal || isNaN(pct)) {
            msgEl.text("Veuillez saisir une date et un pourcentage de baisse.").show();
            return;
        }

        const d = new Date(dateVal);
        const day = d.getDate();

        const idx = findIndexByDay(day);
        if (idx === -1) {
            msgEl.text("Jour introuvable dans le calendrier.").show();
            return;
        }

        const input = $(`#NBCOUV_${idx}`);
        if (!input.length) {
            msgEl.text("Champ couverts introuvable.").show();
            return;
        }

        const actuel = parseInt(input.val()) || 0;
        const nouveau = Math.max(0, Math.round(actuel * (1 - pct / 100)));

        input.val(nouveau).trigger('change');

        msgEl.css("color", "#070").text(`Baisse appliquée : ${actuel} → ${nouveau}`).show();
    }

    // --- Observer pour insérer le bouton ---
    const observer = new MutationObserver(() => {
        const b = document.querySelector('.BandeauEntete');
        if (b && b.textContent.trim() === "Saisie productivité prévisionnelle") {
            ajouterBoutonBaisse();
        }
    });

    observer.observe(document.body, {childList:true, subtree:true});

})();
