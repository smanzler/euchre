import { utf8Encode } from "../../lib/bytes";
import { MAX_TABLE_NAME_BYTES } from "./constants";
import { trimTableName } from "./tableName";

describe("trimTableName", () => {
  it("keeps a name that fits", () => {
    expect(trimTableName("  Porch  ")).toBe("Porch");
  });

  it("keeps a name that fills the limit exactly", () => {
    expect(trimTableName("Kitchen tabl")).toBe("Kitchen tabl");
  });

  it("ends a cut name in an ellipsis", () => {
    expect(trimTableName("Kitchen table")).toBe("Kitchen t…");
  });

  it("drops a space before the ellipsis", () => {
    expect(trimTableName("Backyard table")).toBe("Backyard…");
  });

  it("counts bytes and does not split a character", () => {
    const trimmed = trimTableName("Crème brûlée");
    expect(trimmed).toBe("Crème br…");
    expect(utf8Encode(trimmed).length).toBeLessThanOrEqual(
      MAX_TABLE_NAME_BYTES,
    );
  });
});
