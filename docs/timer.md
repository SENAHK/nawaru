# Timer V1

> Références : `specs.md` §5 (comportement attendu), `screens.md` S4 (disposition : timer et log sur le même écran), `design-system.md` §2.3 et §8 (couleurs et sons), `data-model.md` §7 (colonnes de dosage). Ce fichier décrit la mécanique : génération des étapes, machine à états, horloge, audio en arrière-plan, reprise, remplissage du log et Live Activity. iOS uniquement.

## 1. Principes

| Principe | Conséquence |
| --- | --- |
| L'horloge murale fait foi | L'état ne stocke jamais un "temps restant" qui décroît, mais l'instant de fin de l'étape en cours. L'affichage et les sons se déduisent de `now`. Un tick en retard ou une app suspendue ne font donc jamais dériver le timer |
| Le timer est une liste d'étapes | La prescription est convertie une fois en liste plate d'étapes. La machine à états ne connaît que cette liste, pas les schémas de dosage |
| Logique pure, effets à part | Génération des étapes et transitions sont des fonctions pures, testables sans appareil. Audio, haptique et persistance sont des effets déclenchés par les transitions |
| Un seul timer actif | Démarrer un timer alors qu'un autre tourne demande d'abord d'arrêter le premier |

## 2. Étapes

### 2.1 Structure

```ts
type Phase = 'prep' | 'on' | 'off' | 'rest' | 'switch';

type Step = {
  phase: Phase;
  durationS: number | null;   // null = étape manuelle (chrono montant, fin par bouton)
  setIndex: number;           // 1..N : set, tour (circuit) ou créneau (slots)
  repIndex: number | null;    // intervalles seulement
  side: 'left' | 'right' | null;
};
```

La phase `done` n'est pas une étape : c'est l'état atteint après la dernière. `paused` est un état de la machine, pas une phase.

### 2.2 Génération par schéma

`P` = préparation (`user_profile.prep_countdown_s`), une seule fois au début. Il n'y a jamais de repos après le dernier set.

| Schéma | Étapes générées | Étape d'effort |
| --- | --- | --- |
| `reps` | `P`, puis par set : `on` manuel → `rest` | Manuelle : chrono montant, bouton `Set done` |
| `isometric` | `P`, puis par set : `on` (`duration_s`) → `rest` | Chronométrée |
| `intervals` | `P`, puis par set : (`on` `on_s` → `off` `off_s`) × `reps`, le dernier `off` du set étant remplacé par `rest` | Chronométrée |
| `circuit` | `P`, puis par tour : `on` manuel → `rest` | Manuelle : chrono montant, bouton `Round done` |
| `slots` | `P`, puis `sets` × `on` (`slot_duration_s`), enchaînés sans pause | Chronométrée |
| `free_duration` | `P`, puis un seul `on` (`total_duration_s`) | Chronométrée |

`rest` dure `rest_between_sets_s`. Si cette valeur est vide ou nulle, l'étape n'est pas générée.

Libellé affiché pour `on` : `HANG` si l'exercice utilise un hangboard, sinon `GO`.

### 2.3 Unilatéral

| `side` de la prescription | Effet |
| --- | --- |
| `both` | `side = null` sur toutes les étapes |
| `left` ou `right` | Même séquence, le côté est affiché sur chaque étape d'effort |
| `alternate` | Chaque set devient : effort gauche → `switch` (`side_switch_rest_s`) → effort droite → `rest`. Toujours gauche en premier |

Pour `intervals` en `alternate`, "effort" désigne tout le bloc de reps d'un côté : le dernier `off` du côté gauche est remplacé par `switch`, celui du côté droit par `rest`.

### 2.4 Exemple

`Repeaters 7s:3s × 5 × 6, repos 3:00`, deux mains, préparation 10s :

```
prep 10 → [on 7 → off 3] × 4 → on 7 → rest 180      (set 1)
        → …                                          (sets 2 à 5)
        → [on 7 → off 3] × 4 → on 7 → done           (set 6)
```

Soit 1 + 6 × 9 + 5 = 60 étapes.

## 3. Machine à états

### 3.1 État

```ts
type TimerState = {
  exerciseLogId: string;
  steps: Step[];
  stepIndex: number;
  status: 'running' | 'paused' | 'done' | 'stopped';
  stepStartedAt: number;        // epoch ms
  stepEndsAt: number | null;    // epoch ms ; null si étape manuelle
  pausedAt: number | null;      // epoch ms
  results: StepResult[];        // une entrée par étape d'effort quittée
};

type StepResult = {
  stepIndex: number;
  completed: boolean;           // false si passée (Skip) ou arrêtée en cours
  elapsedS: number;             // durée réellement tenue
};
```

