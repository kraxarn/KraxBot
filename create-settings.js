
var settings = {};

settings.userinfo = {
	username: "",
	password: "",
	steamGuard: ""
}

settings.login = {
	loginMode: 0,
	state: "online",
	playGame: "205"
}

settings.info = {
	name: "KraxBot",
	version: "1.0"
}

settings.owner = {
	id: "0"
}

settings.chats = [];

settings.commands = {
	ver: true,
	id: true,
	chatid: true,
	random: true,
	lock: true,
	unlock: true,
	timeout: true,
	users: true,
	play: true,
	rules: true,
	setname: true,
	kick: true,
	updated: true,
	add: true
}

console.log(settings);
require('fs').writeFileSync('./settings.json', JSON.stringify(settings, null, '\t'));
