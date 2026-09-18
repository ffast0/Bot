import express from "express";
import TelegramBot from "node-telegram-bot-api";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.TOKEN_API;

// Vercel serverless uchun bot initialization (polling siz)
const bot = new TelegramBot(token);

// ==================== EXPRESS SERVER SETUP ====================
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Telegram Game Bot is running on Vercel!");
});

app.post("/webhook", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ==================== MONGODB ULANISH VA MODEL ====================
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB-ga muvaffaqiyatli ulandi..."))
    .catch((err) => console.error("MongoDB ulanishda xatolik:", err));
}

const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  firstName: { type: String, default: "Foydalanuvchi" },
  username: { type: String, default: "" },
  numWins: { type: Number, default: 0 }
});

const UserStats = mongoose.models.UserStats || mongoose.model("UserStats", userSchema);

const addNumWin = async (tgUser, amount = 1) => {
  try {
    const userId = tgUser.id;
    const firstName = tgUser.first_name || "Foydalanuvchi";
    const username = tgUser.username ? `@${tgUser.username}` : "";

    await UserStats.findOneAndUpdate(
      { userId },
      {
        $inc: { numWins: amount },$set: { firstName, username }
      },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("G'alaba saqlashda xatolik:", e);
  }
};

const modifyPointsByIdOrUsername = async (identifier, amount) => {
  try {
    let filter = {};
    if (/^\d+$/.test(identifier)) {
      filter = { userId: parseInt(identifier, 10) };
    } else {
      const formattedUsername = identifier.startsWith("@") ? identifier : `@${identifier}`;
      filter = { username: new RegExp(`^${formattedUsername}$`, "i") };
    }

    return await UserStats.findOneAndUpdate(
      filter,
      { $inc: { numWins: amount } },
      { new: true }
    );
  } catch (e) {
    console.error("Ball o'zgartirishda xatolik:", e);
    return null;
  }
};

// ==================== GAME LOGIC & HELPERS ====================
let userGames = {};
let gameTimers = {};

const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getMention = (user) => {
  const safeName = (user.first_name || "Foydalanuvchi").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<a href="tg://user?id=${user.id}">${safeName}</a>`;
};

const safeDeleteMessage = async (chatId, messageId) => {
  try {
    if (messageId) await bot.deleteMessage(chatId, messageId);
  } catch (e) {
    // Xabarni o'chirib bo'lmasa xatolikni inkor etamiz
  }
};

const createXOBoard = (board) => {
  const keyboard = [];
  for (let i = 0; i < 3; i++) {
    const row = [];
    for (let j = 0; j < 3; j++) {
      const index = i * 3 + j;
      const val = board[index];
      row.push({
        text: val ? val : " ",
        callback_data: `xo_${index}`
      });
    }
    keyboard.push(row);
  }
  return { inline_keyboard: keyboard };
};

const checkXOWinner = (board) => {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Satrlar
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Ustunlar
    [0, 4, 8], [2, 4, 6]             // Diagonallar
  ];

  for (const [a, b, c] of winPatterns) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every((cell) => cell !== null)) {
    return "draw";
  }

  return null;
};

const getBestBotMove = (board) => {
  const emptyIndices = board
    .map((val, idx) => (val === null ? idx : null))
    .filter((val) => val !== null);

  if (emptyIndices.length === 0) return null;
  return random(emptyIndices);
};

// ==================== BOT HANDLERS ====================
bot.on("message", async (msg) => {
  const chatId = msg.chat?.id;
  const userId = msg.from?.id;
  if (!chatId) return;

  const text = msg.text;

  // Maxsus ID uchun ball boshqaruvi
  if (userId === 6332173072 && text) {
    const trimmedText = text.trim();

    if (/^[+-]\d+$/.test(trimmedText) && msg.reply_to_message?.from) {
      const targetUser = msg.reply_to_message.from;
      const amount = parseInt(trimmedText, 10);
      await addNumWin(targetUser, amount);
      const actionText = amount >= 0 ? `+${amount} ball qo'shildi` : `${amount} ball ayirildi`;

      bot.sendMessage(
        chatId,
        `✅ ${getMention(targetUser)} hisobiga ${actionText}!`,
        { parse_mode: "HTML", reply_to_message_id: msg.message_id }
      );
      return;
    }

    if (/^[+-]\d+$/.test(trimmedText) && !msg.reply_to_message) {
      const amount = parseInt(trimmedText, 10);
      await addNumWin(msg.from, amount);
      const actionText = amount >= 0 ? `+${amount} ball qo'shildi` : `${amount} ball ayirildi`;

      bot.sendMessage(
        chatId,
        `✅ Hisobingizga ${actionText}!`,
        { reply_to_message_id: msg.message_id }
      );
      return;
    }

    const match = trimmedText.match(/^([+-]\d+)\s+(@?\w+)$/);
    if (match) {
      const amount = parseInt(match[1], 10);
      const targetIdentifier = match[2];
      const updatedUser = await modifyPointsByIdOrUsername(targetIdentifier, amount);

      if (updatedUser) {
        const actionText = amount >= 0 ? `+${amount} ball qo'shildi` : `${amount} ball ayirildi`;
        const displayName = updatedUser.username ? updatedUser.username : updatedUser.firstName;
        bot.sendMessage(
          chatId,
          `✅ <b>${displayName}</b> hisobiga ${actionText}! (Jami: ${updatedUser.numWins})`,
          { parse_mode: "HTML", reply_to_message_id: msg.message_id }
        );
      } else {
        bot.sendMessage(chatId, `❌ Foydalanuvchi bazadan topilmadi!`, {
          reply_to_message_id: msg.message_id
        });
      }
      return;
    }
  }

  // Lichkada yashirin sonni qabul qilish
  if (msg.chat.type === "private") {
    let activeGameChatId = Object.keys(userGames).find((cId) => {
      const g = userGames[cId];
      return (
        g?.type === "num_pvp_setup" &&
        (g.player1.id === userId || g.player2.id === userId)
      );
    });

    if (activeGameChatId) {
      const game = userGames[activeGameChatId];
      const val = parseInt(text);

      if (isNaN(val) || val < 1 || val > 100) {
        bot.sendMessage(chatId, "❌ Xato! Iltimos, 1 dan 100 gacha bo'lgan faqat son kiriting:");
        return;
      }

      if (game.player1.id === userId) game.player1.secret = val;
      if (game.player2.id === userId) game.player2.secret = val;

      bot.sendMessage(chatId, `✅ Soningiz (${val}) muvaffaqiyatli saqlandi!`);

      if (game.player1.secret !== null && game.player2.secret !== null) {
        game.type = "num_pvp_active";
        game.turn = game.player1.id;

        bot.sendMessage(
          activeGameChatId,
          `🎮 <b>1vs1 Son Topish O'yini Boshlandi!</b>\n\n` +
          `👥 ${getMention(game.player1.raw)} va ${getMention(game.player2.raw)} o'z sonlarini yashirishdi!\n\n` +
          `🎯 Navbat: ${getMention(game.player1.raw)}`,
          { parse_mode: "HTML" }
        );
      }
      return;
    }
  }

  if (!text) return;

  // Statistika / Reyting
  if (["Statistika", "statistika", "Reyting", "reyting", "Top", "top"].includes(text)) {
    try {
      const topUsers = await UserStats.find({ numWins: { $gt: 0 } })
        .sort({ numWins: -1 })
        .limit(10);

      if (topUsers.length === 0) {
        bot.sendMessage(chatId, "🏆 Hali hech kim g'olib bo'lmagan!");
        return;
      }

      let leaderboardMsg = `🏆 <b>Eng Kuchli O'yinchilar:</b>\n\n`;
      topUsers.forEach((u, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "👤";
        const userDisplay = u.username ? u.username : u.firstName;
        leaderboardMsg += `${medal} <b>${index + 1}. ${userDisplay}</b> — <code>${u.numWins}</code> ta g'alaba\n`;
      });

      bot.sendMessage(chatId, leaderboardMsg, { parse_mode: "HTML" });
      return;
    } catch (e) {
      bot.sendMessage(chatId, "Statistikani olishda xatolik yuz berdi.");
      return;
    }
  }

  // Atmen & Udalit
  if (["Atmen", "atmen"].includes(text)) {
    if (userGames[chatId]) {
      delete userGames[chatId];
      bot.sendMessage(chatId, "🚫 Ketayotgan o'yin bekor qilindi!");
    } else {
      bot.sendMessage(chatId, "Hozirda hech qanday faol o'yin yo'q.");
    }
    return;
  }

  if (["Udalit", "udalit"].includes(text)) {
    userGames = {};
    gameTimers = {};
    bot.sendMessage(chatId, "🗑 Barcha o'yinlar tozalandi!");
    return;
  }

  // O'yinlar Menyusi
  if (["Oyinla", "Oyinlar", "O'yinlar", "Oyin"].includes(text)) {
    bot.sendMessage(chatId, "🎮 Qaysi o'yinni o'ynamoqchisiz?", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌/⭕️ X/O O'yini", callback_data: "select_xo_mode" }],
          [{ text: "🪨✂️📄 Tosh-Qog'oz-Qaychi", callback_data: "select_rps_mode" }],
          [{ text: "🔢 Son topish (1-100)", callback_data: "select_num_mode" }]
        ]
      }
    });
    return;
  }
});

bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat?.id || query.from.id;
  const messageId = query.message?.message_id;
  const data = query.data;
  const user = query.from;

  if (!chatId) {
    bot.answerCallbackQuery(query.id, { text: "Xatolik yuz berdi" });
    return;
  }

  // --- MENYULAR ---
  if (data === "select_xo_mode") {
    if (userGames[chatId]) {
      bot.answerCallbackQuery(query.id, { text: "Kutib turing! Guruhda faol o'yin mavjud.", show_alert: true });
      return;
    }
    await safeDeleteMessage(chatId, messageId);
    bot.sendMessage(chatId, "🎮 X/O o'yin rejimini tanlang:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🤖 Bot bilan", callback_data: "xo_mode_bot" }],
          [{ text: "👥 O'yinchi bilan (1vs1)", callback_data: "xo_mode_pvp" }]
        ]
      }
    });
    bot.answerCallbackQuery(query.id);
    return;
  }

  if (data === "select_rps_mode") {
    if (userGames[chatId]) {
      bot.answerCallbackQuery(query.id, { text: "Kutib turing! Guruhda faol o'yin mavjud.", show_alert: true });
      return;
    }
    await safeDeleteMessage(chatId, messageId);
    bot.sendMessage(chatId, "🪨✂️📄 Tosh-Qog'oz-Qaychi rejimini tanlang:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🤖 Bot bilan", callback_data: "start_rps_bot" }],
          [{ text: "👥 O'yinchi bilan (1vs1)", callback_data: "start_rps_pvp" }]
        ]
      }
    });
    bot.answerCallbackQuery(query.id);
    return;
  }

  if (data === "select_num_mode") {
    if (userGames[chatId]) {
      bot.answerCallbackQuery(query.id, { text: "Kutib turing! Guruhda faol o'yin mavjud.", show_alert: true });
      return;
    }
    await safeDeleteMessage(chatId, messageId);
    bot.sendMessage(chatId, "🔢 Son topish o'yini rejimini tanlang:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🤖 Bot bilan (1-100)", callback_data: "start_num_bot" }],
          [{ text: "👥 O'yinchi bilan (1vs1)", callback_data: "start_num_pvp" }]
        ]
      }
    });
    bot.answerCallbackQuery(query.id);
    return;
  }

  // --- TOSH-QOG'OZ-QAYCHI BOT BILAN ---
  if (data === "start_rps_bot") {
    await safeDeleteMessage(chatId, messageId);
    bot.sendMessage(chatId, "🪨✂️📄 Tanlang (Bot bilan):", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🪨 Tosh", callback_data: "rpsbot_tosh" },
            { text: "✂️ Qaychi", callback_data: "rpsbot_qaychi" },
            { text: "📄 Qog'oz", callback_data: "rpsbot_qogoz" }
          ]
        ]
      }
    });
    bot.answerCallbackQuery(query.id);
    return;
  }

  if (data.startsWith("rpsbot_")) {
    const userChoice = data.split("_")[1];
    const choices = ["tosh", "qaychi", "qogoz"];
    const botChoice = random(choices);
    const icons = { tosh: "🪨 Tosh", qaychi: "✂️ Qaychi", qogoz: "📄 Qog'oz" };

    let result = "";
    if (userChoice === botChoice) result = "Durang! 🤝";
    else if (
      (userChoice === "tosh" && botChoice === "qaychi") ||
      (userChoice === "qaychi" && botChoice === "qogoz") ||
      (userChoice === "qogoz" && botChoice === "tosh")
    ) result = "Siz yutdingiz! 🎉";
    else result = "Man yutdim! 😈";

    if (messageId) {
      bot.editMessageText(`Siz: ${icons[userChoice]}\nMan: ${icons[botChoice]}\n\nNatija: ${result}`, {
        chat_id: chatId,
        message_id: messageId
      });
    }
    bot.answerCallbackQuery(query.id);
    return;
  }

  // --- TOSH-QOG'OZ-QAYCHI 1VS1 ---
  if (data === "start_rps_pvp") {
    if (userGames[chatId]) {
      bot.answerCallbackQuery(query.id, { text: "Kutib turing! Faol o'yin mavjud.", show_alert: true });
      return;
    }
    await safeDeleteMessage(chatId, messageId);

    userGames[chatId] = {
      type: "rps_pvp_waiting",
      player1: { id: user.id, name: user.first_name, raw: user, choice: null },
      player2: null
    };

    await bot.sendMessage(
      chatId,
      `🪨✂️📄 <b>1vs1 Tosh-Qog'oz-Qaychi!</b>\n\nYaratuvchi: ${getMention(user)}\nRaqib: Kutilmoqda...`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🎮 Qo'shilish", callback_data: "rps_join_pvp" }]]
        }
      }
    );
    bot.answerCallbackQuery(query.id);
    return;
  }

  if (data === "rps_join_pvp") {
    const game = userGames[chatId];
    if (!game || game.type !== "rps_pvp_waiting") {
      bot.answerCallbackQuery(query.id, { text: "O'yin topilmadi!" });
      return;
    }
    if (game.player1.id === user.id) {
      bot.answerCallbackQuery(query.id, { text: "O'zingiz yaratgan o'yinga qo'shila olmaysiz!", show_alert: true });
      return;
    }

    game.player2 = { id: user.id, name: user.first_name, raw: user, choice: null };
    game.type = "rps_pvp_active";

    bot.editMessageText(
      `🪨✂️📄 <b>1vs1 Tosh-Qog'oz-Qaychi O'yini Boshlandi!</b>\n\n` +
      `👥 ${getMention(game.player1.raw)} VS ${getMention(game.player2.raw)}\n\n` +
      `Ikkala o'yinchi ham pastdagi tugmalardan birini tanlang (Tanlovingiz sir saqlanadi):`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🪨 Tosh", callback_data: "rpsplay_tosh" },
              { text: "✂️ Qaychi", callback_data: "rpsplay_qaychi" },
              { text: "📄 Qog'oz", callback_data: "rpsplay_qogoz" }
            ]
          ]
        }
      }
    );
    bot.answerCallbackQuery(query.id, { text: "O'yinga qo'shildingiz!" });
    return;
  }

  if (data.startsWith("rpsplay_")) {
    const game = userGames[chatId];
    if (!game || game.type !== "rps_pvp_active") {
      bot.answerCallbackQuery(query.id, { text: "Faol o'yin topilmadi!", show_alert: true });
      return;
    }

    if (user.id !== game.player1.id && user.id !== game.player2.id) {
      bot.answerCallbackQuery(query.id, { text: "Siz bu o'yinda qatnashmayapsiz!", show_alert: true });
      return;
    }

    const choice = data.split("_")[1];
    if (user.id === game.player1.id) {
      if (game.player1.choice) {
        bot.answerCallbackQuery(query.id, { text: "Siz tanlab bo'lgansiz! Raqibni kutib turing.", show_alert: true });
        return;
      }
      game.player1.choice = choice;
    } else {
      if (game.player2.choice) {
        bot.answerCallbackQuery(query.id, { text: "Siz tanlab bo'lgansiz! Raqibni kutib turing.", show_alert: true });
        return;
      }
      game.player2.choice = choice;
    }

    bot.answerCallbackQuery(query.id, { text: "Tanlovingiz saqlandi!" });

    if (game.player1.choice && game.player2.choice) {
      delete userGames[chatId];
      const p1C = game.player1.choice;
      const p2C = game.player2.choice;
      const icons = { tosh: "🪨 Tosh", qaychi: "✂️ Qaychi", qogoz: "📄 Qog'oz" };

      let textRes = "";
      if (p1C === p2C) textRes = "Durang! 🤝";
      else if (
        (p1C === "tosh" && p2C === "qaychi") ||
        (p1C === "qaychi" && p2C === "qogoz") ||
        (p1C === "qogoz" && p2C === "tosh")
      ) textRes = `G'olib: ${getMention(game.player1.raw)} 🎉`;
      else textRes = `G'olib: ${getMention(game.player2.raw)} 🎉`;

      bot.editMessageText(
        `🪨✂️📄 <b>1vs1 O'yin Tugadi!</b>\n\n` +
        `${getMention(game.player1.raw)}: ${icons[p1C]}\n` +
        `${getMention(game.player2.raw)}: ${icons[p2C]}\n\n` +
        `Natija: ${textRes}`,
        { chat_id: chatId, message_id: messageId, parse_mode: "HTML" }
      );
    }
    return;
  }

  // --- SON TOPISH (1-100) BOT BILAN ---
  if (data === "start_num_bot") {
    await safeDeleteMessage(chatId, messageId);
    const target = Math.floor(Math.random() * 100) + 1;
    userGames[chatId] = { type: "number_guess_bot", target, attempts: 0 };
    bot.sendMessage(chatId, "🔢 Men 1 dan 100 gacha son o'yladim. Qaysi son ekanligini toping va chatga yozing!");
    bot.answerCallbackQuery(query.id);
    return;
  }

  // --- SON TOPISH (1-100) 1VS1 REJIMI ---
  if (data === "start_num_pvp") {
    if (userGames[chatId]) {
      bot.answerCallbackQuery(query.id, { text: "Kutib turing! Faol o'yin mavjud.", show_alert: true });
      return;
    }
    await safeDeleteMessage(chatId, messageId);

    userGames[chatId] = {
      type: "num_pvp_waiting",
      player1: { id: user.id, name: user.first_name, raw: user, secret: null },
      player2: null
    };

    bot.sendMessage(
      chatId,
      `🔢 <b>1vs1 Son Topish (1-100)</b>\n\nYaratuvchi: ${getMention(user)}\nRaqib: Kutilmoqda...`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🎮 Qo'shilish", callback_data: "num_join_pvp" }]]
        }
      }
    );
    bot.answerCallbackQuery(query.id);
    return;
  }

  if (data === "num_join_pvp") {
    const game = userGames[chatId];
    if (!game || game.type !== "num_pvp_waiting") {
      bot.answerCallbackQuery(query.id, { text: "O'yin topilmadi!" });
      return;
    }
    if (game.player1.id === user.id) {
      bot.answerCallbackQuery(query.id, { text: "O'zingiz yaratgan o'yinga qo'shila olmaysiz!", show_alert: true });
      return;
    }

    game.player2 = { id: user.id, name: user.first_name, raw: user, secret: null };
    game.type = "num_pvp_setup";

    const botUsername = (await bot.getMe()).username;

    bot.editMessageText(
      `🔢 <b>1vs1 Son Topish O'yini!</b>\n\n` +
      `👥 ${getMention(game.player1.raw)} vs ${getMention(game.player2.raw)}\n\n` +
      `⚠️ <b>DIQQAT:</b> Ikkala o'yinchi ham botning shaxsiy xabariga (Lichka) kirib, 1 dan 100 gacha raqib topishi kerak bo'lgan yashirin son yuborsin!\n\n` +
      `👇 Lichkaga o'tish uchun tugmani bosing:`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📩 Bot Lichkasiga O'tish", url: `https://t.me/${botUsername}` }]
          ]
        }
      }
    );
    bot.answerCallbackQuery(query.id, { text: "O'yinga qo'shildingiz!" });
    return;
  }

  // --- X/O MANTIQLARI ---
  if (data === "xo_mode_bot") {
    if (userGames[chatId]) {
      bot.answerCallbackQuery(query.id, { text: "Kutib turing! Faol o'yin mavjud.", show_alert: true });
      return;
    }
    await safeDeleteMessage(chatId, messageId);
    userGames[chatId] = {
      type: "xo_bot",
      board: Array(9).fill(null),
      player: { id: user.id, name: user.first_name, raw: user }
    };
    bot.sendMessage(
      chatId,
      `🎮 X/O O'yini!\n👤 O'yinchi: ${getMention(user)} (❌) vs Bot (⭕️)\n\nBirinchi siz yurasiz:`,
      { parse_mode: "HTML", reply_markup: createXOBoard(userGames[chatId].board) }
    );
    bot.answerCallbackQuery(query.id);
    return;
  }

  if (data === "xo_mode_pvp") {
    if (userGames[chatId]) {
      bot.answerCallbackQuery(query.id, { text: "Kutib turing! Faol o'yin mavjud.", show_alert: true });
      return;
    }
    await safeDeleteMessage(chatId, messageId);
    userGames[chatId] = {
      type: "xo_pvp_waiting",
      board: Array(9).fill(null),
      playerX: { id: user.id, name: user.first_name, raw: user },
      playerO: null,
      timeLeft: 30
    };

    const sentMsg = await bot.sendMessage(
      chatId,
      `🎮 X/O 1vs1 O'yini!\n\nYaratuvchi: ${getMention(user)} (❌)\nRaqib: Kutilmoqda...\n\n⏳ Boshlanishiga: 30 soniya`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🎮 Qo'shilish", callback_data: "xo_join_pvp" }]]
        }
      }
    );

    const gameMsgId = sentMsg.message_id;
    if (gameTimers[chatId]) clearInterval(gameTimers[chatId]);

    gameTimers[chatId] = setInterval(async () => {
      const game = userGames[chatId];
      if (!game || game.type !== "xo_pvp_waiting") {
        clearInterval(gameTimers[chatId]);
        return;
      }
      game.timeLeft -= 3;
      if (game.timeLeft <= 0) {
        clearInterval(gameTimers[chatId]);
        delete userGames[chatId];
        await safeDeleteMessage(chatId, gameMsgId);
        bot.sendMessage(chatId, "⏱ Vaqt tugadi! Ikkinchi o'yinchi qo'shilmadi. O'yin bekor qilindi.");
      } else {
        try {
          await bot.editMessageText(
            `🎮 X/O 1vs1 O'yini!\n\nYaratuvchi: ${getMention(game.playerX.raw)} (❌)\nRaqib: Kutilmoqda...\n\n⏳ Boshlanishiga: ${game.timeLeft} soniya`,
            {
              chat_id: chatId,
              message_id: gameMsgId,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [[{ text: "🎮 Qo'shilish", callback_data: "xo_join_pvp" }]]
              }
            }
          );
        } catch (e) {}
      }
    }, 3000);

    bot.answerCallbackQuery(query.id);
    return;
  }

  if (data === "xo_join_pvp") {
    const game = userGames[chatId];
    if (!game || game.type !== "xo_pvp_waiting") {
      bot.answerCallbackQuery(query.id, { text: "O'yin topilmadi yoki vaqt tugagan!" });
      return;
    }
    if (game.playerX.id === user.id) {
      bot.answerCallbackQuery(query.id, { text: "O'zingiz yaratgan o'yinga qo'shila olmaysiz!", show_alert: true });
      return;
    }

    if (gameTimers[chatId]) clearInterval(gameTimers[chatId]);

    game.playerO = { id: user.id, name: user.first_name, raw: user };
    game.type = "xo_pvp_active";
    game.turn = game.playerX.id;

    if (messageId) {
      bot.editMessageText(
        `🎮 X/O O'yini Boshlandi!\n\n❌ ${getMention(game.playerX.raw)} vs ⭕️ ${getMention(game.playerO.raw)}\n\nNavbat: ${getMention(game.playerX.raw)} (❌)`,
        { chat_id: chatId, message_id: messageId, parse_mode: "HTML", reply_markup: createXOBoard(game.board) }
      );
    }
    bot.answerCallbackQuery(query.id, { text: "O'yinga qo'shildingiz!" });
    return;
  }

  if (data.startsWith("xo_")) {
    const index = parseInt(data.split("_")[1]);
    const game = userGames[chatId];

    if (!game || !["xo_bot", "xo_pvp_active"].includes(game.type)) {
      bot.answerCallbackQuery(query.id, { text: "Faol o'yin topilmadi!", show_alert: true });
      return;
    }

    if (game.board[index] !== null) {
      bot.answerCallbackQuery(query.id, { text: "Bu katak band!" });
      return;
    }

    if (game.type === "xo_bot") {
      if (game.player && game.player.id !== user.id) {
        bot.answerCallbackQuery(query.id, { text: "Hozir boshqa odam o'ynamoqda!", show_alert: true });
        return;
      }

      game.board[index] = "❌";
      let winner = checkXOWinner(game.board);

      if (winner) {
        delete userGames[chatId];
        const textResult = winner === "draw" ? "Durang! 🤝" : "Siz yutdingiz! 🎉";
        if (messageId) {
          bot.editMessageText(`🎮 X/O O'yini tugadi!\n👤 ${getMention(game.player.raw)} vs Bot\n\nNatija: ${textResult}`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: createXOBoard(game.board)
          });
        }
        bot.answerCallbackQuery(query.id);
        return;
      }

      const botMove = getBestBotMove(game.board);
      if (botMove !== null && botMove !== undefined) {
        game.board[botMove] = "⭕️";
      }

      winner = checkXOWinner(game.board);
      if (winner) {
        delete userGames[chatId];
        const textResult = winner === "draw" ? "Durang! 🤝" : "Bot yutdi! ⭕️😈";
        if (messageId) {
          bot.editMessageText(`🎮 X/O O'yini tugadi!\n👤 ${getMention(game.player.raw)} vs Bot\n\nNatija: ${textResult}`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: createXOBoard(game.board)
          });
        }
        bot.answerCallbackQuery(query.id);
        return;
      }

      if (messageId) {
        bot.editMessageText(`🎮 X/O O'yini!\n👤 O'yinchi: ${getMention(game.player.raw)} (❌) vs Bot (⭕️)\n\nSizning navbatingiz (❌):`, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "HTML",
          reply_markup: createXOBoard(game.board)
        });
      }
      bot.answerCallbackQuery(query.id);
      return;
    }

    if (game.type === "xo_pvp_active") {
      if (user.id !== game.playerX.id && user.id !== game.playerO.id) {
        bot.answerCallbackQuery(query.id, { text: "Siz bu o'yinda qatnashmayapsiz!", show_alert: true });
        return;
      }

      if (user.id !== game.turn) {
        bot.answerCallbackQuery(query.id, { text: "Hozir sizning navbatingiz emas!", show_alert: true });
        return;
      }

      const symbol = user.id === game.playerX.id ? "❌" : "⭕️";
      game.board[index] = symbol;

      const winner = checkXOWinner(game.board);

      if (winner) {
        delete userGames[chatId];
        let textResult = "";
        if (winner === "draw") textResult = "Durang! 🤝";
        else if (winner === "❌") textResult = `G'olib: ${getMention(game.playerX.raw)} (❌) 🎉`;
        else textResult = `G'olib: ${getMention(game.playerO.raw)} (⭕️) 🎉`;

        if (messageId) {
          bot.editMessageText(`🎮 X/O O'yini tugadi!\n\n${textResult}`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: createXOBoard(game.board)
          });
        }
        bot.answerCallbackQuery(query.id);
        return;
      }

      game.turn = game.turn === game.playerX.id ? game.playerO.id : game.playerX.id;
      const nextPlayer = game.turn === game.playerX.id ? game.playerX.raw : game.playerO.raw;
      const nextSymbol = game.turn === game.playerX.id ? "❌" : "⭕️";

      if (messageId) {
        bot.editMessageText(
          `🎮 X/O O'yini!\n\n❌ ${getMention(game.playerX.raw)} vs ⭕️ ${getMention(game.playerO.raw)}\n\nNavbat: ${getMention(nextPlayer)} (${nextSymbol})`,
          { chat_id: chatId, message_id: messageId, parse_mode: "HTML", reply_markup: createXOBoard(game.board) }
        );
      }
      bot.answerCallbackQuery(query.id);
    }
  }
});

export default app;