Temps restant affiché = `stepEndsAt - now` (ou `stepEndsAt - pausedAt` en pause). Chrono montant d'une étape manuelle = `now - stepStartedAt`.

### 3.2 Transitions

| Événement | Depuis | Effet |
| --- | --- | --- |
| `start` | (aucun) | `stepIndex = 0`, `running`, `stepEndsAt = now + durée` |
| `tick(now)` | `running` | Tant que `stepEndsAt <= now` : clôturer l'étape et passer à la suivante, en démarrant la suivante à l'instant de fin **théorique** de la précédente (pas à `now`). S'arrête sur une étape manuelle ou à la fin |
| `completeManual` | `running`, étape manuelle | Clôture l'étape (`completed = true`), passe à la suivante à `now` |
| `pause` | `running` | `paused`, `pausedAt = now` |
| `resume` | `paused` | `running` ; `stepStartedAt` et `stepEndsAt` sont décalés de `now - pausedAt` |
| `skip` | `running` ou `paused` | Clôture l'étape en cours et passe à la suivante à `now`. Une étape d'effort passée est enregistrée `completed = false` avec le temps tenu |
| `back` | `running` ou `paused` | Redémarre l'étape en cours à `now`. Dans les 2 premières secondes d'une étape, revient à l'étape précédente et la redémarre. Le résultat déjà enregistré d'une étape d'effort rejouée est remplacé |
| `addRest(30)` | `running` ou `paused`, phase `rest` | `stepEndsAt += 30 000` |
| `stop` | `running` ou `paused` | `stopped` ; l'étape d'effort en cours est enregistrée `completed = false` |
| `setsChanged` | `running` ou `paused` | `Skip set` ou `Add set` depuis le log : les étapes situées après le set en cours sont régénérées avec le nouveau nombre de sets ; l'étape en cours n'est pas touchée |
| fin de la dernière étape | `running` | `done` |

Le rattrapage en boucle de `tick` est ce qui recale le timer après une suspension : au retour au premier plan, un seul `tick(now)` traverse toutes les étapes écoulées. Les sons des étapes traversées en rattrapage ne sont pas rejoués.

### 3.3 Boucle d'horloge

- Un intervalle JS de 100 ms appelle `tick(Date.now())` tant que le statut est `running`.
- L'écran n'est re-rendu que si la seconde affichée, la phase ou l'étape changent.
- `AppState` qui repasse à `active` déclenche un `tick` immédiat.

## 4. Sons et haptique

### 4.1 Déclencheurs

Les sons sont calculés à partir du temps restant de l'étape en cours ; chaque déclencheur ne joue qu'une fois par étape.

| Son | Moment |
| --- | --- |
| `tick` | À 3, 2 et 1 s de la fin de toute étape suivie d'un `on` (`prep`, `off`, `rest`, `switch`, ou créneau précédent en `slots`) |
| `go` | Début d'un `on` |
| `stop` | Fin d'un `on` chronométré (pas après une étape manuelle) |
| `switch` | Début d'un `switch` |
| `rest_end_warning` | À 10 s de la fin d'un `rest`, seulement si le repos dure au moins 30 s |
| `exercise_done` | Passage à `done` |

En `slots`, la fin d'un créneau et le début du suivant coïncident : seul `go` est joué.

Haptique (si `haptics_enabled`, au premier plan seulement) : impact moyen à chaque changement de phase, notification succès à `done`.

### 4.2 Configuration `expo-audio`

| Réglage | Valeur | Raison |
| --- | --- | --- |
| Plugin `enableBackgroundPlayback` | `true` (défaut) | Ajoute le mode d'arrière-plan `audio` |
| Plugin `microphonePermission` | `false` | L'app n'enregistre rien |
| `shouldPlayInBackground` | `true` | Sons écran verrouillé |
| `playsInSilentMode` | `true` | Sons malgré le commutateur silencieux |
| `interruptionMode` | `'mixWithOthers'` | Les bips se superposent à la musique de l'athlète sans la couper |

Conséquence de `mixWithOthers` : pas de commandes audio système sur l'écran verrouillé (elles exigent `doNotMix`). Ce rôle est tenu par la Live Activity (§8), qui ne coupe pas la musique de l'athlète.

Lecture :

- Un `AudioPlayer` par son, créé avec `createAudioPlayer` à l'ouverture du timer et libéré à sa fermeture.
- Rejouer un son : `seekTo(0)` puis `play()`.
- `volume` = `timer_volume / 100`. Si `timer_sounds_enabled` est faux, aucun player n'est créé.

### 4.3 Rester actif écran verrouillé

iOS suspend l'app, et donc la boucle JS, quelques secondes après le passage en arrière-plan, sauf si elle joue de l'audio. Des bips espacés de 3 minutes ne suffisent pas à la maintenir éveillée.

