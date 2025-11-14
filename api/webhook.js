import { Telegraf } from 'telegraf';
import { google } from 'googleapis';

const bot = new Telegraf(process.env.BOT_TOKEN);

let userStates = {}; // временное хранилище состояний

// Подключение к Google Sheets
async function addToSheet(data) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SHEET_ID;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A:F',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [data] }
  });
}

// Команда /start
bot.start(async (ctx) => {
  await ctx.reply(
    'Привет! 🌿 Это бот галереи. Выберите мастер-класс:',
    {
      reply_markup: {
        keyboard: [
          ['🎨 Живопись'],
          ['🕯 Арт-свечи'],
          ['🪶 Каллиграфия']
        ],
        resize_keyboard: true
      }
    }
  );
  userStates[ctx.chat.id] = { step: 'choose_class' };
});

// Обработка сообщений
bot.on('text', async (ctx) => {
  const state = userStates[ctx.chat.id] || {};

  if (state.step === 'choose_class') {
    state.masterclass = ctx.message.text;
    state.step = 'name';
    await ctx.reply('Введите ваше имя:');
  } else if (state.step === 'name') {
    state.name = ctx.message.text;
    state.step = 'phone';
    await ctx.reply('Введите ваш телефон:');
  } else if (state.step === 'phone') {
    state.phone = ctx.message.text;
    state.step = 'comment';
    await ctx.reply('Напишите комментарий (например, количество человек):');
  } else if (state.step === 'comment') {
    state.comment = ctx.message.text;
    const data = [
      new Date().toLocaleString(),
      state.name,
      state.phone,
      state.masterclass,
      state.comment,
      `@${ctx.from.username || ''}`
    ];
    await addToSheet(data);
    await ctx.reply(
      `✨ Прекрасно, ${state.name}! Ваша заявка на "${state.masterclass}" принята.\n\n` +
      `🎨 Наш администратор свяжется с вами в ближайшее время для уточнения деталей.\n\n` +
      `А пока можете заглянуть к нам в галерею или посмотреть работы наших мастеров! 🌿\n\n` +
      `До встречи на мастер-классе! 💫`
    );
    userStates[ctx.chat.id] = {};
  } else {
    await ctx.reply('Нажмите /start чтобы записаться на мастер-класс.');
  }
});

// Обработка запроса Telegram → Vercel
export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      return res.status(200).send('ok');
    } else {
      return res.status(200).send('Bot is running');
    }
  } catch (error) {
    console.error('Error handling update:', error);
    return res.status(500).send('Error');
  }
}
