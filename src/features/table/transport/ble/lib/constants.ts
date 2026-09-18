export const EUCHRE_SERVICE_UUID = "5ec4a1e0-9b4f-4f2e-8a21-0d2b7c6f1a01";

/** Clients write framed client messages here. */
export const TO_HOST_CHARACTERISTIC_UUID = "5ec4a1e0-9b4f-4f2e-8a21-0d2b7c6f1a02";

/** The host notifies framed host messages here. */
export const FROM_HOST_CHARACTERISTIC_UUID = "5ec4a1e0-9b4f-4f2e-8a21-0d2b7c6f1a03";

export const PREFERRED_MTU = 247;

/** Three ATT bytes of overhead on top of the negotiated MTU. */
export const ATT_OVERHEAD_BYTES = 3;

/** A legacy scan response holds a 128 bit uuid and little else. */
export const MAX_TABLE_NAME_BYTES = 12;
