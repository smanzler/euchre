import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import type { Card } from "@/features/euchre/lib/cards";
import { CardView } from "./CardView";

export const GATHER_MS = 380;

/** The four cards stay put long enough to be read before they are swept up. */
export const GATHER_HOLD_MS = 320;

const SHRINK = 0.25;
const FADE = 0.8;

type TrickCardProps = {
  card: Card;
  /** Offset toward the seat taking the trick. Zero while the trick is live. */
  gatherX: number;
  gatherY: number;
};

/** A card on the felt, which slides to the winner once the trick is settled. */
export const TrickCard = ({ card, gatherX, gatherY }: TrickCardProps) => {
  const gathered = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const gathering = gatherX !== 0 || gatherY !== 0;

  useEffect(() => {
    if (reducedMotion) {
      gathered.value = gathering ? 1 : 0;
      return;
    }
    gathered.value = gathering
      ? withDelay(GATHER_HOLD_MS, withTiming(1, { duration: GATHER_MS }))
      : 0;
  }, [gathering, gathered, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: gatherX * gathered.value },
      { translateY: gatherY * gathered.value },
      { scale: 1 - gathered.value * SHRINK },
    ],
    opacity: 1 - gathered.value * FADE,
  }));

  return (
    <Animated.View style={style}>
      <CardView card={card} size="lg" />
    </Animated.View>
  );
};
