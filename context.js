const fs = require('fs');
const { Markup } = require('telegraf')

const basic_options = { parse_mode: 'HTML', disable_web_page_preview: true };

module.exports = (ctx) => {
	Object.assign(ctx, {

		send: async function(text, extra = {}) { 
			const chat_id = extra.chat_id || this.chat.id;
			delete extra.chat_id;
			return this.telegram.sendMessage(chat_id, text, Object.assign(extra, basic_options));
		},

		edit: async function(text, extra = {}){
			const chat_id = extra.chat_id || this.chat.id;
			const message_id = extra.message_id || this.callbackQuery.message.message_id
			delete extra.chat_id;
			delete extra.message_id;
			return this.telegram.editMessageText(chat_id, message_id, null, text, Object.assign(extra, basic_options));
		},
		

		sendBack: async function(smile, extra = {}){
			const chatId = extra.chat_id || this.chat.id
			await this.telegram.sendMessage(chatId, smile, {
					...Markup.keyboard([
						[('Главное меню 📌')]
					]).resize(),
				}
			)
		},

		sendStart: async function(extra = {}){
			const chatId = extra.chat_id || this.chat.id
			await this.telegram.sendMessage(chatId, `Привет ${this.from.first_name ? this.from.first_name : 'незнакомец'}\nВыбери действие...`, {
				...Markup.keyboard([
					[('Найти Фильмы/Сериалы по Коду 🔎')],
					[('Чат Киноманов 🔥')],
					[('Новости из мира кино 🎥')],
				]).resize()
			})  
		},

		removeKeyboard: function(smile, extra = {}) {
			const chatId = extra.chat_id || this.chat.id
			this.telegram.sendMessage(chatId, smile, {
				reply_markup: {
					remove_keyboard: true
				}
			})
		},
	});
};

function chunk (arr, size) {
    return Array.from({
      length: Math.ceil(arr.length / size)
    })
    .fill(null)
    .map(() => arr.splice(0, size));
  }