import "dotenv/config";
import { HumanMessage } from "@langchain/core/messages";
import { compileApp } from "./graph.js";
async function demo() {
  const app = compileApp();
  // Example 1: scheduling intent → calendar tool
  const res1 = await app.invoke({
    messages: [
      new HumanMessage(
        "Please schedule a 30-minute check-in with Sara tomorrow at 10:00."
      ),
    ],
  });
  console.log("=== Example 1 ===");
  for (const m of res1.messages) console.log(m.content);
  // Example 2: quick update → Slack DM tool
  const res2 = await app.invoke({
    messages: [new HumanMessage("Tell Alex I'll be five minutes late.")],
  });
  console.log("\n=== Example 2 ===");
  for (const m of res2.messages) console.log(m.content);


  // Example 2: quick update → Slack DM tool
  const res3 = await app.invoke({
    messages: [new HumanMessage("write a twitter status about lazy")],
  });
  console.log("\n=== Example 3 ===");
  for (const m of res3.messages) console.log(m.content);
}
demo().catch((e) => {
  console.error(e);
  process.exit(1);
});
