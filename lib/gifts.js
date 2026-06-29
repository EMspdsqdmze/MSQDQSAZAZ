export const GIFTS = [
  { id: "snap-plus", label: "Snap Plus", category: "classic", needsGamePseudo: true, pseudoLabel: "Pseudo Snap" },
  { id: "robux", label: "Robux", category: "classic", needsGamePseudo: true },
  { id: "vbucks", label: "V-Bucks", category: "classic", needsGamePseudo: true },
  { id: "psn-card", label: "Carte PSN", category: "classic", needsGamePseudo: false },
  { id: "xbox-card", label: "Carte Xbox", category: "classic", needsGamePseudo: false },
  { id: "brawl-pass", label: "Brawl Pass", category: "classic", needsGamePseudo: true },
  { id: "brawl-pass-plus", label: "Brawl Pass Plus", category: "classic", needsGamePseudo: true },
  { id: "brawl-pass-pro", label: "Brawl Pass Pro", category: "classic", needsGamePseudo: true },
  { id: "brainrot-dragon-cannelloni", label: "Dragon Cannelloni", category: "brainrot", needsGamePseudo: true },
  { id: "brainrot-strawberry-elephant", label: "Strawberry Elephant", category: "brainrot", needsGamePseudo: true }
];

export function findGift(id) {
  return GIFTS.find((gift) => gift.id === id);
}
