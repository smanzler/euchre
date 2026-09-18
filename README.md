# Euchre

A four player euchre table for phones, over Bluetooth LE.

One device hosts. It owns the game state and sends every other seat a view
that holds only that seat's cards, so no device ever sees a hand it should
not. Players send moves, never state.

## Run it

Bluetooth needs native code, so Expo Go cannot run this app. Build a
development client once, then iterate with Metro:

```sh
npm install
npx expo prebuild          # writes ios/ and android/
npm run ios                # or: npm run android
```

`npm start` then reloads JavaScript into the installed dev client.

## Play

- **Host over Bluetooth** advertises the table. Three phones join it.
- **Find nearby tables** scans for a host and takes the next open seat.
- **Pass and play** runs all four seats on one device, with a handoff
  screen between turns.

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

The rules engine, the protocol and the host runtime are covered by tests
(`npm test`) and the app bundles for Android. The native module has not run
on hardware yet: build the dev client on two devices to try it.
