var fs = require('fs');
var Steam = require('steam');
//require('steam-groups')(Steam);
var util = require('util');
//var ent = require('ent');
var request = require('request');

if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith = function (str) {
		return this.substring(0, str.length) === str;
	};
}

if (fs.existsSync('servers')) {
	Steam.servers = JSON.parse(fs.readFileSync('servers'));
}

var ver = '0.0.1 26/5-2016';

var timeout = 1;

var bot = new Steam.SteamClient();

console.log('[S] Successfully loaded KraxBot ' + ver);



bot.logOn({
	accountName: 'shadowsfatebot',
	password: 'Syndicate1766',
	// shaSentryfile: fs.readFileSync('sentryfile')
});

bot.on('loggedOn', function() {
	console.log('[S] Logged in!');
	bot.setPersonaState(Steam.EPersonaState.Online);
	bot.joinChat('103582791438721643');
	bot.gamesPlayed(['221410']);
});

bot.on('loggedOff', function() {
	console.log('[S] Logged out!');
	bot.logOff();
	bot.logOn({
		accountName: 'shadowsfatebot',
		password: 'Syndicate1766',
		shaSentryfile: fs.readFileSync('sentryfile')
	});
});

bot.on('servers', function(servers) {
	fs.writeFile('servers', JSON.stringify(servers));
});

bot.on('chatEnter', function(chatRoomID, response) {
	try {
		var perm = bot.chatRooms[chatRoomID][bot.steamID].rank;
		switch(perm) {
			case 0: rank = 'guest'; break;
			case 4: rank = 'user'; break;
			case 8: rank = 'mod'; break;
			case 2: rank = 'admin'; break;
			default: rank = 'Undefined (' + perm + ')'; break;
		}
		console.log('[S] Joined ' + chatRoomID + ' with status ' + response + ' and rank ' + rank);

	} catch(err) {
		console.log('[E] Error joining ' + chatRoomID + '. Status: ' + response);
		console.log('[E] Error joining chat: ' + err);
	}
});

bot.on('friend', function(userID, relationship) {
	console.log("[S] Friend event for " + userID + " type " + relationship);

	if (relationship == Steam.EFriendRelationship.PendingInvitee || relationship == 2) {
		console.log("[S] Friend invite from " + userID);
	}
	if (relationship == Steam.EFriendRelationship.Blocked || relationship == 1) {
		console.log("[S] Blocked by " + userID);
	}
	if (relationship == Steam.EFriendRelationship.Ignored || relationship == 5) {
		console.log("[S] Ignored " + userID);
	}
	if (relationship == Steam.EFriendRelationship.None || relationship == 0) {
		console.log("[S] Removed " + userID);
	}
});

bot.on('group', function(groupID, relationship) {
	console.log("[S] Group event for " + groupID + " type " + relationship);
	if (relationship == Steam.EClanRelationship.Invited) {
		console.log("[S] Joined group " + groupID);
		bot.sendMessage('76561198024704964', 'Pending group invite for ' + groupID, Steam.EChatEntryType.ChatMsg);
	}
});

bot.on('chatStateChange', function(status, chatter, chatRoomID) {
	var name = bot.users[chatter].playerName;

	switch(status) {
		case 1: msg = 'Welcome '; break; // Join
		case 2: msg = 'Good bye '; break; // Leave
		case 4: msg = 'R.I.P. '; break; // DC
		case 8: msg = 'Rekt '; break; // Kick
		case 16: msg = 'Shrekt '; break; // Ban
		case 4096: msg = 'Entered Voice Chat: '; break;
		case 8192: msg = 'Left Voice Chat: '; break;
		default: msg = 'Error (' + status + ') - '; break;
	}

	console.log('[C] ' + msg + name);
});

bot.on('tradeProposed', function(tradeID, steamID) {
	bot.respondToTrade(tradeID, false);
});

