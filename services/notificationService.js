const Notification = require('../models/Notification');
const { getIO } = require('../socket');

async function createNotification({ recipient, type, title, message, data = {}, priority = 'low', actionUrl, user }) {
  const notif = await Notification.create({
    recipient,
    user: user || recipient,
    type,
    title,
    message,
    data,
    priority,
    actionUrl
  });

  try {
    const io = getIO();
    io.to(recipient.toString()).emit(type, notif.toObject());
  } catch (err) {
    // socket not initialized or emit failed
  }
  return notif;
}

module.exports = { createNotification };
