// ==UserScript==
// @name         KiosqueRH - Optimisation d'affichage
// @version      0.1
// @description  Optimisation de l'affichage
// @author       Pierre GARDIE - Compass Group France
// @match        https://hr-services.fr.adp.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_DisplayOptimization.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_DisplayOptimization.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var $ = window.jQuery;
    $('.general').css('width', '2200px').css('height', '1000px');
    $('.PRODNomPre').css('height', '17px');
    $('.ProdNBHTot').css('height', '16px');
    $('.prodDonneesTotDroite').css('width', '80px');

    // Sélectionnez la div avec la classe "general"
    var generalDiv = document.querySelector('.general');

    // Vérifiez si la div avec la classe "general" a au moins 4 div enfants
    if (generalDiv && generalDiv.children.length >= 4) {
        // Sélectionnez la quatrième div (index 3 car les indices commencent à 0)
        var quatriemeDiv = generalDiv.children[3];

        // Modifiez les styles de la quatrième div comme vous le souhaitez
        quatriemeDiv.style.width = '100%';
        quatriemeDiv.style.height = '100%';
        // Ajoutez d'autres modifications de style au besoin
    }

    // Sélectionner tous les éléments avec la classe "etat120Corps" et modifier leur largeur
    var elements = document.getElementsByClassName('etat120Corps');
    for (var i = 0; i < elements.length; i++) {
        elements[i].style.width = '80%';
    }

    // Fonction pour obtenir la liste des 6 prochains mois (y compris le mois suivant)
    function getSixNextMonths() {
        var months = [];
        var currentDate = new Date();

        for (var i = 0; i < 6; i++) {
            var nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + i + 1, 1);
            var formattedDate = ('0' + (nextMonth.getMonth() + 1)).slice(-2) + '.' + nextMonth.getFullYear(); //.getMonth() + 1)
            months.push(formattedDate);
        }

        return months;
    }

    // Sélectionnez la classe "BandeauEntete"
    var bandeauEntete = document.querySelector('.BandeauEntete');

    // Vérifiez si la classe "BandeauEntete" existe et contient le texte spécifique
    if (bandeauEntete && bandeauEntete.textContent.trim() === "Saisie productivité prévisionnelle") {
        // Sélectionnez le menu déroulant existant
        var menuDeroulant = document.getElementById('PERIODE');

        // Vérifiez si le menu déroulant existe
        if (menuDeroulant) {
            // Supprimez toutes les options existantes
            menuDeroulant.innerHTML = '';

            // Obtenez les 6 prochains mois
            var sixNextMonths = getSixNextMonths();

            // Ajoutez les options au menu déroulant
            for (var j = 0; j < sixNextMonths.length; j++) {
                var option = document.createElement('option');
                option.value = sixNextMonths[j];
                option.text = sixNextMonths[j];
                menuDeroulant.appendChild(option);
            }
        }
    }

    // Fonction pour masquer les lignes spécifiques
    function hideRows() {
        const colonneDiv = document.getElementById('colonne');
        if (!colonneDiv) return;

        const lastDiv = colonneDiv.nextElementSibling;
        if (!lastDiv) return;

        const rows = colonneDiv.querySelectorAll('tr');
        const lastDivRows = lastDiv.querySelectorAll('tr');

        // Masquer les lignes dans le div avec l'ID 'colonne' et dans la dernière div
        [1, 7, 10, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22, 23, 24, 25].forEach(index => {
            if (rows[index]) {
                rows[index].style.display = 'none'; // masquer à gauche
            }
        });
        [1, 7, 10, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22, 23].forEach(index => {
            if (lastDivRows[index]) {
                lastDivRows[index].style.display = 'none'; // masquer à droite
            }
            if (lastDivRows[16]) {
                lastDivRows[16].style.color = '#FF0000';
                lastDivRows[16].style.fontWeight = 'bold';
            }
        });
    }

    // Exécution du script
    hideRows(); // Lancer la fonction


    // Modifier la hauteur du TD du 14e TR dans la dernière colonne de lastDiv
    const colonneDiv = document.getElementById('colonne');
    const lastDiv = colonneDiv.nextElementSibling;
    if (lastDiv) {
        var tdElementInLastDiv = lastDiv.querySelector('tr:nth-child(14)');
        if (tdElementInLastDiv) {
            tdElementInLastDiv.style.height = '35px'
        } else {
            console.log("L'élément TD cible dans lastDiv n'a pas été trouvé.");
        }
    } else {
        console.log("lastDiv n'a pas été trouvé.");
    }

    var tdElements = colonneDiv.querySelectorAll('td.ProdTitreLigne');
    var count = tdElements.length;
    if (count >= 3) {
        for (var k = count - 3; k < count; k++) {
            tdElements[k].style.height = '16px'; // Changez '50px' à la hauteur souhaitée
        }
    } else {
        console.log("Moins de 3 éléments avec la classe ProdTitreLigne trouvés.");
    }

    var firstTrInLastDiv = lastDiv.querySelector('tr:first-child');
    if (firstTrInLastDiv) {
        var proddonneebleuDivs = firstTrInLastDiv.querySelectorAll('td.prodDonneesBleu');
        if (proddonneebleuDivs.length > 0) {
            proddonneebleuDivs.forEach(function(div) {
                div.style.backgroundColor = '#66FF66'; // Changez 'red' à la couleur souhaitée
            });
        } else {
            console.log("Aucun élément td.prodDonneesBleu n'a été trouvé dans le premier TR de lastDiv.");
        }
    } else {
        console.log("Le premier TR n'a pas été trouvé dans lastDiv.");
    }

})();
