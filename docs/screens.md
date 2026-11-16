# Écrans et navigation V1

> Références : `data-model.md` (tables), `design-system.md` (tokens, composants, formats). Les libellés d'interface sont en anglais, comme dans l'app. Tous les écrans fonctionnent hors ligne : les données sont locales, donc il n'y a pas d'état de chargement réseau.

## 1. Navigation

### 1.1 Onglets (TabBar)

La TabBar est la barre d'onglets native d'iOS (`NativeTabs` d'Expo Router, effet verre sur iOS 26). Ses icônes sont donc des SF Symbols ; lucide reste la bibliothèque d'icônes du contenu des écrans.

| Onglet | Icône (SF Symbol) | Écran racine |
| --- | --- | --- |
| `Today` | `sun.max` | S1 Today |
| `Calendar` | `calendar` | S2 Calendar |
| `Programs` | `square.stack.3d.up` | S7 Programs |
| `Library` | `book` | S11 Library |
| `Progress` | `chart.line.uptrend.xyaxis` | S12 Progress |

Les réglages (S13) s'ouvrent depuis l'icône `settings` en haut à droite de Today.

### 1.2 Arborescence (Expo Router)

```
src/app/
  _layout.tsx                    # Theme, fonts, DB init, onboarding gate
  onboarding.tsx                 # S0
  (tabs)/
    _layout.tsx                  # TabBar
    index.tsx                    # S1 Today
    calendar.tsx                 # S2 Calendar
    programs.tsx                 # S7 Programs
    library.tsx                  # S11 Library
    progress.tsx                 # S12 Progress
  session/[scheduledSessionId].tsx   # S3 Session (planned)
  workout/[workoutId].tsx            # S3 Session (free workout)
  log/[exerciseLogId].tsx            # S4 Exercise (timer + log) et S5 Log (modal)
  program/[programId]/index.tsx      # S8 Program detail
  program/[programId]/edit.tsx       # S9 Program editor
  program/[programId]/grid.tsx       # S9b Grid view
  exercise/[exerciseId].tsx          # S11b Exercise detail
  settings.tsx                       # S13
```

Bottom sheets (non routées) : `AddExerciseSheet` (S6), `PrescriptionSheet` (S10), `EnrollSheet`, `ShiftSheet`, `FilterSheet`, `DaySheet`.

### 1.3 Règles globales

| Règle | Détail |
| --- | --- |
| Séance en cours | Si un workout est commencé et non terminé, une barre persistante s'affiche au-dessus de la TabBar : nom de la séance, durée écoulée, bouton `Resume`. Elle survit à la fermeture de l'app. |
| Timer actif | Si un timer tourne, la barre affiche la phase et le décompte ; un tap rouvre S4. |
| Modifications non enregistrées | Quitter un éditeur ou un log modifié ouvre une confirmation `Discard changes?` (`Discard` / `Keep editing`). |
| Suppression | Toujours confirmée ; suppression douce (`deleted_at`). |
| Orientation | Portrait uniquement. |
| Écran allumé | `expo-keep-awake` actif sur S3 (séance en cours), S4 et S5. |

## 2. Écrans

### S0 Onboarding (premier lancement)

Un seul écran, défilant.

| Champ | Composant | Défaut | Obligatoire |
| --- | --- | --- | --- |
| Name | Champ texte | | Oui |
| Weight unit | SegmentedControl `kg` / `lbs` | `kg` | Oui |
| Boulder grades | SegmentedControl `Font` / `V-scale` | `Font` | Oui |
| Route grades | SegmentedControl `French` / `YDS` | `French` | Oui |
| Bodyweight | Stepper décimal | vide | Non (texte d'aide : "Used to show hangs as % of bodyweight") |

Action : `Get started` crée le `user_profile` et ouvre Today. Le seed (bibliothèque, coach factice, programme de démo) est déjà en base au premier lancement de l'app.

### S1 Today

**En-tête** : date du jour (`Mon 12 Jan`, style `title1`), icône réglages.

**Contenu, de haut en bas :**

1. **Today's sessions** : une carte par `scheduled_session` du jour, triées par programme puis `sort`.
   - Ligne 1 : `ProgramDot`, `Week 3 · Day 2`, nom du programme, `Badge` de statut.
   - Ligne 2 : nom de la séance (ou "Session" si vide), badge `TEST` si `is_test`.
   - Liste des exercices : pastille de catégorie, nom, `DosageSummary`, charge résolue à droite.
   - Bouton : `Start session` (planned), `Resume` (workout en cours), `View` (done).
   - Tap sur la carte : ouvre S3.
2. **Free session** : si un workout libre existe aujourd'hui, carte du même format.
3. Bouton secondaire `Add exercise` : ouvre S6, ajoute au workout libre du jour (créé si besoin).
4. **Missed** (section repliée par défaut, visible seulement s'il y en a) : séances manquées des 7 derniers jours. Un tap ouvre S3.
5. **This week** : deux petites stats côte à côte, `Sessions` (`3 / 5` faites / prévues cette semaine) et `Last max hang` (valeur et prise de la dernière référence, ou `No test yet`).

**État vide** (aucune séance aujourd'hui) : `EmptyState` avec l'icône `moon`, le titre `Rest day` et le texte `Next: Wed 14 Jan · Finger strength`, ou `No session planned` s'il n'y a rien à venir. Le bouton `Add exercise` reste visible.

**Aucun programme actif** : `EmptyState` avec le titre `Start a program`, le texte `Create your own or follow one from your coach.` et le bouton `Go to programs`.

### S2 Calendar

**En-tête** : titre de la période (`12–18 Jan` ou `January 2026`), flèches précédent / suivant, bouton `Today`, SegmentedControl `Week` / `Month`.

**Filtre** : rangée de `Chip` (un par programme actif, avec sa couleur) + `Free sessions`. Tous actifs par défaut.

**Vue semaine** (défaut) : 7 lignes, lundi en premier.
- Chaque ligne : jour (`Mon 12`), puis une ligne par séance (`ProgramDot`, nom, `Badge`), et les workouts libres (`Free session`).
- Le jour courant est mis en évidence (fond `accentSubtle`).
- Tap sur une séance : S3. Tap sur un jour vide : rien.
- Glisser horizontalement : semaine précédente / suivante.

**Vue mois** : grille de 7 colonnes (L à D).
- Chaque case : numéro du jour, et jusqu'à 3 pastilles (couleur du programme ; pastille pleine = faite, contour = prévue, gris = manquée) ; `+2` au-delà.
- Tap sur un jour : `DaySheet` qui liste les séances et workouts du jour, chacun ouvrant S3.

### S3 Session

Même écran pour une séance prévue (`scheduled_session`) et pour un workout libre.

**En-tête** : nom du programme et `ProgramDot`, `Week 3 · Day 2`, date prévue, `Badge` de statut. Pour un workout libre : `Free session` et la date.

**Bandeau de date** (si la séance est logué ou en cours) : `Performed on Thu 14 Jan` (modifiable via un sélecteur de date ; défaut = aujourd'hui).

**Liste des exercices** : une `Card` par prescription, dans l'ordre.

| Élément | Contenu |
| --- | --- |
| Titre | Pastille catégorie, nom de l'exercice, `TEST` si test |
| Résumé | `DosageSummary` complet : dosage, bord, prise, côté |
| Charge | Résolue selon §3.1 |
| Note | Note de l'auteur, en `bodySm` italique, si présente |
| État | `To do`, `Done` (coche `success`), `Partial` (si des sets échoués) |
| Actions | `Start` (ouvre S4 et lance le timer) ; `Log` (ouvre S5, sans timer) est toujours accessible via le menu de la carte |

En bas de liste : `Add exercise` (S6, ajoute un exercice libre à ce workout).

**Bouton principal** : `Start session` (crée le workout, `started_at = now`), puis `Finish session` une fois commencé (`ended_at = now`, retour à l'écran précédent, toast `Session saved`).

**Règles :**

| Situation | Comportement |
| --- | --- |
| Logguer un exercice sans avoir appuyé sur `Start session` | Le workout est créé automatiquement, sans `started_at` (la séance passe directement à `done`) |
| Séance passée (manquée) | Loguable normalement ; `performed_on` = aujourd'hui, modifiable ; la séance reste à sa date prévue dans le calendrier |
| Séance future | Loguable aussi ; confirmation `Log this session early?` |
| `Finish session` avec des exercices non faits | Confirmation `2 exercises not logged. Finish anyway?` ; les exercices non faits restent `To do` |
| Séance terminée | Les exercices restent modifiables (réouvrir S5) |
| Supprimer le workout | Menu `Delete log` : supprime workout, exercise_logs et set_logs ; la séance redevient `planned` ou `missed` |

### S4 Exercise (timer + log)

Modal plein écran. Le timer et le log partagent **un seul écran** : le timer en haut, les sets en dessous, pour corriger une valeur pendant un repos sans changer d'écran. La mécanique (machine à états, audio, reprise) est décrite dans `timer.md`.

**Zone timer** (haut de l'écran, environ 40 % de la hauteur, fond de la couleur de la phase) :

| Élément | Contenu | Style |
| --- | --- | --- |
| Barre haute | Bouton fermer (`chevron-down`), phase (`GET READY`, `HANG`, `OFF`, `REST`, `SWITCH`, `DONE`), bouton son (`volume-2` / `volume-x`) | `title2`, couleur de texte de la phase |
| Côté (si unilatéral) | `LEFT` ou `RIGHT` avec une flèche, à gauche du décompte | `displayM` |
| Décompte | Temps restant (`7`, `2:41`), ou chrono montant pour une étape manuelle | `timerCompact` (96 pt) |
| Commandes | `Back` (étape précédente), `Pause` / `Resume` (centre, 64 pt), `Skip` (étape suivante) ; `+30s` pendant `REST` ; `Set done` / `Round done` à la place de `Skip` sur une étape manuelle | `IconButton` |
| Progression | Barre fine (3 pt) sur toute la largeur : avancement de l'étape en cours | `fg` de la phase à 40 % |
| Suivant | `Up next: OFF 3s`, `Up next: Set 4 · HANG 7s`, `Up next: Rest 3:00` | `bodySm`, sur `surfaceRaised` |

- Fondu de 320 ms entre les couleurs de phase.
- Le bouton son coupe ou rétablit les sons du timer (même réglage que `Sounds` dans S13).
- **Mode focus** : un tap sur le décompte agrandit la zone timer en plein écran (décompte en `timer` 160 pt, phase et côté en `displayL`, contexte `Set 3/6 · Rep 2/5`, charge, prise, bord). Un nouveau tap revient à la vue partagée. C'est le mode à utiliser quand le téléphone est posé loin de la poutre.

**Zone log** (bas de l'écran, défilante) : les mêmes blocs que S5 (en-tête d'exercice, paramètres, sets, effort, notes), avec ces particularités pendant que le timer tourne :

| Élément | Comportement |
| --- | --- |
| En-tête d'exercice | Pastille de catégorie, nom, `DosageSummary` ; repliable pour gagner de la place |
| Set en cours | `SetRow` avec bordure 2 pt `accent` ; la liste défile automatiquement pour le garder visible |
| Set terminé | Numéro du set sur pastille pleine `success` ; valeurs réelles inscrites par le timer (reps complètes, durée tenue) |
| Set à venir | Valeurs pré-remplies en `textSecondary` |
| Modification | Toutes les lignes restent modifiables pendant le timer ; une valeur modifiée à la main n'est plus écrasée par le timer |
| `Skip set` | Retire le dernier set à venir ; le timer s'adapte |
| `Add set` | Ajoute un set après le dernier ; le timer s'adapte |

**Bouton principal** : `Save` (bas d'écran, fixe). Pendant que le timer tourne, il devient `Stop and save` avec confirmation `Stop timer?` (`Stop and save` / `Keep going`).

**Fin et fermeture :**

| Situation | Comportement |
| --- | --- |
| Fin normale | Phase `DONE` pendant 2s, puis la zone timer se replie : l'écran devient S5, avec les sets déjà remplis. L'athlète ajuste, saisit l'effort, puis `Save` |
| Fermer (`chevron-down`) pendant le timer | Le timer continue ; la barre persistante affiche la phase et le décompte, un tap rouvre S4 |
| Écran verrouillé ou app en arrière-plan | Une Live Activity affiche le timer (voir `timer.md` §8) |

### S5 Log exercise

Même écran et même route que S4, sans la zone timer : c'est l'état de S4 quand aucun timer ne tourne pour cet exercice. Ouvert depuis S3 (`Log`, ou réouverture d'un exercice déjà logué), depuis S6 pour un schéma sans timer, ou atteint à la fin du timer.

**En-tête** : nom de l'exercice, résumé de la prescription (`Prescribed: 7s × 5 × 6 · +5 kg`) ou `Free exercise`.

**Bloc paramètres** (affiché seulement pour les mesures déclarées par l'exercice) : prise (`GripPicker`), bord (`Stepper` mm), support, charge (`Stepper` en unité de l'utilisateur). Modifier un paramètre propose `Apply to all sets`.

**Bloc sets** : dépend du schéma.

| Schéma | Disposition |
| --- | --- |
| `reps` | Une `SetRow` par set : reps (Stepper), charge (Stepper), résultat (toggle ✓ / ✗) |
| `isometric` | Une `SetRow` par set : durée tenue (Stepper s), charge, résultat |
| `intervals` | Une `SetRow` par set : reps réussies sur la cible (`5/5`, Stepper), charge, résultat |
| `circuit` | Grille tours × blocs : chaque case = cotation (sélecteur) + ✓ / ✗ |
| `slots` | Une ligne par créneau : cotation + ✓ / ✗ ; bouton `Add slot` |
| `free_duration` | Durée totale (Stepper min) ; liste facultative de blocs réussis (cotation), bouton `Add climb`, pas de limite |

- Unilatéral alterné : les lignes vont par paires `L` / `R` pour chaque set.
- Bouton `Add set` sous la liste (sauf `circuit`).
- Glisser une ligne vers la gauche : `Delete`.

**Effort** : `EffortPicker` sur l'échelle de la prescription (ou celle par défaut de l'exercice).

**Notes** : champ texte facultatif.

**Bouton principal** : `Save`. Il enregistre `exercise_log` + `set_log`, ferme le modal et revient à S3.

**Test** : si la prescription est un test, l'enregistrement crée une `reference` à partir du meilleur set réussi, puis affiche le toast `New reference: +24 kg · 20 mm · 4F HC`.

**Validation :**

| Champ | Contrainte |
| --- | --- |
| Reps | 0 à 100 |
| Durée | 0 à 3600 s |
| Charge | −100 à +200 kg |
| Bord | 4 à 60 mm |
| Effort | Dans la plage de l'échelle |

### S6 Add exercise (bottom sheet)

1. Recherche dans la bibliothèque (même liste et mêmes filtres que S11, en mode sélection).
2. Après sélection : formulaire de dosage rapide (identique à S10, sans les options de test ni de progression), pré-rempli avec la dernière réalisation de cet exercice, sinon avec des valeurs par défaut par schéma (§3.3).
3. `Add` : crée un `exercise_log` sans prescription dans le workout ciblé, puis ouvre S4 et lance le timer.

### S7 Programs

Trois sections :

| Section | Contenu | Actions par ligne |
| --- | --- | --- |
| `Active` | Inscriptions actives : `ProgramDot`, nom, auteur (`by Coach Alex` ou `by you`), progression `Week 3 of 8`, barre de progression | Menu : `Shift weeks`, `Pause` (ou `Resume` si en pause, avec un badge `PAUSED`), `Stop` |
| `My programs` | Programmes dont je suis l'auteur, sans inscription active | `Enroll`, `Edit`, `Duplicate`, `Delete` |
| `Archived` | Inscriptions arrêtées ou terminées (repliée) | `Enroll again` |

Bouton principal : `New program` (ouvre S9 sur un programme vide d'une semaine).

**EnrollSheet** : sélecteur de date limité aux lundis (le lundi qui vient par défaut, la semaine en cours autorisée), choix de la couleur (`ProgramDot`), bouton `Enroll`. Il crée l'`enrollment` et ses `scheduled_session`.

**ShiftSheet** : `From week` (sélecteur, défaut = semaine en cours), `Shift by` (Stepper, de −4 à +8 semaines), aperçu `Week 4 will start on Mon 2 Feb`, bouton `Shift`. Les séances déjà loguées ne bougent pas.

**Pause / Resume** : `Pause` garde l'inscription et enregistre `paused_at` = aujourd'hui. Les séances non loguées à partir de cette date sont masquées dans Today et Calendar, ne passent jamais en `missed` et ne comptent pas dans l'assiduité. `Resume` ouvre la `ShiftSheet` pré-remplie : `From week` = semaine de la mise en pause, `Shift by` = nombre de semaines entières écoulées depuis (sans le plafond de +8). L'athlète peut ajuster ; avec 0, le programme reprend à sa place et les séances sautées pendant la pause apparaissent `missed`.

**Stop** : `Stop` passe l'inscription en `archived` et supprime ses `scheduled_session` futures sans workout.

### S8 Program detail

- **En-tête** : nom, auteur, durée (`8 weeks`), description.
- **Phases** : bande horizontale proportionnelle aux semaines, une couleur par phase, avec son nom ; les phases test portent le badge `TEST`.
- **Semaines** : liste repliable (`Week 1` à `Week N`). Dépliée, une semaine affiche ses 7 jours ; chaque jour liste ses séances avec leurs exercices (`DosageSummary`).
- **Actions** : `Edit` (S9, si je suis l'auteur), `Grid view` (S9b), `Enroll` (si non inscrit).
- **Programme d'un coach** : lecture seule pour l'athlète, sans bouton `Edit` ; `Duplicate` permet d'en faire une copie personnelle.

### S9 Program editor

**Infos** : nom, description, nombre de semaines (Stepper 1 à 52 ; réduire supprime les semaines en fin de programme après confirmation).

**Phases** : liste ; `Add phase` ouvre un formulaire (nom, semaine de début, semaine de fin, `Test phase`). Deux phases ne peuvent pas se chevaucher.

**Semaines** : une semaine à la fois, avec des onglets ou un sélecteur `Week 1 ▾`.
- 7 lignes de jours (`Mon` à `Sun`). Chaque jour a ses séances, et `+` pour en ajouter une.
- Menu de semaine : `Duplicate to next week`, `Duplicate to…` (choix de semaines), `Clear week`.

**Éditeur de séance** (plein écran) :
- Nom (facultatif), `Test session` (toggle), notes.
- Liste des prescriptions, réordonnables par glisser-déposer.
- `Add exercise` ouvre la bibliothèque en mode sélection, puis S10.
- Menu d'une prescription : `Edit`, `Duplicate`, `Apply progression`, `Delete`.
- Menu de séance : `Duplicate to…` (jour et semaine), `Delete`.

**Apply progression** (sheet) :

| Champ | Valeurs |
| --- | --- |
| Rule | `+ kg per week`, `+ % per week`, `% of reference` |
| Value | Stepper |
| Weeks | De la semaine courante +1 à N (défaut : jusqu'à la fin de la phase, sinon du programme) |

Résultat : pour chaque semaine cible, la prescription du même exercice au même jour est créée ou mise à jour avec la valeur calculée. Un aperçu (`Week 4: +7 kg · Week 5: +9 kg …`) s'affiche avant `Apply`.

**Programme avec inscription active** : enregistrer régénère les `scheduled_session` futures sans workout, puis affiche le toast `Changes apply to upcoming sessions`.

### S9b Grid view

Vue tableau pour ajuster rapidement la progression.

- **Lignes** : une par couple (jour de la semaine, exercice), par exemple `Mon · Repeaters`.
- **Colonnes** : les semaines.
- **Cellule** : valeur clé de la prescription (charge, ou sets × reps si pas de charge) ; vide si absente cette semaine-là.
- Un tap sur une cellule ouvre S10 pour cette prescription. Défilement horizontal, première colonne figée.

### S10 Prescription editor (sheet)

Champs affichés selon le schéma de l'exercice et ses mesures déclarées :

| Groupe | Champs |
| --- | --- |
| Dosage | Selon §7 de `data-model.md` (Steppers) |
| Charge | SegmentedControl `None` / `Absolute` / `Added` / `Assisted` / `% ref`, puis Stepper |
| Prise | `GripPicker` |
| Support | Bord (mm), libellé de support |
| Côté | `Both` / `Left` / `Right` / `Alternate` (si `unilateral_allowed`) |
| Autres | Tempo, cotation cible, effort cible (si déclarés) |
| Effort | Échelle (`RPE` / `RIR` / `Feel`) |
| Test | Toggle `Test` (si `is_testable`) |
| Note | Texte libre |

Un aperçu `DosageSummary` est affiché en haut et mis à jour en direct. Le bouton est `Save`.

### S11 Library

- **Barre de recherche** (nom, insensible aux accents et à la casse).
- **Filtres** : bouton `Filters` (badge du nombre de filtres actifs) qui ouvre `FilterSheet` : catégorie, muscles, équipement, schéma, favoris. Filtres cumulables (ET entre groupes, OU à l'intérieur d'un groupe).
- **Groupement** : SegmentedControl `Category` / `Muscle` / `A–Z`.
- **Ligne** : pastille catégorie, nom, schéma et équipement en `bodySm`, étoile favori à droite.
- **Mode sélection** (depuis S6 / S9) : un tap sélectionne l'exercice au lieu d'ouvrir le détail.

**État vide** (aucun résultat) : `No exercises match` + bouton `Clear filters`.

> Favoris : ajout d'une table `exercise_favorite (user_id, exercise_id)` au modèle de données.

### S11b Exercise detail

Média (emplacement réservé, ratio 16:9), nom, catégorie, schéma, description, instructions, muscles (principaux puis secondaires), équipement.

Sections dynamiques :
- **History** : les 5 dernières réalisations (date, résumé, charge), et `See all` qui ouvre l'historique dans S12.
- **References** (si `is_testable`) : dernières références par combinaison.

### S12 Progress

1. **Max hangs** (premier bloc, toujours visible)
   - Sélecteur de combinaison : prise × bord × durée (par défaut, la plus utilisée).
   - Graphique en courbe : charge dans le temps (tous les sets réussis des exercices isométriques de cette combinaison, meilleur set par jour), avec les références marquées par un losange.
   - Toggle `kg` / `% BW` (visible seulement si le poids de corps est renseigné).
   - Sous le graphique : record (`Best: +26 kg · 3 Feb`) et progression sur 8 semaines (`+4 kg`).
2. **Exercise history** : recherche d'un exercice, puis la liste de toutes ses réalisations (plus récentes en premier), avec un badge `PR` sur le record.
3. **Consistency** : barres hebdomadaires sur les 8 dernières semaines (séances faites / prévues).

**État vide** : `No hangs logged yet` + `Log a max hang test to start tracking.`

### S13 Settings

| Section | Réglages |
| --- | --- |
| Profile | Name, Bodyweight (facultatif) |
| Units | Weight `kg` / `lbs`, Boulder grades, Route grades |
| Appearance | Theme `Dark` / `Light` / `System` (défaut `Dark`) |
| Timer | Get ready countdown (5 à 30 s, défaut 10), Side switch rest (5 à 30 s, défaut 10), Sound volume (curseur), Sounds on/off, Haptics on/off |
| Data | `Export backup` (fichier JSON de toutes les données via la feuille de partage iOS), `Import backup` (remplace les données après confirmation) |
| About | Version |

> **Ajout recommandé** : comme la V1 est 100 % locale, l'export / import JSON est la seule protection contre la perte du téléphone. C'est un petit effort et il faut le garder dans la V1.

## 3. Règles transverses

### 3.1 Résolution de la charge affichée

| `load_mode` | Affichage |
| --- | --- |
| `none` | Valeur pré-remplie du dernier log si elle existe (`+5 kg · last`), sinon rien |
| `absolute` | `40 kg` |
| `added` | `+5 kg` |
| `assisted` | `−10 kg` |
| `percent_reference` | Avec référence : `+19 kg (80% ref)` ; sans référence : `80% ref · no test yet` |

Les calculs en % sont arrondis à 0.5 kg (ou à 1 lb).

### 3.2 Statuts d'une séance

| Statut | Condition | Badge |
| --- | --- | --- |
| `planned` | Date ≥ aujourd'hui, pas de workout | Aucun (ou `TODAY`) |
| `in_progress` | Workout avec `started_at` et sans `ended_at` (prioritaire sur `done`) | `IN PROGRESS` (accent) |
| `done` | Workout terminé, ou workout jamais commencé avec au moins un exercice logué | `DONE` (`success`) |
| `missed` | Date < aujourd'hui, pas de workout | `MISSED` (`missed`, gris) |

Les séances masquées par une pause (S7) n'ont aucun statut tant que l'inscription est en pause.

### 3.3 Valeurs par défaut d'un exercice libre (sans historique)

| Schéma | Défaut |
| --- | --- |
| `reps` | 3 × 8, repos 2:00 |
| `isometric` | 10s × 6, repos 3:00 |
| `intervals` | 7s:3s × 5 × 6, repos 3:00 |
| `circuit` | 4 blocs × 4 tours, repos 4:00 |
| `slots` | 3:00 × 10 |
| `free_duration` | 60:00 |

### 3.4 Toasts standard

| Événement | Texte |
| --- | --- |
| Log enregistré | `Exercise logged` |
| Séance terminée | `Session saved` |
| Nouvelle référence | `New reference: +24 kg · 20 mm · 4F HC` |
| Programme modifié avec inscription | `Changes apply to upcoming sessions` |
| Décalage | `Program shifted by 2 weeks` |
| Export | `Backup exported` |
