import { parseTableReply, parseTableRequest } from "./tables";

describe("table requests", () => {
  it("accepts a create and a join, and makes the code upper case", () => {
    expect(
      parseTableRequest(
        JSON.stringify({ t: "create", tableName: "Kitchen", name: "Sam" }),
      ),
    ).toEqual({ t: "create", tableName: "Kitchen", name: "Sam" });
    expect(
      parseTableRequest(JSON.stringify({ t: "join", code: " kqjt " })),
    ).toEqual({ t: "join", code: "KQJT" });
  });

  it("rejects a bad request", () => {
    for (const request of [
      { t: "join", code: "KQ" },
      { t: "create", tableName: "", name: "Sam" },
      { t: "hello", name: "Sam" },
    ]) {
      expect(parseTableRequest(JSON.stringify(request))).toBeNull();
    }
  });

  it("reads a reply by its tag", () => {
    expect(
      parseTableReply(JSON.stringify({ t: "table", code: "KQJT" })),
    ).toEqual({ t: "table", code: "KQJT" });
    expect(parseTableReply(JSON.stringify({ t: "lobby" }))).toBeNull();
  });
});
