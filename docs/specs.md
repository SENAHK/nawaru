# Specs : App de suivi d'entraînement escalade (v0.1)

Nov 16, 2026 · @Mike

## 1. Vision et périmètre

L'app est un carnet d'entraînement orienté escalade. Sa valeur tient à des exercices modélisés finement, un timer intégré et un log pré-rempli, puis, à terme, à la relation coach ↔ athlète. La V1 est **athlète uniquement** : les coachs existent déjà dans les données, mais sont créés directement en base.

### Personas

| Persona | Ce qu'il fait | En V1 |
| --- | --- | --- |
| Athlète | Suit un ou plusieurs programmes, logue ses séances, consulte ses stats, crée ses propres programmes | Oui (premier utilisateur : toi) |
| Coach | Crée des programmes personnalisés pour ses clients, à partir de templates | Factice, créé en base |
| Admin | Maintient la bibliothèque d'exercices | Hors app (données seedées) |

### Périmètre

| Domaine | V1 | Plus tard |
| --- | --- | --- |
| Bibliothèque d'exercices | Consultation, filtres, groupements | Exercices custom (coach, athlète), partage |
| Programmes | Création par l'athlète, programmes "coach" insérés en base, suivi de plusieurs programmes | Éditeur coach, templates versionnés |
| Exécution | Dashboard du jour, calendrier, timer, log intelligent, séance libre, hors ligne | Montre connectée |
| Phases de test | Séances de test et charges en % d'une référence |  |
| Stats | Progression des max hangs, historique par exercice, assiduité | Dashboard coach |
| Coachs | Coach factice | Interface web coach, marketplace, invitation, abonnement, chat simple |
| Médias | Champ prévu dans le modèle | Contenu (vidéos, schémas) à définir |
| Langue et unités | Anglais, kg/lbs et cotations configurables |  |

## 2. Glossaire et modèle conceptuel

