import fetch from "isomorphic-unfetch";
import http from "http";
import listen from "test-listen";

import {
  Controller,
  UnauthorizedError,
  NotFoundError,
  UnprocessableEntityError,
  InternalServerError
} from "./Controller";

describe("Contoller", () => {
  it("can make an empty controllers", () => {
    expect.hasAssertions();

    class ThingsController extends Controller {}

    const controller = new ThingsController();

    expect(controller.index()).rejects.toThrow();
    expect(controller.create({})).rejects.toThrow();
    expect(controller.read({})).rejects.toThrow();
    expect(controller.update({})).rejects.toThrow();
    expect(controller.destroy({})).rejects.toThrow();
  });

  it("can have CRUD methods", () => {
    expect.hasAssertions();

    class ThingsController extends Controller {
      public async index() {
        return "test";
      }
    }

    const controller = new ThingsController();

    expect(controller.index()).resolves.toBe("test");
  });

  describe("Collection handler", () => {
    let controller;

    beforeEach(() => {
      class ThingsController extends Controller {
        public async index() {
          return { value: "index" };
        }

        public async create() {
          return { value: "create" };
        }
      }

      controller = new ThingsController();
    });

    it("handles GET", async () => {
      expect.hasAssertions();

      const { status, body } = await getResponseJson("GET", controller.handleCollection());

      expect(status).toBe(200);
      expect(body.value).toBe("index");
    });

    it("handles POST", async () => {
      expect.hasAssertions();

      const { status, body } = await getResponseJson("POST", controller.handleCollection());

      expect(status).toBe(200);
      expect(body.value).toBe("create");
    });

    it("handles bad requests", async () => {
      expect.hasAssertions();

      const { status, body } = await getResponseJson("DELETE", controller.handleCollection());

      expect(status).toBe(400);
      expect(body.message).toContain("There was a problem");
    });

    it("can guess XML content", async () => {
      expect.hasAssertions();

      class XmlController extends Controller {
        public async index() {
          return `<?xml version="1.0" encoding="UTF-8"?><items><item /></items>`;
        }
      }

      const xmlController = new XmlController();

      const { headers, status, body } = await getResponseXml("GET", xmlController.handleCollection());

      expect(status).toBe(200);
      expect(headers.get("content-type")).toContain("application/xml");
      expect(body).toBe(`<?xml version="1.0" encoding="UTF-8"?><items><item /></items>`);
    });
  });

  describe("Item handler", () => {
    let controller;

    beforeEach(() => {
      class ThingsController extends Controller {
        public async read() {
          return { value: "read" };
        }

        public async update() {
          return { value: "update" };
        }

        public async destroy() {
          return { value: "destroy" };
        }
      }

      controller = new ThingsController();
    });

    it("handles GET", async () => {
      expect.hasAssertions();

      const { status, body } = await getResponseJson("GET", controller.handleItem());

      expect(status).toBe(200);
      expect(body.value).toBe("read");
    });

    it("handles PUT", async () => {
      expect.hasAssertions();

      const { status, body } = await getResponseJson("PUT", controller.handleItem());

      expect(status).toBe(200);
      expect(body.value).toBe("update");
    });

    it("handles POST", async () => {
      expect.hasAssertions();

      const { status, body } = await getResponseJson("POST", controller.handleItem());

      expect(status).toBe(200);
      expect(body.value).toBe("update");
    });

    it("handles PATCH", async () => {
      expect.hasAssertions();

      const { status, body } = await getResponseJson("PATCH", controller.handleItem());

      expect(status).toBe(200);
      expect(body.value).toBe("update");
    });

    it("handles DELETE", async () => {
      expect.hasAssertions();

      const { status, body } = await getResponseJson("DELETE", controller.handleItem());

      expect(status).toBe(200);
      expect(body.value).toBe("destroy");
    });

    it("can guess XML content", async () => {
      expect.hasAssertions();

      class XmlController extends Controller {
        public async read() {
          return `<?xml version="1.0" encoding="UTF-8"?><items><item /></items>`;
        }
      }

      const xmlController = new XmlController();

      const { headers, status, body } = await getResponseXml("GET", xmlController.handleItem());

      expect(status).toBe(200);
      expect(headers.get("content-type")).toContain("application/xml");
      expect(body).toBe(`<?xml version="1.0" encoding="UTF-8"?><items><item /></items>`);
    });
  });

  it("can handle unauthorised errors", async () => {
    expect.hasAssertions();

    class ThingsController extends Controller {
      public async read() {
        throw new UnauthorizedError();
      }
    }

    const controller = new ThingsController();

    const { status, body } = await getResponseJson("GET", controller.handleItem());

    expect(status).toBe(401);
    expect(body.message).toContain("not authorized");
  });

  it("can handle not found errors", async () => {
    expect.hasAssertions();

    class ThingsController extends Controller {
      public async read() {
        throw new NotFoundError();
      }
    }

    const controller = new ThingsController();

    const { status, body } = await getResponseJson("GET", controller.handleItem());

    expect(status).toBe(404);
    expect(body.message).toContain("not be found");
  });

  it("can handle unprocessable entity errors", async () => {
    expect.hasAssertions();

    class ThingsController extends Controller {
      public async update() {
        throw new UnprocessableEntityError();
      }
    }

    const controller = new ThingsController();

    const { status, body } = await getResponseJson("PUT", controller.handleItem());

    expect(status).toBe(422);
    expect(body.message).toContain("could not be completed");
  });

  it("can handle internal server errors", async () => {
    expect.hasAssertions();

    class ThingsController extends Controller {
      public async update() {
        throw new InternalServerError();
      }
    }

    const controller = new ThingsController();

    const { status, body } = await getResponseJson("PUT", controller.handleItem());

    expect(status).toBe(500);
    expect(body.message).toContain("server error");
  });

  it("can handle unknown errors", async () => {
    expect.hasAssertions();

    class ThingsController extends Controller {
      public async index() {
        throw new Error();
      }

      public async read() {
        throw new Error();
      }
    }

    const controller = new ThingsController();

    const collection = await getResponseJson("GET", controller.handleCollection());
    expect(collection.status).toBe(500);
    expect(collection.body.message).toContain("Unknown error");

    const item = await getResponseJson("GET", controller.handleItem());
    expect(item.status).toBe(500);
    expect(item.body.message).toContain("Unknown error");
  });

  it("can handle CORS requests", async () => {
    expect.hasAssertions();

    class ThingsController extends Controller {}

    const controller = new ThingsController();

    const collection = await getResponseJson("OPTIONS", controller.handleCollection());
    expect(collection.status).toBe(200);
    expect(collection.body).toBeNull();

    const item = await getResponseJson("OPTIONS", controller.handleItem());
    expect(item.status).toBe(200);
    expect(item.body).toBeNull();
  });
});

/**
 * Run a tiny server for testing an endpoint
 * @param method
 * @param handler
 */
async function getResponseJson(method: string, handler: (req, res) => void) {
  const service = new http.Server(handler);

  const url = await listen(service);
  const result = await fetch(url, { method });

  const { headers, status } = result;

  let body = null;
  try {
    body = await result.json();
  } catch (err) {}

  service.close();

  return { headers, status, body };
}

/**
 * Run a tiny server for testing an endpoint
 * @param method
 * @param handler
 */
async function getResponseXml(method: string, handler: (req, res) => void) {
  const service = new http.Server(handler);

  const url = await listen(service);
  const result = await fetch(url, { method });

  const { headers, status } = result;

  let body = null;
  try {
    body = await result.text();
  } catch (err) {}

  service.close();

  return { headers, status, body };
}
