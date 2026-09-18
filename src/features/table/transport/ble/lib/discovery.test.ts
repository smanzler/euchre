import { EUCHRE_SERVICE_UUID } from "./constants";
import { tableNameFrom } from "./discovery";

const encoded = "S2l0Y2hlbg=="; // "Kitchen"

describe("tableNameFrom", () => {
  it("reads the name an android host puts in service data", () => {
    expect(
      tableNameFrom({
        serviceData: { [EUCHRE_SERVICE_UUID]: encoded },
        localName: null,
        name: "Pixel 8",
      }),
    ).toBe("Kitchen");
  });

  it("matches the uuid key whatever case the platform uses", () => {
    expect(
      tableNameFrom({
        serviceData: { [EUCHRE_SERVICE_UUID.toUpperCase()]: encoded },
        localName: null,
        name: null,
      }),
    ).toBe("Kitchen");
  });

  it("falls back to the local name an ios host advertises", () => {
    expect(tableNameFrom({ serviceData: null, localName: "Porch", name: "iPhone" })).toBe("Porch");
  });

  it("ignores service data for another service", () => {
    expect(
      tableNameFrom({
        serviceData: { "0000180d-0000-1000-8000-00805f9b34fb": encoded },
        localName: "Porch",
        name: null,
      }),
    ).toBe("Porch");
  });

  it("falls back when the advertisement carries no name at all", () => {
    expect(tableNameFrom({ serviceData: {}, localName: null, name: null })).toBe("Euchre table");
  });
});
