import { type ComponentType, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  type Card,
  type Suit,
  rankLabel,
  rankOf,
  suitSymbol,
} from "@/features/euchre/lib/cards";
import { type Phase, type Seat, type Team } from "@/features/euchre/lib/types";
import type { PlayerView } from "@/features/euchre/lib/view";
import { TEAM_NAMES } from "@/features/table/lib/seats";
import type { PlayerIntent } from "@/features/table/transport/lib/protocol";
import { ActionButton } from "@/components/ActionButton";
import { spacing } from "@/lib/theme";
import { HandSummary } from "../components/HandSummary";
import { SuitButton } from "../components/SuitButton";

export type SeatNames = Record<Seat, string>;

export type PhaseControlsProps = {
  view: PlayerView;
  names: SeatNames;
  onIntent: (intent: PlayerIntent) => void;
};

export type PhasePanel = {
  /** What the table is waiting for, or null when the controls say it. */
  status(view: PlayerView, names: SeatNames): string | null;
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
  return (
    <View style={styles.panel}>
      <Row>
        <AloneToggle alone={alone} onChange={setAlone} />
      </Row>
      <Row>
        <ActionButton
          compact
          label={view.seat === view.dealer ? "Pick it up" : "Order it up"}
          onPress={() => onIntent({ type: "order-up", alone })}
        />
        <ActionButton
          compact
          label="Pass"
          tone="secondary"
          onPress={() => onIntent({ type: "pass" })}
        />
      </Row>
    </View>
  );
};

const CallTrumpControls = ({ view, onIntent }: PhaseControlsProps) => {
  const [alone, setAlone] = useState(false);
  const mustCall = view.rules.stickTheDealer && view.seat === view.dealer;
  return (
    <View style={styles.panel}>
      <Row>
        {view.callableSuits.map((suit) => (
          <SuitButton
            key={suit}
            suit={suit}
            onPress={() => onIntent({ type: "call-trump", suit, alone })}
          />
        ))}
      </Row>
      <Row>
        <AloneToggle alone={alone} onChange={setAlone} />
        <ActionButton
          compact
          label={mustCall ? "You are stuck" : "Pass"}
          tone="secondary"
          disabled={mustCall}
          onPress={() => onIntent({ type: "pass" })}
        />
      </Row>
    </View>
  );
};

const HandOverControls = ({ view, names, onIntent }: PhaseControlsProps) => (
  <View style={styles.panel}>
    {view.lastHand === null ? null : <HandSummary result={view.lastHand} names={names} />}
    <ActionButton
      compact
      label="Deal the next hand"
      onPress={() => onIntent({ type: "next-hand" })}
    />
  </View>
);

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
    status: (view, names) => `${names[view.turn]} to name trump`,
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
    status: () => null,
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
  panel: { gap: spacing.sm, alignItems: "center", alignSelf: "stretch" },
  row: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", justifyContent: "center" },
});
