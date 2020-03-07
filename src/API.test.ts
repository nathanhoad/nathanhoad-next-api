import nock from "nock";

import {
  create,
  read,
  update,
  destroy,
  queryString,
  setSession,
  getSession,
  getSessionToken,
  setSessionToken
} from "./API";

let config;
function getConfig() {
  return config;
}

jest.mock("next/config", () => {
  return () => getConfig();
});

describe("when given config", () => {
  beforeEach(() => {
    config = {
      publicRuntimeConfig: {
        URL: "http://localhost:5000",
        SESSION_NAME: "test"
      }
    };
  });

  it("can take use the URL in config", async () => {
    expect.hasAssertions();

    nock("http://localhost:5000/api")
      .get("/things")
      .reply(200, [{ name: "first" }, { name: "second" }]);

    const things = await read("/things");
    expect(things.length).toBe(2);
    expect(things[0].name).toBe("first");
  });

  it("can take full URLs in requests", async () => {
    expect.hasAssertions();

    nock("http://localhost:5000/api")
      .get("/things")
      .reply(200, [{ name: "first" }, { name: "second" }]);

    const things = await read("http://localhost:5000/api/things");
    expect(things.length).toBe(2);
    expect(things[0].name).toBe("first");
  });

  it("accepts an empty success response", async () => {
    expect.hasAssertions();

    nock("http://localhost:5000/api")
      .get("/things")
      .reply(204);

    const things = await read("http://localhost:5000/api/things");
    expect(things).toBeNull();

    nock("http://localhost:5000/api")
      .get("/things")
      .reply(204, null);

    const things2 = await read("http://localhost:5000/api/things");
    expect(things2).toBeNull();
  });

  it("passes on API errors", async () => {
    expect.hasAssertions();

    nock("http://localhost:5000/api")
      .get("/things")
      .reply(404, { status: 404, message: "Not found", data: { value: "test" } });

    await expect(read("/things")).rejects.toThrow("Not found");
  });

  it("passes on unknown API errors", async () => {
    expect.hasAssertions();

    nock("http://localhost:5000/api")
      .get("/things")
      .reply(500, null);

    await expect(read("/things")).rejects.toThrow("An unknown error occured");
  });

  it("can read/write sessions to localStorage", () => {
    expect(getSession()).toBeNull();

    setSession({ value: "Nathan" });
    expect(getSession().value).toBe("Nathan");

    expect(getSessionToken()).toBeNull();

    setSessionToken("test");
    expect(getSessionToken()).toBe("test");

    setSession(null);
    expect(getSession()).toBe(null);
  });

  it("can pass an auth header", async () => {
    setSessionToken("test");

    nock("http://localhost:5000/api")
      .get("/things")
      .reply(200, [{ name: "first" }, { name: "second" }]);
    const things = await read("/things");

    expect(things.length).toBe(2);
    expect(things[0].name).toBe("first");
  });

  it("can revoke the session", async () => {
    setSessionToken("test");
    nock("http://localhost:5000/api")
      .get("/things")
      .reply(401, { message: "Invalid session" });

    await expect(read("/things")).rejects.toThrow();

    expect(getSessionToken()).toBe(null);

    setSessionToken("test");
    nock("http://localhost:5000/api")
      .get("/things")
      .reply(401, { message: "Invalid token format" });

    await expect(read("/things")).rejects.toThrow();

    expect(getSessionToken()).toBe(null);
  });

  describe("create", () => {
    it("will post a payload to an endpoint", async () => {
      expect.hasAssertions();

      nock("http://localhost:5000/api")
        .post("/things")
        .reply(201, { name: "first" });

      const thing = await create("/things", { name: "first" });

      expect(thing.name).toBe("first");
    });
  });

  describe("read", () => {
    it("will read data from an endpoint", async () => {
      expect.hasAssertions();

      nock("http://localhost:5000/api")
        .get("/things")
        .reply(200, [{ name: "first" }, { name: "second" }]);

      const things = await read("/things");

      expect(things.length).toBe(2);
      expect(things[0].name).toBe("first");
    });
  });

  describe("update", () => {
    it("will update data on an endpoint", async () => {
      expect.hasAssertions();

      nock("http://localhost:5000/api")
        .put("/things")
        .reply(200, { name: "Updated" });

      const thing = await update("/things");

      expect(thing.name).toBe("Updated");
    });
  });

  describe("destroy", () => {
    it("will delete data on an endpoint", async () => {
      expect.hasAssertions();

      nock("http://localhost:5000/api")
        .delete("/things")
        .reply(200, { name: "Deleted" });

      const thing = await destroy("/things");

      expect(thing.name).toBe("Deleted");
    });
  });
});

describe("when not given config", () => {
  beforeEach(() => {
    config = {};
  });

  it("can guess the URL from the document", async () => {
    expect.hasAssertions();

    nock("http://localhost:3000/api")
      .get("/things")
      .reply(200, [{ name: "first" }, { name: "second" }]);

    const things = await read("/things");
    expect(things.length).toBe(2);
    expect(things[0].name).toBe("first");
  });

  it("fails to set session information", () => {
    expect(() => {
      setSession({ value: "test" });
    }).toThrow();
  });
});

describe("queryString", () => {
  it("converts an object into a query string", () => {
    const string = queryString({ first: 1, second: "2nd", third: true, fourth: false }, "?");

    expect(string).toBe("?first=1&second=2nd&third=1&fourth=0");
  });
});