**Solution retenue** : pendant qu'un timer est `running`, un player joue en boucle (`loop = true`) un fichier de silence. L'app reste active, la boucle d'horloge continue et les bips sont déclenchés normalement.

| Statut du timer | Boucle de silence |
| --- | --- |
| `running` | Joue |
| `paused` | Arrêtée : rien n'est attendu, l'app peut être suspendue |
| `done`, `stopped` | Arrêtée, players libérés |
| `running` avec sons désactivés | Non lancée : le timer se recale au retour au premier plan |

**Risques, à lever au prototype sur appareil :**

1. La doc d'`expo-audio` ne garantit pas que ce montage tient écran verrouillé pendant une séance entière. C'est le premier test à faire.
2. Apple peut refuser une app qui joue du silence pour rester active. Le risque est modéré pour un timer d'entraînement dont les sons sont la fonction principale, mais il existe.

**Plan B** si l'un des deux échoue : programmer une notification locale avec son personnalisé pour chaque étape à venir. Limites connues : 64 notifications en attente au maximum (un Repeaters complet en demande plus, il faut donc en reprogrammer au fil de l'eau), pas de son en mode silencieux ou Concentration, et tout doit être annulé puis reprogrammé à chaque pause, `Skip` ou `+30s`.

### 4.4 Interruptions

| Situation | Comportement |
| --- | --- |
| Appel téléphonique, Siri | Le timer continue sur l'horloge ; les sons reprennent dès que la session audio est rendue. Pas de pause automatique |
| Casque Bluetooth déconnecté | `expo-audio` arrête la lecture : relancer la boucle de silence au `tick` suivant si le timer est toujours `running` |
| Changement d'heure du téléphone | Non géré en V1 |

## 5. Persistance et reprise

L'état actif est enregistré dans une table locale `active_timer`, à une seule ligne, **non synchronisée** (elle n'a de sens que sur l'appareil).

| Colonne | Type | Notes |
| --- | --- | --- |
| `exercise_log_id` | fk | Exercice chronométré |
| `state_json` | text | `TimerState` sérialisé |
| `updated_at` | timestamp | |

