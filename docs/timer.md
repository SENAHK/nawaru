# Timer V1

> Références : `specs.md` §5 (comportement attendu), `screens.md` S4 (disposition), `design-system.md` §2.3 et §8 (couleurs et sons), `data-model.md` §7 (colonnes de dosage). Ce fichier décrit la mécanique : génération des étapes, machine à états, horloge, audio en arrière-plan, reprise et pré-remplissage du log. iOS uniquement.

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
| `addRest(30)` | `running` ou `paused`, phase `rest` | `stepEndsAt += 30 000` |
| `stop` | `running` ou `paused` | `stopped` ; l'étape d'effort en cours est enregistrée `completed = false` |
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

Conséquence de `mixWithOthers` : pas de commandes sur l'écran verrouillé (elles exigent `doNotMix`). Accepté en V1, car couper la musique de l'athlète serait pire.

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
| Ligne présente, `running` | `tick(now)` rattrape les étapes écoulées. Si le timer est encore en cours, la barre persistante l'affiche et un tap rouvre S4. S'il est arrivé à `done`, S5 s'ouvre pré-rempli |
| Ligne présente, `paused` | Barre persistante avec `Paused` ; un tap rouvre S4 |
| Ligne présente, `done` ou `stopped` | Le log n'avait pas été enregistré : S5 s'ouvre pré-rempli |
| Rattrapage bloqué sur une étape manuelle | Le timer attend sur cette étape, chrono montant depuis `stepStartedAt` |

## 6. Pré-remplissage du log

À `done` ou `stopped`, `results` est converti en `set_log`. Seuls les sets commencés produisent une ligne ; charge, prise et bord viennent de la prescription selon l'ordre de `specs.md` §5.

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

- S4 lit l'état du timer et applique `timerPhases` ; en pause, la couleur de phase est assombrie.
- `expo-keep-awake` est actif tant que S4 est affiché.
- Commandes visibles par contexte :

| Commande | Visible |
| --- | --- |
| `Pause` / `Resume` | Toujours |
| `Skip` | Étapes chronométrées |
| `Set done` / `Round done` | Étapes manuelles, à la place de `Skip` |
| `+30s` | Phase `rest` |

- Fermer S4 sans arrêter (geste retour) laisse le timer tourner : la barre persistante affiche la phase et le décompte.

## 8. Organisation du code

```
src/features/timer/
  build-steps.ts      # prescription + réglages → Step[]            (pur)
  machine.ts          # (state, event, now) → state                 (pur)
  cues.ts             # (state avant, state après, now) → sons      (pur)
  prefill.ts          # TimerState → set_log pré-remplis            (pur)
  audio.ts            # players expo-audio, boucle de silence
  store.ts            # état courant, boucle d'horloge, persistance
```

Les quatre fichiers purs sont couverts par des tests unitaires, avec les 10 exercices de validation de `specs.md` §3 comme cas de test.

## 9. À valider au prototype

Dans cet ordre, sur un iPhone réel avec un development build :

1. Un Repeaters complet (environ 20 min), écran verrouillé : tous les bips jouent, à l'heure.
2. Idem avec de la musique en lecture dans une autre app : les bips se superposent, la musique ne s'arrête pas.
3. Commutateur silencieux activé : les bips jouent.
4. Appel entrant pendant un repos : les sons reprennent après l'appel.
5. App tuée pendant un repos, puis relancée : le timer est recalé.
6. Chiffres tabulaires de Barlow Condensed à 160 pt : le décompte ne "saute" pas en largeur.
