# Design system V1

> Ambiance **outdoor / nature** : tons minéraux chauds (roche, magnésie, lichen), accent **bruyère** (violet des fleurs d'altitude). Thème **sombre par défaut**, thème clair disponible. Le timer colore sa zone par phase, au-dessus du log ; en mode focus, il passe en **plein écran**, lisible de loin depuis la poutre.

## 1. Principes

| Principe | Traduction concrète |
| --- | --- |
| Lisible en salle, mains pleines de magnésie | Cibles tactiles 48 pt minimum, 56 pt sur les écrans de séance et le timer ; chiffres grands ; peu de saisie clavier (steppers) |
| Le chiffre d'abord | Charges, durées, reps et cotations sont toujours l'élément le plus visible d'une ligne |
| Calme hors séance, intense pendant | Interfaces de navigation sobres (tons pierre) ; couleurs vives réservées au timer et aux actions principales |
| Une couleur = un sens | La bruyère (violet) signale l'action ou l'effort ; les couleurs sémantiques ne servent jamais de décoration |
| Pas d'ombres en sombre | La profondeur passe par des surfaces de plus en plus claires, pas par des ombres |

## 2. Couleurs

### 2.1 Palettes de base

**Pierre (neutres chauds)**

| Token | Hex |
| --- | --- |
| `stone.0` | `#FFFDF9` |
| `stone.50` | `#F7F3EE` |
| `stone.100` | `#ECE6DD` |
| `stone.200` | `#D9D1C6` |
| `stone.300` | `#BDB3A6` |
| `stone.400` | `#9C9184` |
| `stone.500` | `#7A6F63` |
| `stone.600` | `#5A5148` |
| `stone.700` | `#3D362F` |
| `stone.800` | `#2C2722` |
| `stone.850` | `#221E1A` |
| `stone.900` | `#1A1714` |
| `stone.950` | `#12100E` |

**Bruyère (accent violet)**

| Token | Hex |
| --- | --- |
| `heather.50` | `#F4F0FA` |
| `heather.100` | `#E6DDF5` |
| `heather.200` | `#CDBDEB` |
| `heather.300` | `#B39CE0` |
| `heather.400` | `#9A7DD4` |
| `heather.500` | `#8263C2` |
| `heather.600` | `#6A4DA8` |
| `heather.700` | `#533B85` |
| `heather.800` | `#3D2C62` |
| `heather.900` | `#2A1F44` |

Le violet reste une couleur "nature" : bruyère, lavande, gentiane. Il est désaturé et légèrement gris pour s'accorder aux tons pierre.

**Nature (sémantique et catégories)**

| Token | Hex | Évoque |
| --- | --- | --- |
| `moss.300` | `#8BAA67` | Mousse claire |
| `moss.500` | `#6F8F4E` | Mousse |
| `moss.700` | `#4F6B3A` | Mousse sombre |
| `moss.900` | `#2F4026` | Sous-bois |
| `sky.300` | `#7FA3C4` | Ciel d'altitude |
| `sky.700` | `#3F6488` | Ardoise bleue |
| `sky.900` | `#2E4459` | Crépuscule |
| `clay.300` | `#E0745A` | Terre cuite claire |
| `clay.600` | `#B4432A` | Terre cuite |
| `clay.900` | `#5A3E2B` | Argile sombre |
| `sand.300` | `#D9C49A` | Sable |
| `sand.600` | `#9C8455` | Grès |

### 2.2 Tokens sémantiques

Les composants n'utilisent **que** ces tokens, jamais les palettes de base.

| Token | Sombre (défaut) | Clair | Usage |
| --- | --- | --- | --- |
| `bg` | `stone.950` | `stone.50` | Fond d'écran |
| `surface` | `stone.900` | `stone.0` | Cartes, listes |
| `surfaceRaised` | `stone.850` | `#FFFFFF` | Bottom sheets, menus |
| `surfaceSunken` | `#0C0B09` | `stone.100` | Champs de saisie, pistes de steppers |
| `border` | `stone.800` | `stone.200` | Séparateurs, contours |
| `borderStrong` | `stone.700` | `stone.300` | Contour focus neutre, cartes sélectionnées |
| `textPrimary` | `stone.50` | `stone.900` | Texte principal, chiffres |
| `textSecondary` | `stone.300` | `stone.600` | Libellés, métadonnées |
| `textTertiary` | `stone.500` | `stone.500` | Placeholders, info désactivée |
| `accent` | `heather.400` | `heather.400` | Fond des boutons principaux, sélection |
| `accentPressed` | `heather.500` | `heather.500` | État pressé |
| `onAccent` | `stone.950` | `stone.950` | Texte sur fond violet (toujours sombre : contraste 5.4:1, le blanc ne passe pas AA) |
| `accentText` | `heather.300` | `heather.700` | Liens, valeurs mises en avant sur fond neutre |
| `accentSubtle` | `heather.400` à 16 % | `heather.400` à 18 % | Fond d'un chip ou d'une ligne sélectionnés |
| `success` | `moss.300` | `moss.700` | Séance faite, set réussi |
| `danger` | `clay.300` | `clay.600` | Set échoué, suppression |
| `info` | `sky.300` | `sky.700` | Informations, repos |
| `missed` | `stone.500` | `stone.500` | Séance manquée (neutre, jamais rouge : pas de culpabilisation) |

### 2.3 Couleurs du timer (identiques dans les deux thèmes)

Chaque phase colore toute la zone timer (le haut de l'écran en vue partagée, tout l'écran en mode focus). Le texte reste à fort contraste.

| Phase | Fond | Texte | Raison |
| --- | --- | --- | --- |
| `prep` (décompte de départ) | `stone.800` | `heather.300` | Neutre, le violet annonce l'effort |
| `on` (effort) | `heather.400` | `stone.950` | Le moment le plus visible |
| `off` (pause entre reps) | `moss.700` | `stone.50` | Respiration courte |
| `rest` (repos entre sets) | `sky.900` | `stone.50` | Calme, long |
| `switch` (changement de côté, 10s) | `clay.900` | `stone.50` | Distinct de toutes les autres phases |
| `done` (exercice terminé) | `moss.500` | `stone.950` | Validation |
| `paused` | Phase en cours, assombrie (overlay noir 50 %) | `stone.50` | On voit où l'on s'est arrêté |

### 2.4 Couleurs de catégories d'exercice

| Catégorie | Couleur |
| --- | --- |
| `fingers` | `heather.400` |
| `strength` | `clay.300` |
| `climbing` | `moss.300` |
| `mobility` | `sky.300` |
| `conditioning` | `sand.300` |
| `warmup` | `stone.400` |

Affichées uniquement en pastille (point de 8 pt) ou en liseré gauche de 3 pt, jamais en fond plein.

### 2.5 Couleurs de programmes

Pour distinguer les programmes suivis en parallèle (champ `enrollment.color`), dans cet ordre d'attribution :
`heather.400`, `sky.300`, `moss.300`, `clay.300`, `sand.300`, `stone.300`.

## 3. Typographie

| Rôle | Police | Remarques |
| --- | --- | --- |
| Interface | **Barlow** (Regular 400, Medium 500, SemiBold 600) | Lisible, un peu "signalétique de refuge" |
| Titres et chiffres d'affichage | **Barlow Condensed** (SemiBold 600, Bold 700) | Grands chiffres compacts |
| Chiffres | `fontVariant: ['tabular-nums']` partout où un chiffre change (timer, steppers, tableaux) | À vérifier au prototype : si la police ne fournit pas de chiffres tabulaires, largeur fixe par chiffre |

Chargement via `@expo-google-fonts/barlow` et `@expo-google-fonts/barlow-condensed`.

### Échelle

| Token | Police | Taille / interligne | Graisse | Usage |
| --- | --- | --- | --- | --- |
| `timer` | Barlow Condensed | 160 / 160 | 700 | Chiffres du timer en mode focus |
| `timerCompact` | Barlow Condensed | 96 / 96 | 700 | Chiffres du timer en vue partagée (au-dessus du log) |
| `displayL` | Barlow Condensed | 56 / 60 | 700 | Phase du timer ("HANG", "REST"), côté ("LEFT") |
| `displayM` | Barlow Condensed | 40 / 44 | 600 | Valeur principale d'un set en cours |
| `title1` | Barlow Condensed | 28 / 32 | 600 | Titre d'écran |
| `title2` | Barlow | 20 / 26 | 600 | Titre de section, nom d'exercice |
| `title3` | Barlow | 17 / 22 | 600 | Titre de carte |
| `body` | Barlow | 16 / 22 | 400 | Texte courant |
| `bodyStrong` | Barlow | 16 / 22 | 600 | Valeurs dans une ligne |
| `bodySm` | Barlow | 14 / 20 | 400 | Métadonnées |
| `label` | Barlow | 13 / 16 | 600, majuscules, interlettrage +0.6 | Libellés de champs, en-têtes de colonnes |
| `caption` | Barlow | 12 / 16 | 500 | Notes, horodatage |

Support du texte dynamique iOS, plafonné à 1.3× pour ne pas casser les écrans de séance (le timer n'est pas redimensionné).

## 4. Espacements, rayons, bordures

| Token | Valeur (pt) |
| --- | --- |
| `space.0` | 0 |
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.5` | 20 |
| `space.6` | 24 |
| `space.8` | 32 |
| `space.10` | 40 |
| `space.12` | 48 |
| `space.16` | 64 |

- Marge horizontale d'écran : `space.4` (16).
- Espace entre cartes : `space.3` (12). Padding interne de carte : `space.4`.

| Rayon | Valeur | Usage |
| --- | --- | --- |
| `radius.sm` | 6 | Chips, badges |
| `radius.md` | 10 | Champs, boutons |
| `radius.lg` | 16 | Cartes |
| `radius.xl` | 24 | Bottom sheets (coins hauts) |
| `radius.full` | 999 | Pastilles, boutons ronds du timer |

Bordures : 1 pt (`border`), 2 pt pour l'état sélectionné ou focus (`accent`).

## 5. Profondeur

- **Sombre** : aucune ombre ; `bg` < `surface` < `surfaceRaised`.
- **Clair** : une seule ombre douce pour `surfaceRaised` (`0 4 16`, noir à 8 %).
- Bottom sheet : voile `#000` à 50 % derrière.
- **Effet verre** (`expo-glass-effect`, iOS) : réservé aux éléments de navigation flottants (`TabBar`, barre de séance en cours). Jamais sur les cartes, les listes ni le timer, qui restent en surfaces pleines pour la lisibilité.

## 6. Iconographie

- Bibliothèque : **lucide-react-native**, trait 1.75, tailles 20 (listes) et 24 (navigation, actions).
- Couleur par défaut `textSecondary` ; `accent` quand actif.
- Icônes spécifiques escalade (prises, poutre) : SVG maison au même trait, à produire avec la bibliothèque d'exercices.

## 7. Mouvement et retours

| Token | Durée | Usage |
| --- | --- | --- |
| `motion.fast` | 120 ms | Pressé, toggle |
| `motion.base` | 200 ms | Apparition, changement d'onglet |
| `motion.slow` | 320 ms | Bottom sheet, transition de phase du timer (fondu de couleur) |

- Courbe : `easeOut` à l'entrée, `easeIn` à la sortie.
- "Réduire les animations" (iOS) : fondus seulement, aucun déplacement.
- **Haptique** (`expo-haptics`) : impact léger au pas d'un stepper ; impact moyen à chaque changement de phase du timer ; notification succès en fin d'exercice.

## 8. Sons du timer

Fichiers courts (WAV ou CAF), mixés pour être audibles dans une salle bruyante. Ils jouent écran verrouillé (audio en arrière-plan) et en mode silencieux.

| Son | Déclencheur | Caractère |
| --- | --- | --- |
| `tick` | 3, 2, 1 avant chaque phase `on` et avant la fin d'un repos | Bip court, médium |
| `go` | Début de `on` | Bip aigu, plus long |
| `stop` | Fin de `on` (début de `off` ou de `rest`) | Bip grave |
| `switch` | Début du changement de côté | Double bip |
| `rest_end_warning` | 10s avant la fin d'un repos | Bip doux |
| `exercise_done` | Fin de l'exercice | Petit accord ascendant |

Lecture via `expo-audio`. Volume réglable dans les réglages (0 à 100 %, `user_profile.timer_volume`) et interrupteur général (`timer_sounds_enabled`) ; un interrupteur "voix" est réservé à plus tard.

## 9. Composants

Liste fermée pour la V1. Chaque composant consomme uniquement des tokens.

| Composant | Variantes / états | Règles clés |
| --- | --- | --- |
| `Button` | `primary` (fond `accent`), `secondary` (contour `borderStrong`), `ghost`, `destructive` (texte `danger`) ; tailles `md` (48) et `lg` (56) | Un seul `primary` par écran |
| `IconButton` | rond, 48 ou 64 (timer) | |
| `Card` | défaut, sélectionnée (bordure 2 pt `accent`) | Padding `space.4`, `radius.lg` |
| `ListItem` | avec pastille de catégorie, chevron, valeur à droite | Hauteur min 56 |
| `Chip` | filtre (toggle), info (lecture seule) | `radius.sm`, sélection en `accentSubtle` + texte `accentText` |
| `Badge` | `today` (neutre), `in_progress` (`accent`), `done` (`success`), `missed` (`missed`), `paused` (`missed`), `test` (`info`) | Majuscules, `label` ; une séance `planned` hors du jour courant n'a pas de badge |
| `SegmentedControl` | 2 à 4 options | Bascule semaine / mois, échelle d'effort |
| `Stepper` | entier, décimal (pas 0.5 ou 1 kg ; 1 rep ; 1s) | Boutons 48 pt de chaque côté, appui long = répétition, tap sur la valeur = saisie clavier numérique |
| `GripPicker` | Une feuille : combinaisons récentes en tête (un tap choisit et ferme), puis type de prise et doigts. La main vient du côté de la prescription | Résumé compact : "4F HC", "3F Drag", "L 2FM Pocket" |
| `EffortPicker` | `rpe` (1 à 10, pas 0.5), `rir` (0 à 5), `feel` (Easy / Moderate / Hard / Very hard / Max) | Une rangée de pastilles, une seule sélection |
| `SetRow` | à faire, réussi (numéro sur pastille `success`), échoué, en cours (bordure 2 pt `accent`) | Valeurs pré-remplies en `textSecondary`, modifiées en `textPrimary` |
| `DosageSummary` | texte compact | `7s × 5 × 6 · 20 mm · 4F HC · +5 kg` |
| `ProgramDot` | 6 couleurs | Distinction des programmes |
| `BottomSheet` | hauteur auto, plein écran | Ajout d'exercice, filtres, sélecteurs |
| `TabBar` | 5 onglets (`Today`, `Calendar`, `Programs`, `Library`, `Progress`) | Icône + libellé, actif en `accent` |
| `EmptyState` | icône, titre, texte, action | |
| `Toast` | info, succès | Bas d'écran au-dessus de la TabBar, 3s ; `showToast(text)` depuis n'importe quel écran |
| `TimerPanel` | `compact` (au-dessus du log), `focus` (plein écran) ; phases §2.3 | Commandes `Back`, `Pause`, `Skip` ; barre de progression de l'étape ; ligne `Up next` |
| `TimerLiveActivity` | écran verrouillé, Dynamic Island | Composants SwiftUI (`@expo/ui/swift-ui`), hors tokens RN : reprendre les couleurs de `timerPhases` |

## 10. Rédaction (interface en anglais)

- Phrases courtes, casse "Sentence case" (`Start session`, pas `Start Session`).
- Vocabulaire fixe : `Program`, `Week`, `Session`, `Exercise`, `Set`, `Rep`, `Rest`, `Hang`, `Log`, `Test`, `Reference`.
- Phases du timer : `GET READY`, `HANG` (ou `GO` pour les exercices hors poutre), `OFF`, `REST`, `SWITCH`, `DONE`.
- Côtés : `LEFT` / `RIGHT` en `displayL`, accompagnés d'une flèche.
- Formats :

| Donnée | Format |
| --- | --- |
| Charge | `+12.5 kg`, `−10 kg` (délestage), `BW` si nulle ; lbs arrondis à 0.5 |
| Pourcentage | `80% ref` |
| Dosage | `7s × 5 × 6` (du plus petit au plus grand) |
| Durée | `3:00`, `45s`, `1:00:00` |
| Bord | `20 mm` |
| Cotation | Selon le système choisi : `7A`, `V6`, `7b+`, `5.12a` |
| Date | `Mon 12 Jan` ; semaine de programme : `Week 3 · Day 2` |

## 11. Accessibilité

- Contraste AA minimum (4.5:1 pour le texte courant, 3:1 pour les grands chiffres et les icônes).
- Aucune information portée par la couleur seule : phases du timer toujours nommées, statuts toujours avec un libellé.
- Libellés VoiceOver sur tous les boutons icônes et steppers.

## 12. Tokens (implémentation)

```ts
// src/theme/tokens.ts
export const palette = {
  stone: {
    0: '#FFFDF9', 50: '#F7F3EE', 100: '#ECE6DD', 200: '#D9D1C6', 300: '#BDB3A6',
    400: '#9C9184', 500: '#7A6F63', 600: '#5A5148', 700: '#3D362F', 800: '#2C2722',
    850: '#221E1A', 900: '#1A1714', 950: '#12100E',
  },
  heather: {
    50: '#F4F0FA', 100: '#E6DDF5', 200: '#CDBDEB', 300: '#B39CE0', 400: '#9A7DD4',
    500: '#8263C2', 600: '#6A4DA8', 700: '#533B85', 800: '#3D2C62', 900: '#2A1F44',
  },
  moss: { 300: '#8BAA67', 500: '#6F8F4E', 700: '#4F6B3A', 900: '#2F4026' },
  sky: { 300: '#7FA3C4', 700: '#3F6488', 900: '#2E4459' },
  clay: { 300: '#E0745A', 600: '#B4432A', 900: '#5A3E2B' },
  sand: { 300: '#D9C49A', 600: '#9C8455' },
} as const;

const p = palette;

export const darkColors = {
  bg: p.stone[950],
  surface: p.stone[900],
  surfaceRaised: p.stone[850],
  surfaceSunken: '#0C0B09',
  border: p.stone[800],
  borderStrong: p.stone[700],
  textPrimary: p.stone[50],
  textSecondary: p.stone[300],
  textTertiary: p.stone[500],
  accent: p.heather[400],
  accentPressed: p.heather[500],
  onAccent: p.stone[950],
  accentText: p.heather[300],
  accentSubtle: 'rgba(154, 125, 212, 0.16)',
  success: p.moss[300],
  danger: p.clay[300],
  info: p.sky[300],
  missed: p.stone[500],
} as const;

export type ColorTokens = { [K in keyof typeof darkColors]: string };

export const lightColors: ColorTokens = {
  bg: p.stone[50],
  surface: p.stone[0],
  surfaceRaised: '#FFFFFF',
  surfaceSunken: p.stone[100],
  border: p.stone[200],
  borderStrong: p.stone[300],
  textPrimary: p.stone[900],
  textSecondary: p.stone[600],
  textTertiary: p.stone[500],
  accent: p.heather[400],
  accentPressed: p.heather[500],
  onAccent: p.stone[950],
  accentText: p.heather[700],
  accentSubtle: 'rgba(154, 125, 212, 0.18)',
  success: p.moss[700],
  danger: p.clay[600],
  info: p.sky[700],
  missed: p.stone[500],
};

// Same in both themes
export const timerPhases = {
  prep: { bg: p.stone[800], fg: p.heather[300] },
  on: { bg: p.heather[400], fg: p.stone[950] },
  off: { bg: p.moss[700], fg: p.stone[50] },
  rest: { bg: p.sky[900], fg: p.stone[50] },
  switch: { bg: p.clay[900], fg: p.stone[50] },
  done: { bg: p.moss[500], fg: p.stone[950] },
} as const;

export const categoryColors = {
  fingers: p.heather[400],
  strength: p.clay[300],
  climbing: p.moss[300],
  mobility: p.sky[300],
  conditioning: p.sand[300],
  warmup: p.stone[400],
} as const;

export const programColors = [
  p.heather[400], p.sky[300], p.moss[300], p.clay[300], p.sand[300], p.stone[300],
] as const;

export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;

export const radius = { sm: 6, md: 10, lg: 16, xl: 24, full: 999 } as const;

export const motion = { fast: 120, base: 200, slow: 320 } as const;

export const touch = { min: 48, workout: 56, timer: 64 } as const;

export const typography = {
  timer: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 160, lineHeight: 160 },
  timerCompact: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 96, lineHeight: 96 },
  displayL: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 56, lineHeight: 60 },
  displayM: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 40, lineHeight: 44 },
  title1: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 28, lineHeight: 32 },
  title2: { fontFamily: 'Barlow_600SemiBold', fontSize: 20, lineHeight: 26 },
  title3: { fontFamily: 'Barlow_600SemiBold', fontSize: 17, lineHeight: 22 },
  body: { fontFamily: 'Barlow_400Regular', fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: 'Barlow_600SemiBold', fontSize: 16, lineHeight: 22 },
  bodySm: { fontFamily: 'Barlow_400Regular', fontSize: 14, lineHeight: 20 },
  label: { fontFamily: 'Barlow_600SemiBold', fontSize: 13, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  caption: { fontFamily: 'Barlow_500Medium', fontSize: 12, lineHeight: 16 },
} as const;
```