bot.on('friendMsg', function(chatter, message, type) {
	if (message && !message.startsWith("-")) {
		try {
			var name = bot.users[chatter].playerName;
		} catch(err) {
			console.log('[E] Error gettng name: ' + err);
			var name = Unknown;
		}
		console.log('[F] ' + name + ': ' + message);
	}
});

bot.on('chatMsg', function(source, message, type, chatter) {

	try {
		var perm = bot.chatRooms[source][chatter].rank;
	} catch(err) {
		var perm = 0;
	}

	try {
		var botperm = bot.chatRooms[source][bot.steamID].rank;
	} catch(err) {
		var botperm = 0;
	}

	var name = bot.users[chatter].playerName;
	var game = bot.users[chatter].gameName;
	console.log('[C] ' + name + ' [' + message.length + ']: ' + message);

	if (message == lastMsg && chatter == lastUsr && source == lastRoom) {
		if (perm == 8 || perm == 2 || perm == 1 || chatter == '76561198024704964') {
			console.log('[S] ' + name + ' spammed, but not kicked');
		} else {
			bot.sendMessage(source, "Please " + name + ", don't spam (duplicate message)" , type.ChatMsg);
			bot.kick(source, chatter);
		}
	}

	if (message.length > 400) {
		if (perm == 8 || perm == 2 || perm == 1 || chatter == '76561198024704964') {
			console.log('[S] ' + name + ' spammed, but not kicked');
		} else {
			bot.sendMessage(source, "Please " + name + ", don't spam (message too long)" , type.ChatMsg);
			message = 'Spam_TooLong';
			bot.kick(source, chatter);
		}
	}

	if (lastTime == timeout && message && chatter == lastUsr) {
		if (perm == 8 || perm == 2 || perm == 1 || chatter == '76561198024704964') {
			console.log('[S] ' + name + ' spammed, but not kicked');
		} else {
			bot.sendMessage(source, "Please " + name + ", don't spam (sending messages too fast)" , type.ChatMsg);
			message = 'Spam_TooFast';
		}
	}

	if (message == '!ver') {
		bot.sendMessage(source, 'SF Bot ' + ver + ', Based on KraxBot by KraXarN', type.ChatMsg);
	}

	if (message == '!id') {
		bot.sendMessage(source, 'Your ID is: ' + chatter, type.ChatMsg);
	}

	if (message == '!chatid') {
		bot.sendMessage(source, "This chat's ID is: " + source, type.ChatMsg);
	}

// REMAKE! Port new one from DASH-E

if (message == '!random') {
	if (perm == 8 || perm == 2 || perm == 1 || chatter == '76561198024704964') {
		var users = bot.chatRooms[source];
		var ranPlayer = Math.floor(Math.random() * Object.keys(users).length);
		var winner = bot.users[Object.keys(users)[ranPlayer]].playerName;
		bot.sendMessage(source, 'The winner is ' + winner, type.ChatMsg);
		console.log('[S] Winner is ' + winner + ' (' + Object.keys(users)[ranPlayer] + ')');
		timeout_random = timeout + CR[source].RandomDelay;
	} else {
		bot.sendMessage(source, 'This command is disabled for ' + (timeout_random - timeout) + ' more seconds', type.ChatMsg);
	}
}

if (message == '!timeout') {
	if (chatter == '76561198024704964') {
		bot.sendMessage(source, 'Current timeout value is: ' + timeout, type.ChatMsg);
	} else {
		bot.sendMessage(source, 'This comamnd is for debugging purposes only and should only be executed by Krax.', type.ChatMsg);
	}
}

if (message == '!users') {
	var guests = 0;
	var users = 0;
	var mods = 0;
	var admins = 0;
	var owner = 'No';
	for (var userID in bot.chatRooms[source]) {
		var rank = bot.chatRooms[source][userID].rank;
		if (rank == '0') { guests++; }
		else if (rank == '4') { users++; }
		else if (rank == '8') { mods++; }
		else if (rank == '2') { admins++; }
		else if (rank == '1') { owner = 'Yes'; }
	}
	bot.sendMessage(source, 'People in chat: ' + Object.keys(bot.chatRooms[source]).length + ', Guests: ' + guests + ', Users: ' + users + ', Mods: ' + mods + ', Admins: ' + admins + ', Owner: ' + owner, type.ChatMsg);
}

if (message.startsWith("!play ")) {
	if (chatter == '76561198024704964' || chatter == '76561198024917234') {
		bot.gamesPlayed([Number(message.substring(message.indexOf("!play")+6, message.length))]);
	} else {
		bot.sendMessage(source, "This command is for Krax only! ( ° ͜ʖ͡°)╭∩╮", type.ChatMsg);
	}
}

// REMAKE! Allow reading rules from file instead

if (message == '!rules') {
	bot.sendMessage(source, "Default rules: \n1. No begging for stuff \n2. No spamming \n3. Use common sense \n4. The decisions of mods and admins are final \n5. Don't spam the bot's commands \nFailing to follow these rules result in kick/ban!", type.ChatMsg);
}

if (message.startsWith("!setname ")) {
	if (chatter == '76561198024704964' || chatter == '76561198024917234') {
		bot.setPersonaName(message.substring(message.indexOf("!setname")+8, message.length));
	} else {
		bot.sendMessage(source, "This command is for Krax only! ( ° ͜ʖ͡°)╭∩╮", type.ChatMsg);
	}
}

if (message.startsWith("!kick ")) {
	if (perm == 8 || perm == 2 || perm == 1 || chatter == '76561198024704964') {
		var keyword = message.substring(message.indexOf("!kick")+6, message.length).toLowerCase();
		var results = 0;

		for (var key in bot.chatRooms[source]) {
			if (bot.users[key].playerName.toLowerCase().indexOf(keyword) > -1) {
				if (results < 1) {
					bot.kick(source, key);
					results++;
				} else {
					results++;
				}
			}
		}

		if (results == 0) {
			bot.sendMessage(source, "No results found", type.ChatMsg);
		}
	} else {
		bot.kick(source, chatter);
	}
}

if (message == '!updated') {
	updateDate = ((timeout / 60) / 60) / 24;
	if (updateDate > 1) {
		bot.sendMessage(source, 'I was last updated ' +  Math.round(((timeout / 60) / 60) / 24) + ' days ago', type.ChatMsg);
	} else {
		bot.sendMessage(source, 'I was last updated today', type.ChatMsg);
	}
}

// REAMKE! Remove?

if (message.startsWith("!add ")) {
	if (chatter == '76561198024704964' || chatter == '76561198024917234') {
		bot.addFriend(message.substring(message.indexOf("!add")+4, message.length));
		bot.sendMessage(source, 'Added!', type.ChatMsg);
	} else {
		bot.sendMessage(source, 'This comamnd is for debugging purposes only and should only be executed by Krax.', type.ChatMsg);
	}
}

lastMsg = message;
lastUsr = chatter;
lastTime = timeout;

});

// REMAKE! Remove?

function GroupName(ID, callback) {
	var xml = " http://steamcommunity.com/gid/" + ID + "/memberslistxml?xml=1";
	request(xml, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var groupNamePre = body.substring(body.indexOf("<groupName>") + 12, body.indexOf("</groupName>") - 1);
			var name = groupNamePre.replace("![CDATA[", "").replace("]]", "");
			if (name) {
				if (typeof(callback) === 'function') {
					callback(name);
				}
			} else {
				return false; //Or your custom error string.
			}
		} else {
			return 'Returned_Error';
		}
	});
}

setInterval(function(){
	timeout++;
}, 1000);

/* Safety first
process.on('uncaughtException', function(err) {
	console.log('[E] Caught exception: ' + err);
	bot.sendMessage('76561198024704964', 'Caught exception: ' + err, Steam.EChatEntryType.ChatMsg);
});
*/
