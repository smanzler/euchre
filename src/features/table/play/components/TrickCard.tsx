import { useEffect } from "react";
import type { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import type { Card } from "@/features/euchre/lib/cards";
import { CardView } from "./CardView";

/** The pile must clear before the next card lands, so keep the sweep short. */
const HOLD_MS = 120;
const STAGGER_MS = 55;
const SLIDE_MS = 230;
const FADE_MS = 150;
/** Each card sits a little off the one below it, so the pile reads as cards. */
const STACK_STEP = 3;
const STACK_TILT = 5;

export type Point = { x: number; y: number };

export type TrickSweep = {
  /** The step from this card to the card of the seat that won. */
  toX: number;
  toY: number;
  order: number;
  count: number;
};

type TrickCardProps = {
  card: Card;
  dimmed: boolean;
  /** Set once the trick is won, and null while it runs. */
  sweep: TrickSweep | null;
  onAnchor: (point: Point) => void;
};

export const TrickCard = ({ card, dimmed, sweep, onAnchor }: TrickCardProps) => {
  const box = useAnimatedRef<View>();
  const slide = useSharedValue(0);
  const fade = useSharedValue(0);
  const sweeping = sweep !== null;
  const toX = sweep?.toX ?? 0;
  const toY = sweep?.toY ?? 0;
  const order = sweep?.order ?? 0;
  const count = sweep?.count ?? 1;

  useEffect(() => {
    if (!sweeping) {
      slide.value = 0;
      fade.value = 0;
      return;
    }
    slide.value = withDelay(
      HOLD_MS + order * STAGGER_MS,
      withTiming(1, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) }),
    );
    // The whole pile goes at once, so wait for the last card to land.
    fade.value = withDelay(
      HOLD_MS + (count - 1) * STAGGER_MS + SLIDE_MS,
      withTiming(1, { duration: FADE_MS }),
    );
  }, [count, fade, order, slide, sweeping]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - fade.value,
    transform: [
      { translateX: (toX + order * STACK_STEP) * slide.value },
      { translateY: (toY + order * STACK_STEP) * slide.value },
      { rotate: `${(order - (count - 1) / 2) * STACK_TILT * slide.value}deg` },
    ],
  }));

  const anchor = (): void => {
    box.current?.measureInWindow((x, y, width, height) => {
      onAnchor({ x: x + width / 2, y: y + height / 2 });
    });
  };

  return (
    <Animated.View ref={box} onLayout={anchor} style={style}>
      <CardView card={card} size="lg" dimmed={dimmed} />
    </Animated.View>
  );
};
