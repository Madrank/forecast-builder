# Forecast Builder — Application de prévision de chiffre d’affaires (Offline)

## Description

**Forecast Builder** est une application web **100% front-end** développée en **HTML5 / CSS3 / JavaScript pur**.  
Elle permet de prévoir le chiffre d’affaires annuel d’une activité à partir de données business saisies par l’utilisateur, le tout **sans connexion internet** ni backend.

L’interface, inspirée des dashboards SaaS modernes, calcule automatiquement les prévisions sur 12 mois et affiche un tableau, des KPI synthétiques et un graphique dynamique.  
Les données sont sauvegardées en **localStorage** et peuvent être réinitialisées à tout moment.

---

## Fonctionnalités

- **Saisie des paramètres business** : objectif CA, prix moyen, leads mensuels, taux de conversion, saisonnalité, cycle de vente, coûts, etc.
- **Calcul automatique en temps réel** des prévisions mensuelles et annuelles.
- **KPI synthétiques** : CA total, écart vs objectif, leads/clients nécessaires.
- **Tableau détaillé** par mois (Leads, RDV, Shows, Clients, CA mensuel, Cumul CA).
- **Graphique dynamique** en Canvas (CA mensuel + cumul vs objectif).
- **Recommandations** pour atteindre ou dépasser l’objectif.
- **Sauvegarde locale** via `localStorage`.
- **Interface responsive** optimisée pour desktop, tablette et mobile.
- **Mode offline** : aucun backend requis.
- **Prêt au déploiement** sur Netlify, Vercel ou GitHub Pages.

---

## Technologies utilisées

- **HTML5** — Structure sémantique et formulaires
- **CSS3** — Flexbox, variables CSS, responsive design
- **JavaScript ES6+** — Calculs dynamiques, gestion du DOM, Canvas API
- **localStorage** — Persistance des données côté client

---
