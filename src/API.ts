import getConfig from "next/config";
import fetch from "isomorphic-unfetch";

export interface RequestOptions {
  payload?: any;
  body?: any;
  headers?: any;
}

export class APIError extends Error {
  status: number = 500;
  data: any;

  constructor(message: string, status: number = 500, data: any = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Set the stored data for this session
 * @param session an object to serialize and store
 */
export function setSession(session: any): void {
  /* istanbul ignore next */
  if (typeof localStorage === "undefined") return;

  const { SESSION_NAME } = getNextConfig();

  if (!SESSION_NAME) throw new Error("No SESSION_NAME defined in config.publicRuntimeConfig");

  if (!session) {
    localStorage.removeItem(SESSION_NAME);
  } else {
    localStorage.setItem(SESSION_NAME, JSON.stringify(session));
  }
}

/**
 * Get the currently stored session data
 */
export function getSession(): any {
  /* istanbul ignore next */
  if (typeof localStorage === "undefined") return null;

  const { SESSION_NAME } = getNextConfig();

  if (!SESSION_NAME) return null;

  var session = localStorage.getItem(SESSION_NAME);
  if (session) {
    return JSON.parse(session);
  }

  return null;
}

/**
 * Set the authorization token
 * @param token a signed JWT token
 */
export function setSessionToken(token: string) {
  const session = getSession() || {};
  session.token = token;
  setSession(session);
}

/**
 * Get the current authorization token
 */
export function getSessionToken(): string {
  return getSession() ? getSession().token || null : null;
}

/**
 * Make a HTTP GET request
 * @param path the path to get
 * @param options
 */
export function read(path: string, options: RequestOptions = {}): Promise<any> {
  return request("get", path, options);
}

/**
 * Make a HTTP POST request
 * @param path the path to post to
 * @param payload the body to send
 * @param options
 */
export function create(path: string, payload: any = {}, options: RequestOptions = {}): Promise<any> {
  options = {
    payload,
    ...options
  };
  return request("post", path, options);
}

/**
 * Make a HTTP PUT request
 * @param path the path to put to
 * @param payload the body to send
 * @param options
 */
export function update(path: string, payload: any = {}, options: RequestOptions = {}): Promise<any> {
  options = { payload, ...options };
  return request("put", path, options);
}

/**
 * Make a HTTP DELETE request
 * @param path The path to delete to
 * @param options
 */
export function destroy(path: string, options: RequestOptions = {}): Promise<any> {
  return request("delete", path, options);
}

/**
 * Convert a flat object to a query string
 * @param parameters A flat object
 * @param prefix Defaults to '?'
 */
export function queryString(parameters: { [key: string]: any } = {}, prefix: string = "?"): string {
  const query: string = Object.keys(parameters)
    .map((key: string) => {
      let value = parameters[key];

      if (typeof value === "boolean") value = value ? 1 : 0;

      return encodeURIComponent(key) + "=" + encodeURIComponent(value);
    })
    .join("&");

  return prefix + query;
}

/**
 * Make a HTTP request
 * @param method HTTP method
 * @param path the path to request
 * @param options attach a payload, etc
 */
async function request(method: string, path: string, options: RequestOptions = {}): Promise<any> {
  const url = path.indexOf("http") > -1 ? path : getURL(path);

  const requestOptions: any = {
    method,
    ...options
  };

  // Set up basic headers
  requestOptions.headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...options.headers
  };

  // Only attach auth if we are signed in
  if (getSessionToken()) {
    requestOptions.headers.authorization = getSessionToken();
  }

  // Attach the payload
  if (options.payload) {
    requestOptions.body = JSON.stringify(options.payload);
  }

  let status = 200;
  let response;

  try {
    response = await fetch(url, requestOptions).then((r: Response) => {
      status = r.status;
      return r.json();
    });
  } catch (err) {
    // Body was empty, could be a 204
    return null;
  }

  if (!response) {
    if (status < 200 || status >= 400) throw new APIError("An unknown error occured");

    return null;
  }

  if (response.message === "Invalid session") {
    setSession(null);
    const { RELOAD_ON_INVALID_SESSION } = getConfig();
    if (RELOAD_ON_INVALID_SESSION) {
      /* istanbul ignore next */
      document && document.location.reload();
    }
  }

  if (response.message === "Invalid token format") {
    setSession(null);
  }

  status = response.status || status;
  if (status < 200 || status >= 400) {
    throw new APIError(response.message || "An unknown error occurred", status, response.data);
  }

  return response;
}

/**
 * Load the config for Next
 */
function getNextConfig(): any {
  const config = getConfig();

  if (!config || !config.publicRuntimeConfig) return {};

  return config.publicRuntimeConfig;
}

/**
 * Get the base URL
 * @param path
 */
function getURL(path: string): string {
  const { URL } = getNextConfig();

  if (URL) return URL + "/api" + path;

  /* istanbul ignore else */
  if (typeof document !== "undefined") {
    let protocol = document.location.protocol || "";
    let hostname = document.location.hostname || "localhost";
    let port = document.location.port ? ":" + document.location.port : "";

    return protocol + "//" + hostname + port + "/api" + path;
  } else {
    throw new Error("URL could not be determined");
  }
}
