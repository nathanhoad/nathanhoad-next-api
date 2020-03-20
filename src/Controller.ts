import { NextApiRequest, NextApiResponse } from "next";
import { send } from "micro";
import cors from "micro-cors";
import helmet from "micro-helmet";

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

/**
 * Wrap a handler with some security headers
 * @param handler
 */
function createHandler(handler: Handler): Handler {
  return helmet(cors()(handler));
}

/**
 * A CRUD based controller for generating request handlers
 */
export class Controller {
  public async index(query?: any): Promise<any> {
    throw new NotFoundError();
  }

  public async create(body?: any): Promise<any> {
    throw new NotFoundError();
  }

  public async read(query: any): Promise<any> {
    throw new NotFoundError();
  }

  public async update(query: any, body?: any): Promise<any> {
    throw new NotFoundError();
  }

  public async destroy(query: any): Promise<any> {
    throw new NotFoundError();
  }

  /**
   * Create an index endpoint handler
   */
  public handleCollection(): Handler {
    async function handler(req: NextApiRequest, res: NextApiResponse) {
      try {
        let json;
        switch (req.method.toUpperCase()) {
          case "OPTIONS":
            return send(res, 200);

          case "GET":
            json = await this.index(req.query);
            break;

          case "POST":
            json = await this.create(req.body);
            break;

          default:
            throw new BadRequestError();
        }

        send(res, 200, json);
      } catch (err) {
        send(res, err.status || 500, { statusCode: err.status || 500, message: err.message || "Unknown error" });
      }
    }

    return createHandler(handler.bind(this));
  }

  /**
   * Create a single item endpoint handler
   */
  public handleItem(): Handler {
    async function handler(req: NextApiRequest, res: NextApiResponse) {
      try {
        let json;
        switch (req.method.toUpperCase()) {
          case "OPTIONS":
            return send(res, 200);

          case "GET":
            json = await this.read(req.query);
            break;

          case "POST":
          case "PUT":
          case "PATCH":
            json = await this.update(req.query, req.body);
            break;

          case "DELETE":
            json = await this.destroy(req.query);
            break;

          default:
            throw new BadRequestError();
        }

        send(res, 200, json);
      } catch (err) {
        send(res, err.status || 500, { statusCode: err.status || 500, message: err.message || "Unknown error" });
      }
    }

    return createHandler(handler.bind(this));
  }
}

export class ResponseError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super();

    this.status = status;
    this.message = message;
  }
}

export class BadRequestError extends ResponseError {
  constructor(message?: string) {
    super(400, message || "There was a problem processing your request.");
  }
}

export class UnauthorizedError extends ResponseError {
  constructor(message?: string) {
    super(401, message || "You are not authorized to make that request");
  }
}

export class NotFoundError extends ResponseError {
  constructor(message?: string) {
    super(404, message || "The requested resource could not be found.");
  }
}

export class UnprocessableEntityError extends ResponseError {
  constructor(message?: string) {
    super(422, message || "Your request could not be completed.");
  }
}

export class InternalServerError extends ResponseError {
  constructor(message?: string) {
    super(500, message || "There was an internal server error");
  }
}
