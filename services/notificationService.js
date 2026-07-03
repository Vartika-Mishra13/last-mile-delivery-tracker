const Notification = require("../models/Notification");
const User = require("../models/User");

const webhookForChannel = (channel) => {
  if (channel === "email") return process.env.EMAIL_WEBHOOK_URL;
  if (channel === "sms") return process.env.SMS_WEBHOOK_URL;
  return null;
};

const postWebhook = async (url, payload) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.NOTIFICATION_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.NOTIFICATION_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Provider returned ${response.status}: ${text}`);
  }

  return text || "provider-ok";
};

const sendNotification = async ({ user, order, channel, subject, message, recipient }) => {
  const notification = await Notification.create({
    user: user._id,
    order: order?._id,
    channel,
    recipient,
    subject,
    message,
    status: "queued",
  });

  try {
    const webhookUrl = webhookForChannel(channel);

    if (webhookUrl) {
      notification.providerResponse = await postWebhook(webhookUrl, {
        to: recipient,
        subject,
        message,
        channel,
        orderId: order?._id,
        userId: user._id,
      });
    } else {
      console.log(`[${channel.toUpperCase()}] ${recipient}: ${subject} - ${message}`);
      notification.providerResponse = "console-provider";
    }

    notification.status = "sent";
  } catch (error) {
    notification.status = "failed";
    notification.providerResponse = error.message;
  }

  await notification.save();
  return notification;
};

const sendStatusNotification = async (order, status, note) => {
  const customer = await User.findById(order.customer);

  if (!customer) {
    return [];
  }

  const subject = `Order ${order._id} status updated`;
  const message = `Your delivery status is now ${status}${note ? ` (${note})` : ""}.`;
  const notifications = [];

  if (customer.email) {
    notifications.push(
      await sendNotification({
        user: customer,
        order,
        channel: "email",
        recipient: customer.email,
        subject,
        message,
      })
    );
  }

  if (customer.phone) {
    notifications.push(
      await sendNotification({
        user: customer,
        order,
        channel: "sms",
        recipient: customer.phone,
        subject,
        message,
      })
    );
  }

  return notifications;
};

module.exports = {
  sendNotification,
  sendStatusNotification,
};
