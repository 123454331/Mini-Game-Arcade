/**
 * MINI GAME ARCADE - CENTRAL GAMES REGISTRY
 * All playable games on the platform are registered here.
 * Adding a new game only requires adding an entry to this array.
 */

export const CATEGORIES = [
  "All Games",
  "Action & Survival",
  "Arcade & Reflex"
];

export const GAMES = [
  {
    id: "cosmic-dodge",
    title: "Cosmic Dodge",
    category: "Action & Survival",
    badge: "10 Sectors",
    description: "Pilot your cartoon starship through asteroid swarms, evade enemy laser drones, collect stars, and survive 10 handcrafted sectors.",
    thumbnail: "assets/thumbnails/cosmic-dodge.svg",
    path: "games/cosmic-dodge/index.html",
    tags: ["Space", "Survival", "10 Levels", "Power-ups"],
    releaseDate: "2026-10",
    controls: {
      desktop: "WASD or Arrow keys to move, Spacebar for Emergency Shield, Esc / P to pause.",
      mobile: "Touch & drag spaceship smoothly; tap on-screen Shield button."
    },
    features: [
      "10 progressively challenging sectors with distinct objectives",
      "Dynamic cartoon spaceship with banking tilt & thruster physics",
      "Near-miss bonus system with up to 4.0x combo multiplier",
      "100% procedural Web Audio sound synthesizer & synth-wave music",
      "Persistent level progression & high scores via localStorage"
    ]
  },
  {
    id: "fruit-slicer",
    title: "Fruit Slicer",
    category: "Arcade & Reflex",
    badge: "Juicy Combos",
    description: "Swipe your blade to slice airborne watermelons, oranges, bananas, and pineapples into halves while dodging hazardous bombs!",
    thumbnail: "assets/thumbnails/fruit-slicer.svg",
    path: "games/fruit-slicer/index.html",
    tags: ["Arcade", "Reflex", "Combos", "Juice Splatter"],
    releaseDate: "2026-10",
    controls: {
      desktop: "Click and drag mouse rapidly across fruits to slice.",
      mobile: "Swipe one or multiple fingers across tossed fruits."
    },
    features: [
      "Realistic tossed-fruit physics with gravity, spin, and clean slicing cuts",
      "Juice splatters, glowing blade trails, and splitting fruit halves",
      "Combos for slicing 3+ fruits in a single swipe",
      "Dodge dangerous ticking bombs with fuse sparks",
      "Classic 3-strike mode with local high score persistence"
    ]
  }
];

export function getGameById(id) {
  return GAMES.find(g => g.id === id) || null;
}

