// import { corsair } from "./src/server/corsair";

// async function saveKeys() {
//   try {
//     console.log("⏳ Connecting to database and encrypting key...");
    
//     // This saves your API key directly using Corsair's internal code engine
//     await corsair.linear.keys.set_api_key("lin_api_wszJSPIWRqPAMCtd9PlvY4pq9nSsM7KrqW7g20Su");
    
//     console.log("🎉 Success! Your Linear API key is securely saved in corsair.db");
//   } catch (error) {
//     console.error("❌ Something went wrong:", error);
//   }
// }

// saveKeys();

// import { corsair } from "./src/server/corsair";

// async function saveKeys() {
//   try {
//     console.log("⏳ Debugging Corsair...");

//     console.log("corsair.linear =", corsair.linear);

//     console.log("corsair.linear.keys =", corsair.linear?.keys);

//     console.log(
//       "corsair.linear methods =",
//       Object.keys(corsair.linear ?? {})
//     );

//   } catch (error) {
//     console.error("❌ Something went wrong:", error);
//   }
// }

// saveKeys();

// import { corsair } from "./src/server/corsair";

// async function test() {
//   console.log("ROOT KEYS:", corsair.keys);

//   console.log("ROOT KEY METHODS:");
//   console.log(Object.keys(corsair.keys ?? {}));
// }

// test();

import { corsair } from "./src/server/corsair";
import { setupCorsair } from "corsair/setup";

async function main() {
  console.log("Running setup...");

  const result = await setupCorsair(corsair);

  console.log(result);

  console.log("ROOT KEYS:", corsair.keys);

  console.log("ROOT KEY METHODS:");
  console.log(Object.keys(corsair.keys ?? {}));
}

main();