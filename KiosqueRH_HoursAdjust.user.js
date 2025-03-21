// ==UserScript==
// @name         KiosqueRH - Ajustement des heures +/-
// @version      1.4
// @description  Ajoute des boutons + et - pour modifier le montant d'une cellule
// @author       Pierre GARDIE - Compass Group France
// @match        https://hr-services.fr.adp.com/*
// @updateURL    https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_HoursAdjust.user.js
// @downloadURL  https://github.com/PGCompass/kiosqueRH/raw/refs/heads/main/KiosqueRH_HoursAdjust.user.js
// @grant        none
// ==/UserScript==

(function() {
    // Fonction pour créer un bouton
    function createButton(text, onClick) {
        const button = document.createElement("button");
        button.textContent = text;
        button.style.width = "15px";
        button.style.height = "15px";
        button.style.display = "none"; // Cacher les boutons par défaut
        button.style.zIndex = "1000"; // Assurer que les boutons soient toujours au premier plan
        button.style.border = "1px solid #ccc"; // Ajout d'une bordure pour l'apparence
        button.style.backgroundColor = "#fff"; // Fond blanc pour les boutons
        button.style.fontSize = "10px";
        button.addEventListener("click", (event) => {
            event.preventDefault(); // Empêche le comportement par défaut du bouton
            onClick();
        });
        return button;
    }

    // Fonction pour convertir les valeurs avec des virgules en points pour les calculs
    function parseFrenchNumber(value) {
        return parseFloat(value.replace(',', '.')) || 0;
    }

    // Fonction pour convertir les valeurs en format français
    function toFrenchNumber(value, integerOnly = false) {
        if (integerOnly) {
            return Math.round(value).toString();
        }
        return value.toFixed(2).replace('.', ',');
    }

    function recalcul_total_lgn(lgn, col, first_value, new_value, nb_chiffre_virgule) {
        // Sélectionner toutes les tables avec la classe 'ProdTable'
        const tables = document.querySelectorAll('.ProdTable');

        if (tables.length > 0) {
            // Sélectionner la dernière table
            const lastTable = tables[tables.length - 1];

            // Sélectionner la ligne et la cellule cible
            const targetCell = lastTable.querySelectorAll('tr')[lgn].querySelectorAll('td')[0];

            // Récupérer et convertir la valeur actuelle des couverts
            const couverts = parseFloat(targetCell.textContent.trim() !== '' ? targetCell.textContent.trim().replace(',', '.') : 0);

            // Calculer la nouvelle valeur des couverts
            const new_couverts = couverts - first_value + new_value;

            // Mettre à jour le contenu texte de la cellule avec la nouvelle valeur
            targetCell.textContent = new_couverts.toFixed(nb_chiffre_virgule);
        }
    }


    function recalcul(index) {
        const tables = document.querySelectorAll('.ProdTable');
        if (tables.length > 0) {
            const lastTable = tables[tables.length - 1];
            // récupération des varibles :
            const couverts = parseFloat(lastTable.querySelectorAll('tr')[0].querySelectorAll('td')[index].querySelector('input').value.trim() !== '' ? lastTable.querySelectorAll('tr')[0].querySelectorAll('td')[index].querySelector('input').value.replace(',', '.') : 0);
            const total_salaries = parseFloat(lastTable.querySelectorAll('tr')[1].querySelectorAll('td')[index].textContent.trim() !== '' ? lastTable.querySelectorAll('tr')[1].querySelectorAll('td')[index].textContent.trim().replace(',', '.') : 0);
            const heure_plus = parseFloat(lastTable.querySelectorAll('tr')[2].querySelectorAll('td')[index].querySelector('input').value.trim() !== '' ? lastTable.querySelectorAll('tr')[2].querySelectorAll('td')[index].querySelector('input').value.replace(',', '.') : 0);
            const interim = parseFloat(lastTable.querySelectorAll('tr')[3].querySelectorAll('td')[index].textContent.trim() !== '' ? lastTable.querySelectorAll('tr')[3].querySelectorAll('td')[index].textContent.trim().replace(',', '.') : 0);
            const int_heure_plus = parseFloat(lastTable.querySelectorAll('tr')[4].querySelectorAll('td')[index].querySelector('input').value.trim() !== '' ? lastTable.querySelectorAll('tr')[4].querySelectorAll('td')[index].querySelector('input').value.replace(',', '.') : 0);
            const total_heure = lastTable.querySelectorAll('tr')[5].querySelectorAll('td')[index];
            const ETP = lastTable.querySelectorAll('tr')[6].querySelectorAll('td')[index];
            const prod_heure = lastTable.querySelectorAll('tr')[7].querySelectorAll('td')[index];
            const productivite = lastTable.querySelectorAll('tr')[8].querySelectorAll('td')[index];
           // Calcul des données
            const calc_total_heure = total_salaries + heure_plus + interim + int_heure_plus;
            const calc_ETP = calc_total_heure / 7.38;
            const calc_prod_heure = couverts / calc_total_heure;
            const calc_productivite = couverts / calc_ETP;
            // Ecriture des données
            total_heure.textContent = calc_total_heure.toFixed(2).replace('.', ',');
            ETP.textContent = calc_ETP.toFixed(2).replace('.', ',');
            prod_heure.textContent = !isNaN(calc_prod_heure) ? calc_prod_heure.toFixed(2).replace('.', ',') : '0,00';
            productivite.textContent = !isNaN(calc_productivite) ? calc_productivite.toFixed(2).replace('.', ',') : '0,00';
        }
    }

    function extractNumber(str) {
        const match = str.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
    }

    // Sélectionner toutes les cellules <td> de saisie
    const cellules = document.querySelectorAll("td.prodDonneesBleu");
    const inputs = document.querySelectorAll("input.prodDonneesSaisissables")

    // Pour chaque cellule, ajouter les boutons + et -
    cellules.forEach((cellule, index) => {
        const input = cellule.querySelector("input.prodDonneesSaisissables");
        if (!input) {
            console.warn(`No input found for cell at index ${index}`);
            return; // Si aucun input n'est trouvé, passer à la cellule suivante
        }

        // Créer un conteneur pour la cellule et les boutons
        const container = document.createElement("div");
        container.style.display = "inline-block";
        container.style.position = "relative";

        // Déplacer l'input dans le conteneur
        cellule.appendChild(container);
        container.appendChild(input);

        // Créer les boutons
        const boutonPlus = createButton("+", () => {
            let value = parseFrenchNumber(input.value);
            let first_value = 0;
            if (index < cellules.length / 3) { // Première ligne
                first_value = value;
                value += 5;
                input.value = toFrenchNumber(value - (value % 5), true); // Affichage en entier
                recalcul_total_lgn(0, index, first_value, value, 0);
            } else if (index < (2 * cellules.length) / 3) { // Deuxième ligne
                if (value >= 0) {
                    const delta = (((value % 7.38).toFixed(2)) % 7.38) % 5;
                    value = value - delta;
                    first_value = value;
                    if (((value % 7.38).toFixed(2)) % 7.38 === 0) {
                        value += 5;
                    } else {
                        value += 2.38;
                    }
                } else {
                    const delta = (((value % -7.38).toFixed(2)) % -7.38) % -5;
                    value = value - delta;
                    first_value = value;
                    if (((value % 7.38).toFixed(2)) % 7.38 === 0) {
                        value += 2.38;
                    } else {
                        value += 5;
                    }
                }
                input.value = toFrenchNumber(value);
                recalcul_total_lgn(2, index, first_value, value, 2);
            } else { // Troisième ligne
                first_value = value;
                if (((value % 7).toFixed(2)) % 7 === 0) {
                    value += 4.5;
                } else {
                    value += 2.5;
                }
                input.value = toFrenchNumber(value);
                recalcul_total_lgn(4, index, first_value, value, 2);
            }
            recalcul(extractNumber(input.id) + 1);
            recalcul(0);
        });

        const boutonMoins = createButton("-", () => {
            let value = parseFrenchNumber(input.value);
            let first_value = 0;
            if (index < cellules.length / 3) { // Première ligne
                first_value = value;
                value -= 5;
                if (value < 0) {
                    value = 0; // Ne pas aller en dessous de 0
                }
                input.value = toFrenchNumber(value - (value % 5), true);
                recalcul_total_lgn(0, index, first_value, value, 0);
            } else if (index < (2 * cellules.length) / 3) { // Deuxième ligne
                if (value > 0) {
                    const delta = (((value % 7.38).toFixed(2)) % 7.38) % 5;
                    value = value - delta;
                    first_value = value;
                    if (((value % 7.38).toFixed(2)) % 7.38 === 0) {
                        value -= 2.38;
                    } else {
                        value -= 5;
                    }
                } else {
                    const delta = (((value % -7.38).toFixed(2)) % -7.38) % -5;
                    value = value - delta;
                    first_value = value;
                    if (((value % 7.38).toFixed(2)) % 7.38 === 0) {
                        value -= 5;
                    } else {
                        value -= 2.38;
                    }
                }
                input.value = toFrenchNumber(value);
                recalcul_total_lgn(2, index, first_value, value, 2);
            } else { // Troisième ligne
                first_value = value;
                if (((value % 7).toFixed(2)) % 7 === 0) {
                    value -= 2.5;
                } else {
                    value -= 4.5;
                }
                if (value < 0) {
                    value = 0; // Ne pas aller en dessous de 0
                }
                input.value = toFrenchNumber(value);
                recalcul_total_lgn(4, index, first_value, value, 2);
            }
            recalcul(extractNumber(input.id) + 1);
            recalcul(0);
        });

        // Ajouter les boutons au conteneur
        const buttonContainer = document.createElement("div");
        buttonContainer.style.position = "absolute";
        buttonContainer.style.left = "-20px";
        buttonContainer.style.top = "50%";
        buttonContainer.style.transform = "translateY(-50%)";
        buttonContainer.style.display = "flex";
        buttonContainer.style.flexDirection = "column";
        buttonContainer.style.zIndex = "1000"; // Mettre les boutons au premier plan

        buttonContainer.appendChild(boutonPlus);
        buttonContainer.appendChild(boutonMoins);

        container.appendChild(buttonContainer);

        // Ajouter les écouteurs d'événements pour afficher/cacher les boutons
        cellule.addEventListener("mouseenter", () => {
            boutonPlus.style.display = "inline-block";
            boutonMoins.style.display = "inline-block";
        });

        cellule.addEventListener("mouseleave", () => {
            boutonPlus.style.display = "none";
            boutonMoins.style.display = "none";
        });
    });
})();

