const { Telegraf, Markup, session, Scenes } = require('telegraf');
const { JsonBase, Users } = require('./tools')

const bot = new Telegraf("")

const chats = new JsonBase('chats', [], './database')
const films = new JsonBase('films', [], './database')
const users = new Users({
    isAdmin: false
})



const loadLib = (name) => {
    const path = `./${name}`;
    const result = require(path)(bot.context);
    if (result) bot.context[name] = result;
}

loadLib('context')

const addFilm = new Scenes.WizardScene('add-film',
    async (ctx) => {
        await ctx.removeKeyboard("🎬")
        ctx.session.film = {}
        await ctx.reply('Введите название фильма:')
        return ctx.wizard.next()
    },
    async (ctx) => {
        if (ctx.message.text) {
            ctx.session.film.name = ctx.message.text
            await ctx.reply('Введите код фильма только цифрами:\nПример: 50')
            return ctx.wizard.next()
        } else ctx.reply('Введите только текст!')
    }, 
    async (ctx) => {
        if (ctx.message.text) {
            ctx.session.film.id = ctx.message.text
            films.body.push(ctx.session.film)
            films.save()
            await ctx.reply(`Фильм под названием ${ctx.session.film.name} и ID:${ctx.session.film.id} был успешно добавлен!`)
            await ctx.sendStart()
            return ctx.scene.leave()
        } else ctx.reply('Введите только текст!')
    }
)

const sendNews = new Scenes.WizardScene('send-news',
    async (ctx) => {
        await ctx.removeKeyboard("📨")
        await ctx.reply('Отправьте сообщение которое хотите разослать:')
        return ctx.wizard.next()
    },
    async (ctx) => {
        users.getArray().forEach(async (user) => {
            try {
                await ctx.telegram.copyMessage(user.id, ctx.chat.id, ctx.message.message_id);
            } catch (e) {
                console.log(`Ошибка при копировании сообщения пользователю ${user.id}: ${e.message}`);
            }
        });
    }
)

const stage = new Scenes.Stage([ addFilm, sendNews ])

bot
.catch(error => console.log("пизда"))

bot
.use(session())
.use(stage.middleware())
.use((ctx, next) => {
  // define ctx.session if not exists
  ctx.session ??= {}
  return next()
})
.use(Telegraf.log())

bot.telegram.setMyCommands([
    {command: 'info', description: 'Информация'},
    {command: 'help', description: 'Помощь по боту'},
    {command: 'start', description: 'Запустить/Перезапустить бота'},
])

bot
.start(async ctx => {
    if (ctx.chat.type === 'private') {
        const user = users.get(ctx.from, true)
        await ctx.sendStart()
    }
})

bot
.action("send-news", async ctx => {
    ctx.deleteMessage()
    ctx.scene.enter("send-news")
})
.command("admin", async ctx => {
    const user = users.get(ctx.from)
    if (user.isAdmin) {
        await ctx.sendBack("🔐")
        await ctx.reply('Админ панель', Markup
            .inlineKeyboard([
                [Markup.button.callback('Добавить фильм', 'add-film')],
                [Markup.button.callback("Отправить рассылку", "send-news")]
            ])
        )
    }
})
.command('info', async ctx => {
    if (ctx.chat.type === 'private') ctx.reply('E')
})
.command('help', async ctx => {
    if (ctx.chat.type === 'private') ctx.reply('Инструкция - как найти фильм или сериал по коду. Для этого нажмите на кнопку старт или напишите /start, после этого нажмите на кнопку - Найти Фильмы/Сериалы по Коду, после этого вам нужно будет подписаться на телеграм канал(ы) а потом нажмите на кнопку Я подписался если вы подписались на все эти каналы то вы уже можете написать код фильма и узнать название фильма или сериала.')
})
.command('connect_chat', async ctx => {
    if (ctx.chat.type != 'private') {
        const { status } = await ctx.getChatMember(ctx.from.id)
        if (status === 'creator' || status === 'administrator') {
            const chat = chats.body.find(x => x.id == ctx.chat.id) 
            if (!chat) {
                const msg = (await ctx.telegram.createChatInviteLink(ctx.chat.id, {
                    expire_date: 0,
                    member_limit: 0
                })).invite_link
                chats.body.push({
                    id: ctx.chat.id,
                    title: ctx.chat.title,
                    type: ctx.chat.type,
                    link: msg,
                    users: []
                })
                chats.save()
                await ctx.telegram.sendMessage(ctx.from.id, `Чат [${ctx.chat.id} | ${ctx.chat.title}] успешно подключен к боту!`)
            } else ctx.telegram.sendMessage(ctx.from.id, `Чат [${ctx.chat.id} | ${ctx.chat.title}] уже подключен к боту!`)
        } else ctx.reply('Вам не доступна данная команда!')
    }
})

bot
.action('true-sub', async ctx => {
    let res = []
    for (const key of Object.keys(chats.body)) {
        try {
            const msg = await ctx.telegram.getChatMember(chats.body[key].id, ctx.from.id)
            if (msg.status === 'left') res.push(false)
            else res.push(true)
        } catch (e) { res.push(false)}
    }
    console.log(res)
    if (res.indexOf(false) > -1) return ctx.answerCbQuery('Вы не подписались на какой то из каналов!\nПопробуйте снова!')
    else { ctx.send('Отправьте боту код фильма:') }
})
.action('add-film', async ctx => {
    ctx.answerCbQuery()
    return ctx.scene.enter('add-film')
})

bot
.on('message', async ctx => {
    const user = users.get(ctx.from)
    if (/^\d+$/.test(ctx.message.text)) {
        let res = []
        for (const key of Object.keys(chats.body)) {
            try {
                await ctx.telegram.getChatMember(chats.body[key].id, ctx.from.id)
                res.push(true)
            } catch (e) { res.push(false)}
        }
        if (res.indexOf(false) === -1) {
            const film = films.body.find(x => x.id == ctx.message.text)
            if (film) ctx.reply(`Название фильм: ${film.name} || ID фильма: ${film.id}`)
            else ctx.reply('Такой фильм не существует!')
        }
    }
    switch (ctx.message.text) {

        case 'Найти Фильмы/Сериалы по Коду 🔎':
            await ctx.sendBack("🔎")
            const buttons = chats.body.map(x => {
                return Markup.button.url(x.title, x.link)
            })
            await buttons.push({ text: 'Я подписался ✅', callback_data: 'true-sub'})
            await ctx.reply('Для начала подпишитесь на все каналы! и не отключайте уведомление', Markup.inlineKeyboard(chunk(buttons, 1)))
        break;

        case 'Чат Киноманов 🔥': ctx.reply('Чат Киноманов для общения', Markup
            .inlineKeyboard([
                [Markup.button.url('Перейти в чат 🔥', 'https://t.me/kinoouchat')]
            ])
        )
        break;

        case 'Новости из мира кино 🎥': ctx.reply('Последние новости из мира кино подпишитесь там будет интересно!', {
            ...Markup.inlineKeyboard([
                [Markup.button.url('Перейти в канал 🔥', 'https://t.me/kinoutimee')]
            ]),
            disable_web_page_preview: true
        })
        break;

        case 'Главное меню 📌': ctx.sendStart()
        break;
    }
})

bot
.launch({dropPendingUpdates: true})
.then(console.log('Бот запущен!'))

function chunk (arr, size) {
    return Array.from({
      length: Math.ceil(arr.length / size)
    })
    .fill(null)
    .map(() => arr.splice(0, size));
  }