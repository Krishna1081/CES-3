const AWS = require("aws-sdk");
const nodemailer = require("nodemailer");
const { DateTime } = require("luxon");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DB_NAME; // Single table for campaigns and SMTP
const hostname = process.env.HOSTNAME;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function resetDailyQuotaIfNeeded(smtp) {
  if (!smtp) return; // safety check
  const now = new Date();
  const lastReset = smtp.lastReset || new Date(0).toISOString();
  const nowDate = now.toISOString().slice(0, 10);
  const lastResetDate = new Date(lastReset).toISOString().slice(0, 10);

  if (nowDate !== lastResetDate) {
    smtp.sentCount = 0;
    smtp.lastReset = now.toISOString();
    await dynamoDB
      .update({
        TableName: TABLE_NAME,
        Key: { PK: `SMTP#${smtp.email}`, SK: "METADATA" },
        UpdateExpression: "set sentCount = :s, lastReset = :r",
        ExpressionAttributeValues: {
          ":s": 0,
          ":r": smtp.lastReset,
        },
      })
      .promise();
  }
}

function convertToUtcIso(userDateTime, userTimezone) {
  const localTime = DateTime.fromISO(userDateTime, { zone: userTimezone });
  const utcTime = localTime.toUTC().toISO(); // what you store in DynamoDB
  return utcTime;
}

exports.createCampaign = async (req, res) => {
  try {
    const { subject, body, recipients, smtpConfigs, sendAt, timezone } =
      req.body;
    const campaignId = Date.now().toString();
    // const localTime = DateTime.fromISO(sendAt, { zone: timezone });
    // const utcSendAt = localTime.toUTC().toISO();
    const sendAtUtc = convertToUtcIso(sendAt, timezone);

    const campaign = {
      PK: `CAMPAIGN#${campaignId}`,
      SK: "METADATA",
      id: campaignId,
      subject,
      body,
      recipients,
      smtpConfigs,
      sendAt: sendAtUtc,
      timezone,
      status: "scheduled",
      createdAt: new Date().toISOString(),
      entityType: "campaign",
    };

    await dynamoDB
      .put({
        TableName: TABLE_NAME,
        Item: campaign,
      })
      .promise();

    res.status(201).json(campaign);
  } catch (err) {
    console.error("Create campaign error:", err);
    res.status(500).json({ error: "Failed to create campaign" });
  }
};

function parseSpintax(str) {
  const regex = /\{([^{}]+?)\}/;

  while (regex.test(str)) {
    str = str.replace(regex, (_, options) => {
      const parts = options.split("|");
      return parts[Math.floor(Math.random() * parts.length)];
    });
  }

  return str;
}

function replaceTemplateVars(text, recipient) {
  return text
    .replace(/{{firstName}}/g, recipient.name || "")
    .replace(/{{email}}/g, recipient.email || "")
    .replace(
      /{{unsubscribeUrl}}/g,
      `http://localhost:5173/unsubscribe?email=${recipient.email}`
    );
}

