import "dotenv/config";
import Database from "better-sqlite3";
import { createCorsair } from "corsair";
import { fireflies } from "@corsair-dev/fireflies";
import { linear } from "@corsair-dev/linear";
import { slack } from "@corsair-dev/slack";

const db = new Database("corsair.db");

export const corsair = createCorsair({
  plugins: [
    fireflies({
      key: process.env.FIREFLIES_API_KEY,
      webhookSecret: process.env.FIREFLIES_WEBHOOK_SECRET,
    }),
    linear({
      key: process.env.LINEAR_API_KEY,
    }),
    slack({
      authType: "api_key",
      key: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
    }),
  ],
  database: db,
  kek: process.env.CORSAIR_KEK!,
  multiTenancy: false,
});
