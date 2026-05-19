import { POST } from "./src/app/api/chat/route";
async function test() {
  const req = {
    json: async () => ({
      messages: [
        { role: "user", content: "how many issues in linear assign to me?" },
      ],
    }),
  } as any;
  const res = await POST(req);
  console.log(await res.json());
}
test();
