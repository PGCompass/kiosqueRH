// ==UserScript==
// @name         KiosqueRH - Navigation mois
// @version      1.1
// @description  Ajoute des boutons pour naviguer mois par mois sur le select PERIODE (compatible ADP)
// @author       Pierre GARDIE
// @match        https://hr-services.fr.adp.com/*
// @updateURL    
// @downloadURL  
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Attendre que le DOM soit prêt
    window.addEventListener('load', () => {
        const select = document.getElementById('PERIODE');
        const btnSaisir = document.getElementById('id_btn_name_btnsaisir');
        if (!select) return;

        // Création des boutons
        const btnPrev = document.createElement('button');
        btnPrev.type = 'button';
        btnPrev.textContent = '←';
        btnPrev.style.marginRight = '5px';
        btnPrev.style.padding = '2px 6px';
        btnPrev.style.verticalAlign = 'middle';

        const btnNext = document.createElement('button');
        btnNext.type = 'button';
        btnNext.textContent = '→';
        btnNext.style.marginLeft = '5px';
        btnNext.style.padding = '2px 6px';
        btnNext.style.verticalAlign = 'middle';

        // Ajout avant et après le select
        select.parentNode.insertBefore(btnPrev, select);
        select.parentNode.insertBefore(btnNext, select.nextSibling);

        function changeMonth(offset) {
            const [currentMonth, currentYear] = select.value.split('.').map(Number);
            let newMonth = currentMonth + offset;
            let newYear = currentYear;

            if (newMonth < 1) { newMonth = 12; newYear -= 1; }
            else if (newMonth > 12) { newMonth = 1; newYear += 1; }

            const newValue = `${String(newMonth).padStart(2,'0')}.${newYear}`;

            // Vérifie que cette valeur existe dans le select
            const optionExists = Array.from(select.options).some(opt => opt.value === newValue);
            if (optionExists) {
                select.value = newValue;

                // Dispatch event compatible ADP
                const event = new Event('change', { bubbles: true, cancelable: true });
                // Légère temporisation pour éviter conflit avec ADP
                setTimeout(() => select.dispatchEvent(event), 50);
                if (btnSaisir && !btnSaisir.disabled) {
                    btnSaisir.click();
                }
            }
        }

        btnPrev.addEventListener('click', () => changeMonth(-1));
        btnNext.addEventListener('click', () => changeMonth(1));
    });
})();