- Écriture à chaque transition (changement d'étape, pause, reprise, skip, `+30s`), jamais à chaque tick.
- La ligne est supprimée quand le log est enregistré ou abandonné.

| Situation au lancement de l'app | Comportement |
| --- | --- |
| Ligne présente, `running` | `tick(now)` rattrape les étapes écoulées. Si le timer est encore en cours, la barre persistante l'affiche et un tap rouvre S4. S'il est arrivé à `done`, S4 s'ouvre avec les sets remplis |
| Ligne présente, `paused` | Barre persistante avec `Paused` ; un tap rouvre S4 |
| Ligne présente, `done` ou `stopped` | Le log n'avait pas été enregistré : S4 s'ouvre avec les sets remplis |
| Rattrapage bloqué sur une étape manuelle | Le timer attend sur cette étape, chrono montant depuis `stepStartedAt` |

## 6. Remplissage du log en direct

Le log est affiché sous le timer (S4) et se remplit au fil des étapes : à chaque set clôturé, `results` met à jour la ligne correspondante. Les sets à venir restent pré-remplis avec les valeurs prescrites ; à `stopped`, ceux qui n'ont pas été commencés sont retirés. Charge, prise et bord viennent de la prescription selon l'ordre de `specs.md` §5.

Une valeur modifiée à la main par l'athlète n'est plus écrasée par le timer. Rien n'est écrit dans `set_log` avant `Save` : jusque-là, les lignes vivent dans l'état de l'écran et dans `active_timer`.

| Schéma | Une ligne par | Valeurs |
| --- | --- | --- |
| `reps` | Set terminé (`Set done`) | `reps_done` = reps prescrites, `success` |
| `isometric` | Set commencé | `duration_s` = temps tenu ; `success` si complet, sinon `fail` |
| `intervals` | Set commencé | `reps_done` = nombre de `on` complets ; `success` si toutes les reps, sinon `fail` |
| `circuit` | Bloc de chaque tour terminé | `items_per_round` lignes par tour, `success`, cotation vide |
| `slots` | Créneau commencé | `success`, cotation vide |
| `free_duration` | (aucune) | La durée écoulée pré-remplit la durée totale ; la liste de blocs reste vide |

En `alternate`, chaque set produit deux lignes (`left`, `right`), chacune selon la règle ci-dessus.

Exemple : arrêt d'un Repeaters pendant la rep 3 du set 4 → sets 1 à 3 avec `5/5` et `success`, set 4 avec `2/5` et `fail`, sets 5 et 6 absents.

## 7. Écran et barre persistante

- La zone timer de S4 lit l'état du timer et applique `timerPhases` ; en pause, la couleur de phase est assombrie.
- La barre de progression affiche `(now - stepStartedAt) / durée` ; elle est masquée sur une étape manuelle.
- `expo-keep-awake` est actif tant que S4 est affiché.
- Commandes visibles par contexte :

| Commande | Visible |
| --- | --- |
| `Back` | Toujours |
| `Pause` / `Resume` | Toujours |
| `Skip` | Étapes chronométrées |
| `Set done` / `Round done` | Étapes manuelles, à la place de `Skip` |
| `+30s` | Phase `rest` |

- Fermer S4 sans arrêter laisse le timer tourner : la barre persistante affiche la phase et le décompte.

## 8. Live Activity

Quand l'app passe en arrière-plan ou que l'écran se verrouille avec un timer `running` ou `paused`, une Live Activity affiche le timer sur l'écran verrouillé et dans la Dynamic Island. Elle est réalisée avec `expo-widgets` (layouts en `@expo/ui/swift-ui`), qui demande un development build.

| Zone | Contenu |
| --- | --- |
| Titre | Pastille de la couleur de phase + nom de la phase (`Rest`, `Hang`, `Get ready`) |
| Ligne 2 | `Set 1 of 4` à gauche, `Up next: …` à droite |
| Progression | Barre d'avancement de l'étape |
| Décompte | Temps restant, en grand |
| Boutons | `Skip rest` (phase `rest` seulement) et `Pause` / `Resume` |
| Dynamic Island compacte | Pastille de phase à gauche, décompte à droite |

Cycle de vie :

| Moment | Appel |
| --- | --- |
| Démarrage du timer | `start(props)` |
| Chaque transition (étape, pause, reprise, `+30s`) | `update(props)` avec la phase, les libellés et l'instant de fin de l'étape |
| `done` | `update` vers l'état `Done`, puis `end` après quelques secondes |
| `stopped` ou log enregistré | `end('immediate')` |
| Lancement de l'app | `getInstances()` pour retrouver ou fermer une activité orpheline |

Les mises à jour n'ont lieu qu'aux transitions, jamais chaque seconde : le décompte doit donc avancer seul côté système, à partir de l'instant de fin transmis.

**Points non couverts par la doc d'`expo-widgets`, à lever au prototype :**

1. Un texte de décompte et une barre de progression qui avancent seuls dans une Live Activity. Sans cela, le décompte serait figé entre deux transitions, et il faudrait afficher l'heure de fin à la place.
2. Des boutons interactifs dans une Live Activity. La doc ne les décrit que pour les widgets, et précise que les événements n'atteignent le JS que si le processus de l'app est vivant. C'est le cas tant que la boucle de silence tourne (§4.3), mais pas en pause : il faudra soit garder la boucle active en pause, soit retirer le bouton `Resume` de la Live Activity.
3. `update()` appelé depuis l'app en arrière-plan.

Si le point 2 échoue, la Live Activity reste utile en lecture seule ; un tap dessus ouvre S4.

## 9. Organisation du code

```
src/features/timer/
  build-steps.ts      # prescription + réglages → Step[]            (pur)
  machine.ts          # (state, event, now) → state                 (pur)
  cues.ts             # (state avant, state après, now) → sons      (pur)
  prefill.ts          # TimerState → lignes de sets du log          (pur)
  audio.ts            # players expo-audio, boucle de silence
  store.ts            # état courant, boucle d'horloge, persistance
  live-activity.tsx   # layout et cycle de vie de la Live Activity
```

Les quatre fichiers purs sont couverts par des tests unitaires, avec les 10 exercices de validation de `specs.md` §3 comme cas de test.

## 10. À valider au prototype

Le développement commence dans Expo Go, où le timer fonctionne au premier plan seulement (sons compris) et se recale au retour dans l'app. Les points ci-dessous demandent un development build et seront validés à ce moment-là, dans cet ordre, sur un iPhone réel :

1. Un Repeaters complet (environ 20 min), écran verrouillé : tous les bips jouent, à l'heure.
2. Idem avec de la musique en lecture dans une autre app : les bips se superposent, la musique ne s'arrête pas.
3. Commutateur silencieux activé : les bips jouent.
4. Appel entrant pendant un repos : les sons reprennent après l'appel.
5. App tuée pendant un repos, puis relancée : le timer est recalé.
6. Chiffres tabulaires de Barlow Condensed à 96 et 160 pt : le décompte ne "saute" pas en largeur.
7. Live Activity : décompte qui avance seul, mise à jour à chaque changement de phase écran verrouillé, boutons `Skip rest` et `Pause`.
