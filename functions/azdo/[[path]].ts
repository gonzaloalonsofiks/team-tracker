interface Env {
  ADO_PAT?: string
}

export async function onRequest(
  context: EventContext<Env, 'path', Record<string, string | string[]>>,
): Promise<Response> {
  const { params, request, env } = context
  const pathSegments = Array.isArray(params.path) ? params.path : [params.path]
  const url = new URL(request.url)
  const target = `https://analytics.dev.azure.com/${pathSegments.join('/')}${url.search}`

  const authorization = env.ADO_PAT
    ? `Basic ${btoa(`:${env.ADO_PAT}`)}`
    : (request.headers.get('Authorization') ?? '')

  const upstream = await fetch(target, {
    method: request.method,
    headers: {
      Authorization: authorization,
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