Le modèle sépare trois niveaux : la **définition** (l'exercice dans la bibliothèque), la **prescription** (ce qui est prévu) et la **réalisation** (ce qui a été fait). Le programme est écrit en jours relatifs (semaine N, jour J) ; c'est l'inscription, avec sa date de début, qui le cale sur le calendrier.

&#91;embedded content: modèle conceptuel · plan, inscription, réalisation\]

Une séance réalisée peut exister sans séance prévue (séance libre). Un test produit une référence, qui sert de base aux charges en % des prescriptions suivantes.

| Terme | Définition | Exemple |
| --- | --- | --- |
| Exercice | Entrée de la bibliothèque : nom, catégorie, muscles, schéma de dosage, mesures pertinentes | Repeaters |
| Schéma de dosage | Structure temporelle d'un exercice, qui génère aussi le timer (section 3) | Intervalles |
| Prise | Combinaison type de préhension × nombre de doigts × main | Half crimp, 4 doigts, deux mains |
| Prescription | Un exercice placé dans une séance, avec ses paramètres cibles (charges facultatives) | Repeaters 7s × 5 reps × 6 sets, bord 20 mm, half crimp 4 doigts |
| Séance | Liste ordonnée de prescriptions prévue un jour donné | Semaine 3, mardi : doigts + gainage |
| Programme | Ensemble de séances sur plusieurs semaines, éventuellement découpé en phases | Bloc force doigts, 8 semaines |
| Phase | Sous-partie nommée d'un programme | Test, Base, Force, Deload |
| Template | Programme modèle d'un coach, versionné, copié pour chaque client (V2) | "Force doigts intermédiaire v3" |
| Inscription | Lien athlète ↔ programme avec une date de début ; donne les dates réelles | Début le lundi 4 janvier |
| Séance réalisée | Ce qui a été fait à une date, rattaché ou non à une séance prévue | Log du mardi |
| Exercice réalisé | Les sets réellement faits pour un exercice, avec charges, prise et effort | 6 sets, dernier à 4 reps, Hard |
| Référence | Valeur mesurée lors d'un test, base des charges en pourcentage | Max hang 10s, 20 mm, half crimp : +24 kg |

## 3. Bibliothèque d'exercices

En V1, la bibliothèque est fournie par l'app (seedée en base) et ni l'athlète ni le coach ne peuvent créer d'exercice. Elle est rédigée directement en base (toi et tes agents IA) : au lancement, des exercices d'escalade qui couvrent chaque schéma de dosage, et un catalogue de renforcement plus large. Chaque exercice déclare un schéma de dosage et la liste des mesures qui le concernent : c'est ce qui rend le timer et le log génériques.

### Attributs d'un exercice

| Attribut | Valeurs | Usage |
| --- | --- | --- |
| Nom, description, consignes | Texte (EN) | Affichage |
| Catégorie | Fingers, Strength, Climbing / Skills, Mobility / Flexibility, Conditioning, Warm-up | Filtre et groupement principal |
| Muscles principaux / secondaires | Liste fermée (forearm flexors, lats, core...) | Filtre |
| Équipement | Hangboard, barre, blocs, poutre, haltères, poulie, aucun... | Filtre |
| Schéma de dosage | Un des 6 schémas ci-dessous | Timer et formulaire de log |
| Mesures pertinentes | Sous-ensemble de la liste des mesures | Champs proposés à la prescription et au log |
| Échelle d'effort par défaut | RPE, RIR ou qualitative | Modifiable par prescription |
| Unilatéral possible | Oui / non | Choix de la main ; le timer enchaîne gauche puis droite |
| Médias | Vidéo, schéma (contenu à définir) | Affichage |

### Schémas de dosage

| Schéma | Structure | Ce que fait le timer | Exemple |
| --- | --- | --- | --- |
| Reps | sets × reps, repos entre sets | Compte à rebours de repos | Tractions lestées 4 × 5, RIR 2 |
| Isométrie | sets × durée, repos entre sets | Préparation, ON, repos | Max hangs 10s × 6, repos 3 min |
| Intervalles | sets × reps × (ON / OFF), repos entre sets | Cycle complet ON / OFF puis repos | Repeaters 7s ON / 7s OFF × 5 reps × 6 sets, repos 3 min |
| Circuit | N éléments × M tours, repos entre tours | Repos entre tours, chrono pendant le tour | 4x4 : 4 blocs × 4 tours, repos 4 min |
| Créneaux | N créneaux de durée fixe, une tentative par créneau | Un décompte par créneau, bip au changement | Volume boulder : 3 min × 20 |
| Durée libre | Une durée totale, résultats saisis librement | Chrono ou compte à rebours | Max effort climbing : 60 min |

La notation compacte s'écrit du plus petit au plus grand : `7s × 5 reps × 6 sets`.

### Mesures

| Mesure | Valeurs | Remarques |
| --- | --- | --- |
| Charge | Absolue, ajoutée (lest), retirée (délestage poulie), % d'une référence | Facultative à la prescription |
| Prise | Type × doigts × main | Voir ci-dessous |
| Support | Taille du bord (mm), prise ou poutre utilisée |  |
| Cotation | Bloc (Font, V-scale), voie (FR, YDS) | Système choisi dans les réglages |
| Tempo, amplitude | Texte court ou valeurs | Pour le renforcement classique |
| Résultat | Réussi / échoué, reps ou durée réalisées | Pré-rempli à "réussi" |
| Effort | RPE 1 à 10, RIR 0 à 5, ou Easy / Moderate / Hard / Very hard / Max | Échelle choisie par prescription |

### Saisie de la prise

La prise est stockée comme une combinaison, pour permettre des stats par prise, mais se saisit en trois choix rapides :

1. **Type** : Half crimp, Full crimp, Open hand / Drag, Pocket, Pinch, Sloper
2. **Doigts** : 4, 3 (front / back), 2 (front / middle / back), mono
3. **Main** : deux mains, gauche, droite

Les combinaisons récentes apparaissent en raccourci ("4F HC", "3F Drag").

### Recherche

Recherche texte, filtres cumulables (catégorie, muscles, équipement, schéma), groupement par catégorie ou par muscle, et favoris. C'est un point faible cité de Lattice, donc une priorité d'ergonomie.

### Exercices d'escalade à modéliser en premier

Cette liste sert de jeu de validation : si ces exercices se prescrivent, se chronomètrent et se loguent sans contorsion, le modèle tient.

| Exercice | Schéma | Ce qu'il vérifie |
| --- | --- | --- |
| Max hangs | Isométrie | Charge en % d'une référence, prise, bord |
| Repeaters | Intervalles | Cycle ON / OFF, repos entre sets |
| One-arm hang | Isométrie | Unilatéral alterné, délestage à la poulie |
| Finger lifts (pick-ups) | Reps | Charge lourde, prise, une ou deux mains |
| Test max hang 10s | Isométrie (test) | Production d'une référence |
| 4x4 | Circuit | Tours × blocs, cotation par bloc |
| Volume boulder | Créneaux | Un bloc par créneau de 3 min |
| Max effort climbing | Durée libre | Liste facultative de blocs réussis |
| Tractions lestées | Reps | Renforcement classique, RIR |
| Échauffement doigts progressif | Isométrie | Échauffement comme exercice ordinaire |

## 4. Programmes

Un programme est calé sur des jours précis, ne se recale jamais tout seul, et peut être suivi en parallèle d'autres programmes. Les charges sont facultatives : le coach (ou l'athlète) peut les laisser vides, les fixer en kg, ou les exprimer en % d'une référence testée.

