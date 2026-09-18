import { type Card, DECK } from "./cards";
import { type Seat, SEATS } from "./types";

/** One mulberry32 step. The caller threads the state so a deal is repeatable. */
const nextRandom = (state: number): { value: number; state: number } => {
  const next = (state + 0x6d2b79f5) >>> 0;
  let mixed = next;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return { value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296, state: next };
};

export const randomSeed = (): number => (Math.random() * 0xffffffff) >>> 0;

export const shuffle = <T>(items: readonly T[], seed: number): { items: T[]; seed: number } => {
  const out = [...items];
  let state = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    const step = nextRandom(state);
    state = step.state;
    const j = Math.floor(step.value * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return { items: out, seed: state };
};

export const HAND_SIZE = 5;

export type Deal = {
  hands: Record<Seat, readonly Card[]>;
  upcard: Card;
  seed: number;
};

export const deal = (seed: number): Deal => {
  const shuffled = shuffle(DECK, seed);
  const hands = {} as Record<Seat, readonly Card[]>;
  SEATS.forEach((seat, index) => {
    hands[seat] = shuffled.items.slice(index * HAND_SIZE, (index + 1) * HAND_SIZE);
  });
  return {
    hands,
    upcard: shuffled.items[SEATS.length * HAND_SIZE] as Card,
    seed: shuffled.seed,
  };
};
