const cron = require("node-cron");
const { DateTime } = require("luxon");
const { dynamoDB } = require("./db");
const { sendCampaignById } = require("./controllers/campaignController");

const TABLE_NAME = process.env.DB_NAME;

// ==================== Scheduled Campaign Sender ==================== //
cron.schedule("* * * * *", async () => {
  console.log(
    `[${new Date().toISOString()}] 🕵️ [CRON] Checking for due campaigns`
  );

  const scanParams = {
    TableName: TABLE_NAME,
    FilterExpression: "#type = :type AND #status = :status",
    ExpressionAttributeNames: {
      "#type": "entityType",
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":type": "campaign",
      ":status": "scheduled",
    },
  };

  try {
    const { Items = [] } = await dynamoDB.scan(scanParams).promise();

    for (const campaign of Items) {
      const { id, sendAt, timezone = "UTC" } = campaign;
      const now = DateTime.now().setZone(timezone);
      const sendTime = DateTime.fromISO(sendAt, { zone: timezone });

      if (now >= sendTime) {
        console.log(
          `⏰ [CRON] Campaign ID ${id} is due. Attempting to trigger...`
        );

        // Prevent duplicate processing
        try {
          await dynamoDB
            .update({
              TableName: TABLE_NAME,
              Key: { PK: `CAMPAIGN#${id}`, SK: "METADATA" },
              UpdateExpression: "SET #status = :processing",
              ConditionExpression: "#status = :scheduled",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: {
                ":processing": "processing",
                ":scheduled": "scheduled",
              },
            })
            .promise();
        } catch (err) {
          if (err.code === "ConditionalCheckFailedException") {
            console.log(
              `🚫 [CRON] Campaign ID ${id} already picked up by another instance.`
            );
            continue;
          } else {
            console.error(
              `❌ [CRON] Error locking campaign ${id}:`,
              err.message
            );
            continue;
          }
        }

        // Call sendCampaignById
        try {
          console.log(`🚀 [CRON] Initiating sendCampaignById for ID ${id}...`);
          await sendCampaignById(id);
          console.log(`✅ [CRON] Campaign ID ${id} sent successfully.`);
        } catch (e) {
          console.error(
            `❌ [CRON] Error sending campaign ID ${id}:`,
            e.message
          );
        }

        // Mark campaign as sent
        try {
          await dynamoDB
            .update({
              TableName: TABLE_NAME,
              Key: { PK: `CAMPAIGN#${id}`, SK: "METADATA" },
              UpdateExpression: "SET #status = :sent, lastSentAt = :now",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: {
                ":sent": "sent",
                ":now": new Date().toISOString(),
              },
            })
            .promise();
          console.log(`📦 [CRON] Campaign ID ${id} marked as sent.`);
        } catch (err) {
          console.error(
            `❌ [CRON] Failed to update sent status for campaign ID ${id}:`,
            err.message
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ [CRON] Error scanning campaigns:", err.message);
  }
});

// ==================== SMTP Quota Reset ==================== //
cron.schedule("0 0 * * *", async () => {
  console.log(
    `[${new Date().toISOString()}] 🔄 [CRON] Resetting SMTP quotas...`
  );

  const smtpScanParams = {
    TableName: TABLE_NAME,
    FilterExpression: "#type = :smtpType",
    ExpressionAttributeNames: {
      "#type": "type",
    },
    ExpressionAttributeValues: {
      ":smtpType": "SmtpConfig",
    },
  };

  try {
    const { Items: smtps = [] } = await dynamoDB.scan(smtpScanParams).promise();

    for (const smtp of smtps) {
      await dynamoDB
        .update({
          TableName: TABLE_NAME,
          Key: { PK: `SMTP#${smtp.id}`, SK: "META" },
          UpdateExpression: "SET sentCount = :zero, lastReset = :now",
          ExpressionAttributeValues: {
            ":zero": 0,
            ":now": new Date().toISOString(),
          },
        })
        .promise();
      console.log(`✅ [CRON] Reset quota for SMTP ID ${smtp.id}`);
    }
  } catch (error) {
    console.error(`❌ [CRON] Error resetting SMTP quotas: ${error.message}`);
  }
});