### Structure et calendrier

- Programme → phases (facultatives) → semaines → jours → séances → prescriptions ordonnées.
- Chaque séance porte un jour relatif (semaine 3, mardi). L'inscription fixe la date de début (toujours un lundi ; la semaine 1 va du lundi au dimanche) et donc les dates réelles. L'athlète peut décaler d'un coup, par semaines entières, toutes les séances à partir d'une semaine choisie (vacances, blessure) ; les séances passées restent en place.
- Plusieurs inscriptions actives en même temps : le jour J affiche toutes les séances prévues, sans détection de conflit. Un filtre par programme permet de "switcher".
- Les programmes "coach" de la V1 sont insérés en base, rattachés au coach factice et inscrits pour l'athlète.

### Séance manquée

- Rien ne bouge : la séance passe au statut "manquée" dans le calendrier.
- L'athlète peut ouvrir n'importe quelle séance passée et la loguer quand il veut. Le log garde la date réelle, mais valide la séance prévue, qui reste à sa place dans le calendrier.

### Modification en cours de programme

- L'auteur (athlète pour ses programmes, coach pour les siens) peut modifier un programme déjà commencé.
- Les modifications s'appliquent aux séances non encore loguées ; les logs existants ne changent jamais.
- L'athlète est notifié quand un coach modifie son programme (V2).

### Templates coach (V2)

- Le coach construit des templates, puis les copie pour un client. La copie est indépendante et peut être personnalisée.
- Modifier un template crée une nouvelle version ; les copies déjà données à des clients ne bougent pas.
- Côté client, tout est du suivi personnalisé : il ne voit jamais la notion de template.

### Progression des charges

Deux façons de faire, combinables :

1. **Saisie manuelle rapide** : dupliquer une semaine ou une séance, et une vue en grille (exercice × semaines) pour modifier les charges ou volumes d'un coup d'œil.
2. **Règles de progression** sur une prescription : "+2 kg par semaine", "+5 % par semaine", "80 % de la référence". La règle génère des valeurs semaine par semaine, que l'auteur peut ensuite retoucher une à une.

Chaque prescription accepte aussi une note libre de l'auteur ("si facile, +2 kg au set suivant").

### Phases de test

