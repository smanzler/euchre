import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import type { Card } from "@/features/euchre/lib/cards";
import { CardView } from "./CardView";

// Keep hold plus sweep below the bot move delay, so a bot lead does not cut the sweep.
const HOLD_MS = 450;
const SWEEP_MS = 300;

/** A unit step on the screen axes. */
export type SweepDirection = { x: -1 | 0 | 1; y: -1 | 0 | 1 };

type SweptCardProps = {
  card: Card;
  dimmed: boolean;
  /** Set when the trick is won; the card then leaves the screen this way. */
  sweep: SweepDirection | null;
};

export const SweptCard = ({ card, dimmed, sweep }: SweptCardProps) => {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value =
      sweep === null
        ? 0
        : withDelay(
            HOLD_MS,
            withTiming(1, {
              duration: SWEEP_MS,
              easing: Easing.in(Easing.quad),
            }),
          );
  }, [sweep, progress]);

  const dx = (sweep?.x ?? 0) * width;
  const dy = (sweep?.y ?? 0) * height;
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: dx * progress.value },
      { translateY: dy * progress.value },
    ],
  }));

  return (
    <Animated.View style={style}>
      <CardView card={card} size="lg" dimmed={dimmed} />
    </Animated.View>
  );
};
