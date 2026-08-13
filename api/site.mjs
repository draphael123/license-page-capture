import worker from "../dist/server/index.js";

export default async function handler(request, response) {
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const host = request.headers.host;
  const url = new URL(request.url, `${protocol}://${host}`);
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }

  const webRequest = new Request(url, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request,
    duplex: request.method === "GET" || request.method === "HEAD" ? undefined : "half",
  });
  const result = await worker.fetch(
    webRequest,
    { ASSETS: { fetch: () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  response.statusCode = result.status;
  result.headers.forEach((value, name) => response.setHeader(name, value));
  response.end(request.method === "HEAD" ? undefined : Buffer.from(await result.arrayBuffer()));
}
