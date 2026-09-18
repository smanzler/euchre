# Euchre

A four player euchre table for phones, over Bluetooth LE.

One device hosts. It owns the game state and sends every other seat a view
that holds only that seat's cards, so no device ever sees a hand it should
not. Players send moves, never state.

## Run it

Bluetooth needs native code, so Expo Go cannot run this app. Build a
development client once, then iterate with Metro:

```sh
pnpm install
npx expo prebuild          # writes ios/ and android/
pnpm ios                   # or: pnpm android
```

`pnpm start` then reloads JavaScript into the installed dev client.

You do not need a second device to try the game: **Play against bots**
runs a full four handed game on one device with no radio at all.

## Play

- **Host over Bluetooth** advertises the table. Three phones join it. Fill
  any seat nobody takes with a bot.
- **Find nearby tables** scans for a host and takes the next open seat. A
  late arrival takes a bot's chair if no seat is open.
- **Play against bots** deals you in against three of them, with no radio.
- **Pass and play** runs all four seats on one device, with a handoff
  screen between turns.

## Bots

A bot is a pure function from the view a seat is allowed to see to the
move it makes, in `src/features/table/bots/lib/`. It counts a hand in
hundredths of a trick, so a threshold never lands on a floating point
edge: bowers, trump, off suit aces and a void with trump to ruff. It
orders up at about three tricks and goes alone near five. In play it
pulls trump as the maker, leads an off suit ace otherwise, takes a trick
with the cheapest card that wins, and throws its lowest card under a
partner who already holds it. It never deals the next hand, because a
person reads the score.

The host runs a bot's move on a timer so the table is readable. Tests
pass a scheduler that runs at once, which lets one test play a whole
game of bots against bots to ten points.

## Rules

Twenty four cards, nine to ace. The jack of trump is the right bower and
the jack of the same colour is the left bower, and both count as trump.
Order up or pass, then name a suit or pass, with the dealer stuck on the
second round. Makers take three or four tricks for a point, all five for
two, all five alone for four; defenders take two for a euchre. First team
to ten wins.

## Layout

```
app/                     routes; each one re-exports a screen
src/features/
  euchre/lib/            the rules, with no react and no io
  table/
    lib/                 host and client runtimes, and the store the ui reads
    bots/lib/            hand values and the move a bot makes
    lobby/, play/        the screens and their parts
    transport/
      lib/               the driver interface, the registry and the wire format
      local/, ble/       one driver each
  home/
src/components/, src/lib/
modules/euchre-ble-peripheral/
```

`src/features/table/transport/lib/registry.ts` maps a transport kind to a
driver. A new way to carry messages is one more driver and one more entry.

## The Bluetooth host

`react-native-ble-plx` only speaks the central role, so it can join a table
but cannot be one. The host side is a local Expo module,
`modules/euchre-ble-peripheral`, that runs a GATT server:
`CBPeripheralManager` on iOS and `BluetoothGattServer` on Android. It
advertises one service with two characteristics, one that clients write to
and one that notifies them. Messages are JSON, cut into base64 frames that
fit the negotiated MTU and rebuilt on the far side.

The rules engine, the protocol, the bots and the host runtime are covered
by tests (`pnpm test`), including a host joined to three clients through
the real framer. The native module has not run on hardware yet: build the
dev client on two devices to try it.
