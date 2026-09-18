import { type ComponentType, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  type Card,
  type Suit,
  rankLabel,
  rankOf,
  suitName,
  suitSymbol,
} from "@/features/euchre/lib/cards";
import { type Phase, type Seat, type Team } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import { TEAM_NAMES } from "@/features/table/lib/seats";
import type { PlayerIntent } from "@/features/table/transport/lib/protocol";
import { ActionButton } from "@/components/ActionButton";
import { colors, spacing, typography } from "@/lib/theme";

export type SeatNames = Record<Seat, string>;

export type PhaseControlsProps = {
  view: PlayerView;
  names: SeatNames;
  onIntent: (intent: PlayerIntent) => void;
};

export type PhasePanel = {
  /** What the table is waiting for, for every seat to read. */
  status(view: PlayerView, names: SeatNames): string;
  /** Buttons for the seat on turn, or null when the hand is the only control. */
  Controls: ComponentType<PhaseControlsProps> | null;
  /** What tapping a card means, or null when cards are not tappable. */
  cardIntent: ((card: Card) => PlayerIntent) | null;
  /** True when a seat that is not on turn may use the controls. */
  actableOffTurn: boolean;
  playable(view: PlayerView): readonly Card[];
};

const cardLabel = (card: Card): string =>
  `${rankLabel(rankOf(card))}${suitSymbol(card[1] as Suit)}`;

const noCards = (): readonly Card[] => [];

const Row = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.row}>{children}</View>
);

const AloneToggle = ({ alone, onChange }: { alone: boolean; onChange: (next: boolean) => void }) => (
  <ActionButton
    label={alone ? "Going alone ✓" : "Go alone"}
    tone={alone ? "primary" : "secondary"}
    compact
    onPress={() => onChange(!alone)}
  />
);

const OrderUpControls = ({ view, onIntent }: PhaseControlsProps) => {
  const [alone, setAlone] = useState(false);
  const isDealer = view.seat === view.dealer;
  return (
    <View style={styles.panel}>
      {view.upcard === null ? null : (
        <Text style={styles.prompt}>
          Turned up: <Text style={styles.strong}>{cardLabel(view.upcard)}</Text>
        </Text>
      )}
      <Row>
        <AloneToggle alone={alone} onChange={setAlone} />
      </Row>
      <Row>
        <ActionButton
          label={isDealer ? "Pick it up" : "Order it up"}
          onPress={() => onIntent({ type: "order-up", alone })}
        />
        <ActionButton label="Pass" tone="secondary" onPress={() => onIntent({ type: "pass" })} />
      </Row>
    </View>
  );
};

const CallTrumpControls = ({ view, onIntent }: PhaseControlsProps) => {
  const [alone, setAlone] = useState(false);
  const mustCall = view.rules.stickTheDealer && view.seat === view.dealer;
  return (
    <View style={styles.panel}>
      <Text style={styles.prompt}>
        {mustCall ? "You are stuck — name a suit." : "Name a suit, or pass."}
      </Text>
      <Row>
        <AloneToggle alone={alone} onChange={setAlone} />
      </Row>
      <Row>
        {view.callableSuits.map((suit) => (
          <ActionButton
            key={suit}
            compact
            label={`${suitSymbol(suit)} ${suitName(suit)}`}
            onPress={() => onIntent({ type: "call-trump", suit, alone })}
          />
        ))}
      </Row>
      {mustCall ? null : (
        <Row>
          <ActionButton label="Pass" tone="secondary" onPress={() => onIntent({ type: "pass" })} />
        </Row>
      )}
    </View>
  );
};

const HandOverControls = ({ onIntent }: PhaseControlsProps) => (
  <View style={styles.panel}>
    <Row>
      <ActionButton label="Deal the next hand" onPress={() => onIntent({ type: "next-hand" })} />
    </Row>
  </View>
);

const handResultText = (view: PlayerView, names: SeatNames): string => {
  const result = view.lastHand;
  if (result === null) return "The hand is over.";
  const maker = names[result.maker];
  const team = TEAM_NAMES[result.scoringTeam as Team];
  const alone = result.alone ? " alone" : "";
  return result.euchred
    ? `${maker} was euchred in ${suitName(result.trump)}${alone}. ${team} take ${result.points}.`
    : `${maker} made ${suitName(result.trump)}${alone} with ${result.makerTricks} tricks. ${team} take ${result.points}.`;
};

const phasePanels: Record<Phase, PhasePanel> = {
  "bidding-up": {
    status: (view, names) =>
      `${names[view.turn]} to bid on ${view.upcard === null ? "the upcard" : cardLabel(view.upcard)}`,
    Controls: OrderUpControls,
    cardIntent: null,
    actableOffTurn: false,
    playable: noCards,
  },
  "bidding-call": {
    status: (view, names) =>
      `${names[view.turn]} to name trump${
        view.upcard === null ? "" : ` (${cardLabel(view.upcard)} turned down)`
      }`,
    Controls: CallTrumpControls,
    cardIntent: null,
    actableOffTurn: false,
    playable: noCards,
  },
  "dealer-discard": {
    status: (view, names) => `${names[view.dealer]} picks up and discards`,
    Controls: null,
    cardIntent: (card) => ({ type: "discard", card }),
    actableOffTurn: false,
    playable: (view) => view.hand,
  },
  playing: {
    status: (view, names) => `${names[view.turn]} to play`,
    Controls: null,
    cardIntent: (card) => ({ type: "play-card", card }),
    actableOffTurn: false,
    playable: (view) => view.legalPlays,
  },
  "hand-over": {
    status: handResultText,
    Controls: HandOverControls,
    cardIntent: null,
    actableOffTurn: true,
    playable: noCards,
  },
  "game-over": {
    status: (view) =>
      view.winner === null
        ? "The game is over."
        : `${TEAM_NAMES[view.winner]} win ${view.score[view.winner]}–${
            view.score[(1 - view.winner) as Team]
          }`,
    Controls: null,
    cardIntent: null,
    actableOffTurn: false,
    playable: noCards,
  },
};

export const panelFor = (phase: Phase): PhasePanel => phasePanels[phase];

const styles = StyleSheet.create({
  panel: { gap: spacing.sm, alignItems: "center" },
  row: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", justifyContent: "center" },
  prompt: { ...typography.body, color: colors.inkMuted, textAlign: "center" },
  strong: { color: colors.ink, fontWeight: "800" },
});