- Une séance (ou une phase) peut être marquée "test". Un exercice de test produit une **référence** (ex : max hang 10s, 20 mm, half crimp).
- Les références sont communes à tous les programmes de l'athlète : les prescriptions en % utilisent la dernière référence correspondante, quel que soit le programme qui l'a produite. Tant qu'il n'y a pas de référence, l'app affiche le % et laisse la charge vide.
- Un nouveau test en cours de programme met à jour les charges des séances suivantes.

## 5. Exécution : dashboard, timer, log

Tout le parcours d'une séance (consulter, lancer le timer, loguer) doit fonctionner hors ligne, écran verrouillé compris pour le timer. Le log part du principe que l'athlète a réussi ce qui était prévu : il ne corrige que les écarts.

### Dashboard du jour

- Séances du jour de toutes les inscriptions, groupées par programme.
- Séances manquées récentes, loguables en un tap.
- Bouton "Ajouter un exercice" pour une séance libre à la date du jour.
- Quelques stats rapides (séances de la semaine, dernier max hang).

### Calendrier

Vue semaine et vue mois, navigation rapide entre périodes, statut de chaque séance (prévue, faite, manquée), filtre par programme. C'est l'autre point faible cité de Lattice.

### Timer

Le timer est généré à partir du schéma de dosage de la prescription. Pour `Repeaters 7s × 5 reps × 6 sets, repos 3 min` :

1. Préparation : 10s → 0
2. Rep 1 : ON 7s → 0, puis OFF 7s → 0
3. Répéter jusqu'à la rep 5 (le dernier OFF est remplacé par le repos)
4. Repos entre sets : 3 min → 0
5. Recommencer jusqu'au set 6

Comportement attendu :