exports.sendCampaignById = async function (id) {
  console.log(`📦 [Worker] Campaign ID: ${id}`);

  const campaignData = await dynamoDB
    .get({
      TableName: TABLE_NAME,
      Key: { PK: `CAMPAIGN#${id}`, SK: "METADATA" },
    })
    .promise();

  const campaign = campaignData.Item;
  if (
    !campaign ||
    !campaign.recipients?.length ||
    !campaign.smtpConfigs?.length
  ) {
    console.log("❌ [Worker] Campaign data is incomplete or invalid.");
    return {
      status: "error",
      message: "Campaign data is incomplete or invalid",
    };
  }

  console.log(`📧 [Worker] Recipients: ${campaign.recipients.length}`);
  console.log(`📨 [Worker] SMTPs: ${campaign.smtpConfigs.length}`);

  const results = [];

  const uniqueRecipients = [...new Set(campaign.recipients)];
  for (let i = 0; i < uniqueRecipients.length; i++) {
    const recipientEmail = uniqueRecipients[i];
    const recipientData = await dynamoDB
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `RECIPIENT#${recipientEmail}`,
          SK: "PROFILE",
        },
      })
      .promise();

    const recipient = recipientData.Item;
    if (!recipient) {
      console.log(`❌ [Worker] No profile found for ${recipientEmail}`);
      results.push({
        status: "error",
        recipient: recipientEmail,
        reason: "No profile found",
      });
      continue;
    }

    let sent = false;
    let attempts = 0;

    while (!sent && attempts < 3) {
      const smtpEmail = campaign.smtpConfigs[i % campaign.smtpConfigs.length];
      console.log(`🔍 [SMTP] Fetching SMTP config for: ${smtpEmail}`);

      const parsedSubject = replaceTemplateVars(campaign.subject, recipient);
      const parsedBody = replaceTemplateVars(campaign.body, recipient);
      const subject = parseSpintax(parsedSubject);
      const finalhtml = parseSpintax(parsedBody);

      // Check for unparsed placeholders
      const unparsedPlaceholderRegex = /{{[^{}]+}}|\{[^{}]+\}/;
      if (
        unparsedPlaceholderRegex.test(subject) ||
        unparsedPlaceholderRegex.test(finalhtml)
      ) {
        console.warn(
          `⚠️ [Worker] Unparsed placeholders detected for recipient ${recipientEmail}. Skipping send.`
        );
        results.push({
          status: "error",
          recipient: recipientEmail,
          reason: "Unparsed placeholders detected",
        });
        break; // exit while loop, do not retry
      }

      const smtpData = await dynamoDB
        .get({
          TableName: TABLE_NAME,
          Key: {
            PK: `SMTP#${smtpEmail}`,
            SK: "META",
          },
        })
        .promise();

      const smtp = smtpData.Item;
      if (!smtp) {
        console.log(`❌ [SMTP] Config not found for ${smtpEmail}`);
        results.push({
          status: "error",
          recipient: recipientEmail,
          reason: "SMTP config not found",
        });
        break;
      }

      await resetDailyQuotaIfNeeded(smtp);
      if (smtp.sentCount >= smtp.dailyLimit) {
        console.log(`⚠️ [SMTP] ${smtp.email} has hit its daily limit.`);
        results.push({
          status: "error",
          recipient: recipientEmail,
          reason: "SMTP daily limit reached",
        });
        break;
      }

      try {
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: Number(smtp.port),
          secure: smtp.port === "465",
          auth: {
            user: smtp.email,
            pass: smtp.password,
          },
        });

        await transporter.sendMail({
          from: smtp.email,
          to: recipient.email,
          subject,
          html: finalhtml,
        });

        smtp.sentCount++;
        await dynamoDB
          .update({
            TableName: TABLE_NAME,
            Key: { PK: `SMTP#${smtpEmail}`, SK: "META" }, // changed from smtp.id
            UpdateExpression: "set sentCount = :s",
            ExpressionAttributeValues: {
              ":s": smtp.sentCount,
            },
          })
          .promise();

        sent = true;
        console.log(`✅ [SMTP] Sent to ${recipient.email} using ${smtp.email}`);
        results.push({
          status: "success",
          recipient: recipient.email,
          smtp: smtp.email,
        });

        // ⏳ 5-minute delay before next email
        if (i < uniqueRecipients.length - 1) {
          console.log("⏳ Waiting 5 minutes before sending next email...");
          await delay(5 * 60 * 1000);
        }
      } catch (err) {
        console.error(
          `❌ [SMTP] Attempt ${attempts + 1} failed for ${
            recipient.email
          } using ${smtp.email}:`,
          err.message
        );
        attempts++;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  return results;
};

exports.sendCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const results = await exports.sendCampaignById(id);
    res.status(200).json({
      message: "Campaign processed",
      results,
    });
  } catch (err) {
    console.error("Send campaign error:", err);
    res.status(500).json({ error: "Failed to send campaign" });
  }
};

exports.getAllCampaigns = async (req, res) => {
  try {
    // Scan and filter campaigns by entityType
    const data = await dynamoDB
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: "entityType = :type",
        ExpressionAttributeValues: {
          ":type": "campaign",
        },
      })
      .promise();

    res.status(200).json(data.Items);
  } catch (err) {
    console.error("Fetch campaigns error:", err);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body, recipients, smtpConfigs, sendAt, timezone, status } =
      req.body;

    const updates = [];
    const values = {};
    const names = {};

    if (subject) {
      updates.push("#subject = :subject");
      names["#subject"] = "subject";
      values[":subject"] = subject;
    }
    if (body) {
      updates.push("#body = :body");
      names["#body"] = "body";
      values[":body"] = body;
    }
    if (recipients) {
      updates.push("#recipients = :recipients");
      names["#recipients"] = "recipients";
      values[":recipients"] = recipients;
    }
    if (smtpConfigs) {
      updates.push("#smtpConfigs = :smtpConfigs");
      names["#smtpConfigs"] = "smtpConfigs";
      values[":smtpConfigs"] = smtpConfigs;
    }
    if (sendAt) {
      updates.push("#sendAt = :sendAt");
      names["#sendAt"] = "sendAt";
      values[":sendAt"] = convertToUtcIso(sendAt, timezone || "UTC");
    }
    if (timezone) {
      updates.push("#timezone = :timezone");
      names["#timezone"] = "timezone";
      values[":timezone"] = timezone;
    }
    if (status) {
      updates.push("#status = :status");
      names["#status"] = "status";
      values[":status"] = status;
    }

    await dynamoDB
      .update({
        TableName: TABLE_NAME,
        Key: { PK: `CAMPAIGN#${id}`, SK: "METADATA" },
        UpdateExpression: `set ${updates.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      })
      .promise();

    res.status(200).json({ message: "Campaign updated" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update campaign" });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    await dynamoDB
      .delete({
        TableName: TABLE_NAME,
        Key: { PK: `CAMPAIGN#${id}`, SK: "METADATA" },
      })
      .promise();
    res.status(200).json({ message: "Campaign deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
};

exports.searchCampaigns = async (req, res) => {
  try {
    const subjectQuery = (req.query.subject || "").toLowerCase();

    const data = await dynamoDB
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: "entityType = :type",
        ExpressionAttributeValues: {
          ":type": "campaign",
        },
      })
      .promise();

    const filtered = data.Items.filter((c) =>
      c.subject?.toLowerCase().includes(subjectQuery)
    );

    res.status(200).json(filtered);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Failed to search campaigns" });
  }
};
