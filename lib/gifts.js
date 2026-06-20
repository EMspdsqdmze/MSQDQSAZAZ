export const GIFTS = [
  { id: "snap-plus", label: "Snap Plus", needsGamePseudo: true, pseudoLabel: "Pseudo Snap" },
  { id: "robux", label: "Robux", needsGamePseudo: true },
  { id: "vbucks", label: "V-Bucks", needsGamePseudo: true },
  { id: "psn-card", label: "Carte PSN", needsGamePseudo: false },
  { id: "xbox-card", label: "Carte Xbox", needsGamePseudo: false },
  { id: "brawl-pass", label: "Brawl Pass", needsGamePseudo: true },
  { id: "brawl-pass-plus", label: "Brawl Pass Plus", needsGamePseudo: true },
  { id: "brawl-pass-pro", label: "Brawl Pass Pro", needsGamePseudo: true }
];

export function findGift(id) {
  return GIFTS.find((gift) => gift.id === id);
}
