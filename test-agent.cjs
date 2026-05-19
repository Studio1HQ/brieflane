const { POST } = require("./src/app/api/chat/route.ts");

async function test() {
  const req = {
    json: async () => ({
      messages: [
        {
          role: "user",
          content: "what's the recent task that got created in linear",
        },
      ],
    }),
  };
  const res = await POST(req);
  console.log(await res.json());
}
test();
