export async function onRequest(
  context: EventContext<Record<string, unknown>, 'path', Record<string, string | string[]>>,
): Promise<Response> {
  const { params, request } = context
  const pathSegments = Array.isArray(params.path) ? params.path : [params.path]
  const url = new URL(request.url)
  const target = `https://analytics.dev.azure.com/${pathSegments.join('/')}${url.search}`

  const upstream = await fetch(target, {
    method: request.method,
    headers: {
      Authorization: request.headers.get('Authorization') ?? '',
      Accept: request.headers.get('Accept') ?? 'application/json',
    },
  })

  const body = await upstream.arrayBuffer()

  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}
