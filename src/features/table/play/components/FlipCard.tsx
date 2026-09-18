import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import type { Card } from "@/features/euchre/lib/cards";
import { CardView, type CardSize } from "./CardView";

export const FLIP_MS = 420;

/** Long enough that the card is seen face down before it turns. */
export const FLIP_DELAY_MS = 260;

const PERSPECTIVE = 700;

type FlipCardProps = {
  card: Card;
  size?: CardSize;
  dimmed?: boolean;
  /** Turning this over runs the flip again. */
  flipKey: string | number;
};

/** Shows a card back and turns it face up, the way a dealer turns the upcard. */
export const FlipCard = ({ card, size = "md", dimmed = false, flipKey }: FlipCardProps) => {
  const turned = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      turned.value = 1;
      return;
    }
    turned.value = 0;
    turned.value = withDelay(FLIP_DELAY_MS, withTiming(1, { duration: FLIP_MS }));
  }, [flipKey, reducedMotion, turned]);

  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: PERSPECTIVE }, { rotateY: `${turned.value * 180}deg` }],
  }));
  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: PERSPECTIVE }, { rotateY: `${turned.value * 180 - 180}deg` }],
  }));

  return (
    <View>
      <Animated.View style={[styles.side, back]}>
        <CardView card={card} size={size} faceDown />
      </Animated.View>
      <Animated.View style={[styles.side, styles.front, front]}>
        <CardView card={card} size={size} dimmed={dimmed} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  side: { backfaceVisibility: "hidden" },
  front: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
});