- Signaux sonores : décompte 3-2-1 avant chaque ON, bip de début et de fin.
- Écran verrouillé ou app en arrière-plan : les sons continuent (audio en arrière-plan), l'affichage n'est pas nécessaire, et le timer se recale immédiatement au retour au premier plan.
- Pause, reprise, passer le repos, ajouter 30s de repos.
- Durée de préparation configurable (10s par défaut). Exercice unilatéral : le timer alterne gauche et droite à chaque set, avec 10s de repos entre les deux côtés (réglable), et le côté en cours est affiché en très grand.
- À la fin (ou à l'arrêt), le timer pré-remplit le log avec ce qui a été fait : arrêt au set 4, rep 3 → log pré-rempli avec 3 sets complets et 2 reps au 4e.

### Log intelligent

Ordre de pré-remplissage de chaque champ :

1. La valeur prescrite (charge en kg, ou calculée depuis la référence).
2. Sinon, la dernière réalisation du même exercice avec les mêmes paramètres (prise, bord).
3. Sinon, vide.

Règles de saisie :

- Reps et durées pré-remplies à la valeur prescrite, résultat à "réussi".
- Saisie par set, avec "appliquer à tous les sets" pour aller vite.
- Effort saisi sur l'échelle choisie dans la prescription (RPE, RIR ou qualitative).
- Circuit (4x4) : un tableau tours × blocs, chaque bloc avec cotation et réussi / échoué, sans nom.
- Créneaux (volume boulder) : une ligne par créneau = un bloc, cotation et résultat.
- Durée libre (max effort climbing) : liste facultative et illimitée de blocs réussis avec leur cotation.

### Séance libre

L'athlète peut ajouter un ou plusieurs exercices à un jour donné, hors programme, et les loguer de la même façon.

### Hors ligne

- Bibliothèque, programmes inscrits, timer et log disponibles sans réseau.
- Synchronisation automatique au retour du réseau.
- En V1, un seul utilisateur : les conflits de synchronisation se limitent à l'usage sur plusieurs appareils.

## 6. Stats

La seule stat impérative en V1 est la progression des max hangs. Les autres sont des propositions à valider.

| Stat | Détail | Statut |
| --- | --- | --- |
| Progression max hangs | Charge absolue dans le temps, et en % du poids de corps si celui-ci est renseigné (saisi une fois dans le profil, facultatif), par combinaison prise × bord × durée | V1, impératif |
| Historique par exercice | Toutes les réalisations d'un exercice, record personnel | V1 (écran Progress) |
| Assiduité | Séances faites / prévues, par semaine | V1 (écran Progress) |
| Volume hebdo | Par catégorie (doigts, renfo, grimpe), en séances ou en temps | Plus tard |
| Évolution de l'effort | Effort moyen ressenti sur un exercice à charge égale | Plus tard |

## 7. Coachs (V2)

L'app se rémunère par un abonnement coach, qui déverrouille l'accès quel que soit le nombre de clients ; le paiement entre coach et client se fait hors app. La V1 n'expose rien de tout ça, mais le modèle de données doit déjà prévoir la notion de coach.

- **Mise en relation** : marketplace avec profils publics, et invitation par lien ou code.
- **Plusieurs coachs** par athlète, chacun avec ses programmes.
- **Visibilité** : le coach voit les logs de ses clients, sans rien d'intrusif (aucune alerte ni message automatique).
- **Communication** : hors app au départ ; un chat simple est envisageable ensuite.
- **Modification** d'un programme en cours par le coach, avec notification au client.
- **Outil de création** : interface web / desktop pour construire des programmes longs confortablement.
- **Dashboard coach** : vue de ses clients, sans alertes intrusives sur leur assiduité.

## 8. Exigences transverses et questions ouvertes

### Exigences transverses

- Interface en anglais uniquement.
- Unités configurables : kg / lbs ; cotations bloc (Font, V-scale) et voie (FR, YDS).
- Hors ligne d'abord : aucune action de séance ne dépend du réseau.
- Timer fiable en arrière-plan, avec sons.

### Décisions du tour 2

| Sujet | Décision |
| --- | --- |
| Visibilité coach | Le coach voit les logs, sans alerte ni message automatique |
| Date de début | Toujours un lundi ; décalage possible |
| Log a posteriori | Date réelle enregistrée, séance prévue validée sans être déplacée |
| Préhension | Liste de types validée ; 3FD = Drag + 3 doigts |
| Poids de corps | Saisi une fois dans le profil, facultatif, sans historique |
| Supersets | Pas de supersets dans l'app |
| Unilatéral | Timer gauche puis droite, côté en cours très visible |
| Échauffement | Un exercice comme un autre (catégorie Warm-up) |
| Phases de test | En V1 |
| Compte et données | V1 locale, sans compte ; modèle de données prêt pour un backend (identifiants uniques, horodatage, synchronisation) |
| Plateformes | iOS uniquement en V1 (voir décisions techniques) |

### Décisions du tour 3

| Sujet | Décision |
| --- | --- |
| Unilatéral | Alternance gauche / droite à chaque set, 10s de repos entre les côtés |
| Décalage | Par semaines entières, à partir d'une semaine choisie |
| Références | Communes à tous les programmes de l'athlète |
| Bibliothèque initiale | Rédigée en base (toi et tes agents IA) : escalade couvrant chaque schéma, renforcement plus large |

### Décisions techniques

| Sujet | Décision |
| --- | --- |
| Plateformes | iOS uniquement en V1 ; Android plus tard |
| Audio du timer | `expo-audio`, avec lecture en arrière-plan (`enableBackgroundPlayback`, `shouldPlayInBackground`) et en mode silencieux (`playsInSilentMode`) |
| Effet verre | `expo-glass-effect` conservé, limité à la navigation (voir `design-system.md` §5) |
| Pause d'un programme | Les séances sont masquées pendant la pause et ne deviennent pas manquées ; le décalage est proposé à la reprise |

Les specs fonctionnelles de la V1 sont considérées comme complètes. La mécanique du timer est décrite dans `timer.md`. Prochaine étape : le prototype du timer sur appareil.
