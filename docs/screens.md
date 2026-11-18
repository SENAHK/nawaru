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
  add-exercise.tsx                   # S6 Add exercise (modal)
  settings.tsx                       # S13
```

S6 est une route présentée en modal (feuille native iOS) : elle enchaîne deux étapes (recherche, puis dosage) et se remplace par S4 à la fin, ce qui est plus simple avec Expo Router qu'une feuille non routée.

Bottom sheets (non routées, `Sheet` = feuille native `pageSheet`) : `GripSheet` et `GradeSheet` (S5), `PrescriptionSheet` (S10), `EnrollSheet`, `ShiftSheet`, `FilterSheet`, `DaySheet`.

### 1.3 Règles globales

| Règle | Détail |
| --- | --- |
| Séance en cours | Si un workout est commencé et non terminé, une barre persistante s'affiche au-dessus de la TabBar : nom de la séance, durée écoulée, bouton `Resume`. Elle survit à la fermeture de l'app. C'est le `BottomAccessory` natif de la TabBar (iOS 26+) ; il se réduit dans la TabBar quand on fait défiler. Avant iOS 26, un bouton `Resume` en haut de Today le remplace pour le timer. |
| Timer actif | Si un timer tourne, la barre affiche la phase et le décompte ; un tap rouvre S4. Un timer terminé mais pas encore enregistré affiche `Tap to save`. |
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

Action : `Get started` crée le `user_profile`, inscrit l'athlète aux programmes de son coach (début le lundi de la semaine en cours) et ouvre Today. Le seed (bibliothèque, coach factice, programme de démo) est déjà en base au premier lancement de l'app.

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

**En-tête** : titre de la période (`12–18 Jan` ou `January 2026`) et flèches précédent / suivant ; en dessous, SegmentedControl `Week` / `Month` et bouton `Today`.

**Filtre** : rangée de `Chip` (un par programme actif, avec sa couleur) + `Free sessions`. Tous actifs par défaut.

**Vue semaine** (défaut) : 7 lignes, lundi en premier.
- Chaque ligne : jour (`Mon 12`), puis une ligne par séance (`ProgramDot`, nom, `Badge`), et les workouts libres (`Free session`).
- Le jour courant est mis en évidence (fond `accentSubtle`).
- Tap sur une séance : S3. Tap sur un jour vide : rien.
- Glisser horizontalement : semaine précédente / suivante. **Pas encore fait** : les flèches de l'en-tête suffisent pour l'instant (Gesture Handler 3 a changé d'API et l'app n'a pas encore de `GestureHandlerRootView`).
- Une séance loguée reste à sa date prévue ; un workout libre apparaît à sa date de réalisation.

**Vue mois** : grille de 7 colonnes (L à D).
- Chaque case : numéro du jour, et jusqu'à 3 pastilles (couleur du programme ; pastille pleine = faite, contour = prévue, gris = manquée) ; `+2` au-delà.
- Tap sur un jour : `DaySheet` qui liste les séances et workouts du jour, chacun ouvrant S3.

### S3 Session

Même écran pour une séance prévue (`scheduled_session`) et pour un workout libre.

**En-tête** : nom du programme et `ProgramDot`, `Week 3 · Day 2`, date prévue, `Badge` de statut. Pour un workout libre : `Free session` et la date.

**Bandeau de date** (si la séance est loguée ou en cours) : `Performed on Thu 14 Jan`, modifiable avec le `DatePicker` natif (`@expo/ui/swift-ui`, dates futures exclues ; défaut = aujourd'hui).

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
| Supprimer le workout | Icône corbeille de l'en-tête (`Delete log`, confirmée) : supprime workout, exercise_logs, set_logs et les références qu'ils ont créées ; la séance redevient `planned` ou `missed` et peut être loguée à nouveau. Un workout libre supprimé ferme l'écran |

### S4 Exercise (timer + log)

Modal plein écran. Le timer et le log partagent **un seul écran** : le timer en haut, les sets en dessous, pour corriger une valeur pendant un repos sans changer d'écran. La mécanique (machine à états, audio, reprise) est décrite dans `timer.md`.

**Zone timer** (haut de l'écran, environ 40 % de la hauteur, fond de la couleur de la phase) :

| Élément | Contenu | Style |
| --- | --- | --- |
| Barre haute | Bouton fermer (`chevron-down`), phase (`GET READY`, `HANG`, `OFF`, `REST`, `SWITCH`, `DONE`), bouton son (`volume-2` / `volume-x`) | `title2`, couleur de texte de la phase |
| Côté (si unilatéral) | `LEFT` ou `RIGHT` avec une flèche, à gauche du décompte | `displayM` |
| Décompte | Temps restant (`7`, `2:41`). Sur une étape manuelle (exercice à reps, tour de circuit), pas de chrono : le nombre à faire en grand (`5`) avec son unité dessous (`REPS`, `CLIMBS`) | `timerCompact` (96 pt) |
| Commandes | `Back` (étape précédente), `Pause` / `Resume` (centre, 64 pt), `Skip` (étape suivante) ; `+30s` pendant `REST`. Sur une étape manuelle, le bouton central devient une coche (`Set done` / `Round done`), entre `Back` et `Skip` | `IconButton` |
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

**Bloc paramètres** (affiché seulement pour les mesures déclarées par l'exercice) : prise (`GripPicker`), bord (`Stepper` mm), charge (`Stepper` en unité de l'utilisateur). La charge modifiée ici s'applique aux sets encore à faire ; si des sets sont déjà faits, un bouton `Apply to all sets` l'applique aussi à ceux-là. Le support (`support_label`) est conservé depuis la prescription mais pas encore modifiable.

**Stepper** : un tap sur la valeur ouvre une saisie au clavier (`2:30` accepté pour les durées) ; un appui long sur − ou + répète.

**Bloc sets** : dépend du schéma.

| Schéma | Disposition |
| --- | --- |
| `reps` | Une `SetRow` par set : reps (Stepper), charge (Stepper), résultat (toggle ✓ / ✗) |
| `isometric` | Une `SetRow` par set : durée tenue (Stepper s), charge, résultat |
| `intervals` | Une `SetRow` par set : reps réussies sur la cible (`5/5`, Stepper), charge, résultat |
| `circuit` | Grille tours × blocs : chaque case = cotation (sélecteur) + ✓ / ✗ ; bouton `Add round` |
| `slots` | Une ligne par créneau : cotation + ✓ / ✗ ; boutons `Skip slot` / `Add slot` |
| `free_duration` | Durée totale (Stepper min) ; liste facultative de blocs réussis (cotation), bouton `Add climb`, pas de limite. Un bloc se retire depuis sa feuille de cotation (`Remove climb`) |

Cotations : `GradeSheet`, grille de pastilles dans le système de bloc de l'athlète (`Font` ou `V-scale`), puisque les exercices d'escalade de la bibliothèque sont des blocs. Un tap sur la cotation choisie l'efface.

- Unilatéral alterné : les lignes vont par paires `L` / `R` pour chaque set.
- Boutons `Skip set` (retire le dernier set non fait) et `Add set` sous la liste.
- Pas de suppression par glissement pour l'instant : `Skip set` la remplace.

**Effort** : `EffortPicker` sur l'échelle de la prescription (ou celle par défaut de l'exercice) : une rangée de pastilles défilante (RPE 1 à 10 par 0.5, RIR 0 à 5, Feel stocké de 1 = Easy à 5 = Max). Un tap sur la pastille choisie l'efface.

**Notes** : champ texte facultatif.

**Bouton principal** : `Save`. Il enregistre `exercise_log` (prise, bord, effort, notes) + `set_log`, ferme le modal, revient à S3 et affiche le toast `Exercise logged`. Fermer avec `X` ne demande `Discard changes?` que si quelque chose a changé.

**Test** : si la prescription est un test, l'enregistrement crée une `reference` à partir du meilleur set réussi, puis affiche le toast `New reference: +24 kg · 20 mm · 4F HC`.

**Validation :**

| Champ | Contrainte |
| --- | --- |
| Reps | 0 à 100 |
| Durée | 0 à 3600 s |
| Charge | −100 à +200 kg |
| Bord | 4 à 60 mm |
| Effort | Dans la plage de l'échelle |

### S6 Add exercise (modal)

Ouvert depuis Today (workout libre du jour), depuis S3 (`Add exercise` en bas de liste : ce workout, créé si besoin) ou depuis S11b (`Add to today`, qui passe directement à l'étape 2).

1. Recherche dans la bibliothèque : la liste de S11 en mode sélection, avec recherche, filtres, groupement et favoris.
2. Après sélection : formulaire de dosage rapide (identique à S10, sans les options de test ni de progression), pré-rempli avec la dernière réalisation de cet exercice (dosage et meilleure charge réussie), sinon avec des valeurs par défaut par schéma (§3.3). La ligne d'aide indique `Pre-filled from your last time` ou `Default values`. Bouton `Change exercise` pour revenir à la liste.
3. Deux boutons : `Add` crée un `exercise_log` sans prescription dans le workout ciblé, ferme la feuille et affiche le toast `Pull-ups added` ; `Add and start` le crée puis ouvre S4 et lance le timer.

### S7 Programs

Trois sections :

| Section | Contenu | Actions par ligne |
| --- | --- | --- |
| `Active` | Inscriptions actives : `ProgramDot`, nom, auteur (`by Coach Alex` ou `by you`), progression `Week 3 of 8` (semaine prévue de la dernière séance passée, donc juste après un décalage ; `Starts Mon 23 Nov` avant le début), barre de progression | Bouton `…` : feuille d'actions native `Shift weeks`, `Pause` (ou `Resume` si en pause, avec un badge `PAUSED`), `Stop` (confirmé) |
| `My programs` | Programmes dont je suis l'auteur, sans inscription active | `Enroll`, `Edit`, `Duplicate`, `Delete` |
| `Archived` | Inscriptions arrêtées ou terminées (repliée) | `Enroll again` |

Bouton principal : `New program` (ouvre S9 sur un programme vide d'une semaine). Il arrive avec l'éditeur de programme, comme `Edit`, `Duplicate` et `Delete` dans `My programs`, et l'ouverture de S8 au tap sur une ligne.

**EnrollSheet** : pastilles des 9 prochains lundis (`This week · Mon 16 Nov`, puis les suivants ; le lundi qui vient par défaut, ou aujourd'hui si on est lundi), choix de la couleur (la première non utilisée par défaut), bouton `Enroll`. Il crée l'`enrollment` et ses `scheduled_session`. Une seule inscription active ou en pause par programme.

**ShiftSheet** : `From week` (pastilles des semaines du programme, défaut = semaine en cours), `Shift by` (Stepper, de −4 à +8 semaines), aperçu `Week 4 will start on Mon 2 Feb`, bouton `Shift`. Toutes les séances non loguées de cette semaine et des suivantes bougent, y compris celles déjà passées (c'est ce qui permet de rattraper une pause) ; les séances déjà loguées ne bougent pas.

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
- **Filtres** : bouton à icône à droite de la recherche (badge du nombre de valeurs actives) qui ouvre `FilterSheet` : favoris, catégorie, schéma (`Structure`), muscles, équipement ; seuls les muscles et équipements utilisés par la bibliothèque sont proposés. Filtres cumulables (ET entre groupes, OU à l'intérieur d'un groupe). Bouton `Clear` dans la feuille.
- **Groupement** : SegmentedControl `Category` / `Muscle` / `A–Z`. Par muscle, un exercice apparaît sous chacun de ses muscles principaux (`Other` s'il n'en a pas).
- **Ligne** : pastille catégorie, nom, schéma et équipement en `bodySm`, étoile favori à droite (un tap l'active ou la retire, sans ouvrir le détail).
- **Mode sélection** (depuis S6 / S9) : même liste (composant `LibraryList`), un tap sélectionne l'exercice au lieu d'ouvrir le détail.
- Changer la recherche, les filtres ou le groupement remonte la liste en haut, pour que les premiers résultats restent visibles.
- Recherche, filtres et groupement ne sont pas mémorisés d'une ouverture à l'autre.

**État vide** (aucun résultat) : `No exercises match` + bouton `Clear filters` (vide aussi la recherche).

> Favoris : table `exercise_favorite (user_id, exercise_id)` du modèle de données.

### S11b Exercise detail

Média (emplacement réservé, ratio 16:9), nom, catégorie, schéma, description, instructions, muscles (principaux puis secondaires), équipement. Étoile favori dans l'en-tête, bouton `Add to today` (ouvre S6 à l'étape du dosage).

Sections dynamiques :
- **History** : les 5 dernières réalisations (date, résumé, charge), et `See all` qui ouvre l'onglet Progress sur l'historique de cet exercice.
- **References** (si `is_testable`) : dernières références par combinaison.

### S12 Progress

1. **Max hangs** (premier bloc, toujours visible)
   - Sélecteur de combinaison : prise × bord × durée (par défaut, la plus utilisée), en pastilles ; une seule combinaison s'affiche en texte. La durée est celle de la prescription (`exercise_log.duration_s`).
   - Graphique en courbe : charge dans le temps (tous les sets réussis des exercices isométriques de cette combinaison, meilleur set par jour), avec les références marquées par un losange. Un tap (ou un glissé) sur le graphique affiche le jour le plus proche : date, valeur, et la référence de ce jour s'il y en a une ; la lecture reste jusqu'au tap suivant. Légende sous le graphique.
   - Toggle `kg` / `% BW` (visible seulement si le poids de corps est renseigné). `% BW` = (poids de corps + charge ajoutée) / poids de corps.
   - Sous le graphique, deux tuiles : `Best` (valeur et date) et `Last 8 weeks` (dernier point moins le premier point des 8 dernières semaines ; `Not enough data` avec moins de deux points).
2. **Exercise history** : sélecteur d'exercice (la liste de S11 dans une feuille), par défaut le dernier exercice logué ou celui ouvert depuis `See all` dans S11b. Liste de toutes ses réalisations avec au moins un set (plus récentes en premier) : date, dosage, nombre de sets et d'échecs, meilleure charge réussie, badge `PR` sur la première fois où la meilleure charge a été atteinte. Un tap ouvre le log (S5).
3. **Consistency** : barres hebdomadaires sur les 8 dernières semaines : séances prévues en contour, faites en plein. Un tap sur une semaine affiche `Week of 16 Nov: 2 / 3 sessions` (semaine en cours par défaut). Masqué s'il n'y a aucune séance prévue sur la période.

Les graphiques sont dessinés avec `react-native-svg` (courbe) et des vues (barres), sans bibliothèque de graphiques.

**État vide** : `No hangs logged yet` + `Log a max hang test to start tracking.`

### S13 Settings

| Section | Réglages |
| --- | --- |
| Profile | Name (enregistré à la fin de la saisie), Bodyweight (facultatif, Stepper 0.5 kg, bouton `Clear bodyweight`) |
| Units | Weight `kg` / `lbs`, Boulder grades, Route grades. Avec `lbs`, l'aide `Loads still show in kg for now` rappelle que la conversion n'est pas encore faite |
| Appearance | Theme `Dark` / `Light` / `System` (défaut `Dark`), appliqué immédiatement. Il force aussi le style d'interface iOS de l'app (`Appearance.setColorScheme`), pour que la barre d'onglets, les alertes, les sélecteurs et les feuilles natives suivent le thème choisi et non celui du téléphone |
| Timer | Get ready countdown (5 à 30 s, défaut 10), Side switch rest (5 à 30 s, défaut 10), Sounds on/off, Sound volume (curseur par pas de 5 %, enregistré 300 ms après le dernier mouvement), Haptics on/off. Les réglages s'appliquent au prochain exercice ouvert |
| Data | `Export backup` (fichier JSON de toutes les données via la feuille de partage iOS), `Import backup` (remplace les données après confirmation) |
| About | Version (`expo.version` de `app.json`) |

Chaque réglage est enregistré dès qu'il change, dans `user_profile`. Interrupteurs et curseur sont les contrôles natifs de `@expo/ui`, teintés avec l'accent.

**Sauvegarde** (`src/db/backup.ts`) : l'export écrit `nawaru-backup-AAAA-MM-JJ.json` (toutes les tables sauf `active_timer`, avec le nombre de migrations appliquées) et ouvre la feuille de partage (`expo-sharing`) : `Save to Files`, AirDrop, mail… L'import passe par le sélecteur de documents (`expo-document-picker`), vérifie le fichier (application, format, version de schéma pas plus récente, tables et colonnes connues) puis demande `Replace all data?` avec le nom du fichier, sa date et le nombre de lignes. Le remplacement se fait en une transaction, clés étrangères vérifiées à la fin : au moindre problème, rien ne change. Un timer en cours est fermé.

> Comme la V1 est 100 % locale, l'export / import JSON est la seule protection contre la perte du téléphone.

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
