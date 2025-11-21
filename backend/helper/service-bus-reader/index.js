const { ServiceBusClient } = require("@azure/service-bus");
const Long = require("long"); // added

const connectionString = process.env.SERVICEBUS_CONNECTION_STRING || process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;
const queueName = process.env.QUEUE_NAME;
const batchSize = parseInt(process.env.BATCH_SIZE || "50", 10);
// new: poll interval (ms) to wait when no messages are available
const pollInterval = parseInt(process.env.POLL_INTERVAL_MS || "5000", 10);

if (!connectionString || !queueName) {
  // updated message to match the env vars actually used above
  console.error("Missing required env vars. Set SERVICEBUS_CONNECTION_STRING (or AZURE_SERVICE_BUS_CONNECTION_STRING) and QUEUE_NAME.");
  process.exit(1);
}

let keepRunning = true;
let sbClient;
let receiver;

async function stop() {
  if (!keepRunning) return;
  keepRunning = false;
  console.log("Stopping service-bus reader...");
  try {
    if (receiver) await receiver.close();
    if (sbClient) await sbClient.close();
  } catch (e) {
    console.error("Error during shutdown:", e);
  }
  // allow process to exit naturally after resources closed
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("uncaughtException", async (err) => {
  console.error("Uncaught exception:", err);
  await stop();
});

async function peekAll() {
  sbClient = new ServiceBusClient(connectionString);
  // createReceiver is used only to access peekMessages; no locks or completes happen.
  receiver = sbClient.createReceiver(queueName);

  try {
    let fromSequenceNumber = undefined; // undefined means start from the earliest available
    while (keepRunning) {
      const messages = await receiver.peekMessages(batchSize, { fromSequenceNumber });
      if (!messages || messages.length === 0) {
        // No messages right now — wait a bit and try again so the script keeps running live
        await new Promise((res) => setTimeout(res, pollInterval));
        continue;
      }

      for (const m of messages) {
        // Print key metadata and body; tailor as needed
        console.log({
          messageId: m.messageId,
          sequenceNumber: m.sequenceNumber,
          enqueuedTimeUtc: m.enqueuedTimeUtc,
          body: m.body
        });
      }

      // Advance to next sequence number to avoid re-reading the same batch
      const last = messages[messages.length - 1];
      // ensure we pass a Long instance (the SDK expects Long)
      fromSequenceNumber = Long.fromValue(last.sequenceNumber).add(Long.ONE);

      // If fewer than requested were returned, continue loop to poll for new messages
      if (messages.length < batchSize) {
        continue;
      }
    }

    console.log("Finished peeking messages.");
  } catch (err) {
    console.error("Error while peeking messages:", err);
  } finally {
    try {
      if (receiver) await receiver.close();
      if (sbClient) await sbClient.close();
    } catch (e) {
      console.error("Error closing resources:", e);
    }
  }
}

peekAll();