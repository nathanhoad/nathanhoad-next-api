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

  it("can create a collection handler", async () => {
    expect.hasAssertions();

    class ThingsController extends Controller {
      public async index() {
        return { value: "index" };
      }

      public async create() {
        return { value: "create" };
      }
    }

    const controller = new ThingsController();
    const handler = controller.handleCollection();

    const { req: req1, res: res1, response: r1 } = createMinmumRequestParams("GET");
    await handler(req1, res1);
    expect(r1.body.value).toBe("index");

    const { req: req2, res: res2, response: r2 } = createMinmumRequestParams("POST");
    await handler(req2, res2);
    expect(r2.body.value).toBe("create");

    const { req: req3, res: res3, response: r3 } = createMinmumRequestParams("BAD");
    await handler(req3, res3);
    expect(r3.status).toBe(400);
    expect(r3.body.message).toContain("There was a problem");
  });

  it("can create an item handler", async () => {
    expect.hasAssertions();

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

    const controller = new ThingsController();
    const handler = controller.handleItem();

    const { req: req1, res: res1, response: r1 } = createMinmumRequestParams("GET");
    await handler(req1, res1);
    expect(r1.body.value).toBe("read");

    const { req: req2, res: res2, response: r2 } = createMinmumRequestParams("PUT");
    await handler(req2, res2);
    expect(r2.body.value).toBe("update");

    const { req: req3, res: res3, response: r3 } = createMinmumRequestParams("PATCH");
    await handler(req3, res3);
    expect(r3.body.value).toBe("update");

    const { req: req4, res: res4, response: r4 } = createMinmumRequestParams("DELETE");
    await handler(req4, res4);
    expect(r4.body.value).toBe("destroy");

    const { req: req5, res: res5, response: r5 } = createMinmumRequestParams("BAD");
    await handler(req5, res5);
    expect(r5.status).toBe(400);
    expect(r5.body.message).toContain("There was a problem");
  });

  it("can handle unauthorised errors", async () => {
    expect.hasAssertions();

    class ThingsController extends Controller {
      public async read() {
        throw new UnauthorizedError();
      }
    }

    const controller = new ThingsController();
    const handler = controller.handleItem();

    const { req: req1, res: res1, response: r1 } = createMinmumRequestParams("GET");
    await handler(req1, res1);
    expect(r1.status).toBe(401);
    expect(r1.body.message).toContain("not authorized");
  });

  it("can handle not found errors", async () => {
    expect.hasAssertions();

    class ThingsController extends Controller {
      public async read() {
        throw new NotFoundError();
      }
    }

    const controller = new ThingsController();
    const handler = controller.handleItem();

    const { req: req1, res: res1, response: r1 } = createMinmumRequestParams("GET");
    await handler(req1, res1);
    expect(r1.status).toBe(404);
    expect(r1.body.message).toContain("could not be found");
  });

  it("can handle unprocessable entity errors", async () => {
    expect.hasAssertions();

    class ThingsController extends Controller {
      public async update() {
        throw new UnprocessableEntityError();
      }
    }

    const controller = new ThingsController();
    const handler = controller.handleItem();

    const { req: req1, res: res1, response: r1 } = createMinmumRequestParams("PUT");
    await handler(req1, res1);
    expect(r1.status).toBe(422);
    expect(r1.body.message).toContain("could not be completed");
  });

  it("can handle internal server errors", async () => {
    expect.hasAssertions();

    class ThingsController extends Controller {
      public async update() {
        throw new InternalServerError();
      }
    }

    const controller = new ThingsController();
    const handler = controller.handleItem();

    const { req: req1, res: res1, response: r1 } = createMinmumRequestParams("PUT");
    await handler(req1, res1);
    expect(r1.status).toBe(500);
    expect(r1.body.message).toContain("server error");
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

    const collections = controller.handleCollection();
    const { req: req1, res: res1, response: r1 } = createMinmumRequestParams("GET");
    await collections(req1, res1);
    expect(r1.status).toBe(500);
    expect(r1.body.message).toContain("Unknown error");

    const items = controller.handleItem();
    const { req: req2, res: res2, response: r2 } = createMinmumRequestParams("GET");
    await items(req2, res2);
    expect(r2.status).toBe(500);
    expect(r2.body.message).toContain("Unknown error");
  });
});

function createMinmumRequestParams(method: string = "GET") {
  const req: any = {
    method
  };

  const response = { status: 200, body: null };
  const res: any = {
    status(status: number) {
      response.status = status;
      return {
        json(json: any) {
          response.body = json;
        }
      };
    }
  };

  return {
    req,
    res,
    response
  };
}
