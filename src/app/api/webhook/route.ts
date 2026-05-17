export async function POST(req: Request) {
  const body = await req.json();

  if (body.type === "url_verification") {
    return new Response(body.challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return Response.json({ ok: true });
}