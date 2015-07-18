// Welcome to the open source version of DASH-E!
// In order to use the bot, we need to set some values first

// You need to provide login info for a free Steam account
var BotUser = 'username';
var BotPW = 'password';

// The rest is optional, you can leave these to default values

// Set the country to use for the Steam Store.
var StoreCountry = 'se';

// And the lanugage to use, as of yet, this really doesn't matter.
var StoreLang = 'en';

// Next, we want the bot to have a name
var BotName = 'DASH-E';

// We can also make the bot play a game
var BotGame = '205';

// Next up we'll set up some error messages

// Insufficient permission error
var MsgNoPerm = 'Insufficient permission';

// Link error
var MsgLinkErr = 'Error, try again';

// General error
var MsgErr = 'Error!';

// That's it! Below is the source code if you want to modify or change something manually

var fs = require('fs');
var Steam = require('steam');
var util = require('util');
var Cleverbot = require('cleverbot-node');
var ent = require('ent');
var request = require('request');
var SteamStore = require('steam-store');
var steamServerStatus = require('steam-server-status');

var steam = require('steam-community'),
    client = steam();

if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str) {
    	return this.substring(0, str.length) === str;
    };
}

var store = new SteamStore({
  country:  StoreCountry,
  language: StoreLang
});

var lastMsg;
var lastUsr;
var cleverbots = {};
var bot = new Steam.SteamClient();

bot.logOn({
 	accountName: BotUser,
 	password: BotPW
});

bot.on('loggedOn', function() {
	console.log('[S] Logged in!');
	bot.setPersonaState(Steam.EPersonaState.Online);
	bot.setPersonaName(BotName);
	bot.gamesPlayed([BotGame]);
});

bot.on('loggedOff', function() {
	console.log('[S] Logged out!');
});

bot.on('servers', function(servers) {
	fs.writeFile('servers', JSON.stringify(servers));
});

bot.on('chatInvite', function(chatRoomID, chatRoomName, patronID) {
	console.log('[S] Got an invite to ' + chatRoomName + ' from ' + bot.users[patronID].playerName);
	bot.joinChat(chatRoomID);
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
	}
});

bot.on('friend', function(userID, relationship) {
	console.log("[S] Friend event for " + userID + " type " + relationship);
	if (relationship == Steam.EFriendRelationship.PendingInvitee) {
		console.log("[S] Added " + userID + " as a friend");
		bot.addFriend(userID);
	}
	if (relationship == Steam.EFriendRelationship.None) {
		console.log("[S] Removed " + userID + " as a friend");
	}
});

bot.on('group', function(groupID, relationship) {
	console.log("[S] Group event for " + groupID + " type " + relationship);
	if (relationship == Steam.EClanRelationship.Invited) {
		console.log("[Q] Wanted to join group " + groupID);
	}
});

bot.on('chatStateChange', function(status, chatter, chatRoomID) {
	var name = bot.users[chatter].playerName;
	switch(status) {
		case 1: msg = 'Welcome '; break;
		case 2: msg = 'Good bye '; break;
		case 4: msg = 'R.I.P. '; break;
		case 8: msg = 'Rekt '; break;
		case 16: msg = 'Shrekt '; break;
		default: msg = 'Error Undefined (' + status + ') - '; break;
	}
	bot.sendMessage(chatRoomID, msg + name, Steam.EChatEntryType.ChatMsg);
	console.log('[C] ' + msg + name + ' (' + chatRoomID + ')');
});

bot.on('tradeProposed', function(tradeID, steamID) {
	bot.respondToTrade(tradeID, false);
});

bot.on('friendMsg', function(chatter, message, type) {
	if (message) {
		var name = bot.users[chatter].playerName;
		console.log('[F] ' + name + ': ' + message);
		message = message.trim();
		checkCleverbotInstance(chatter);
		cleverbots[chatter]["cleverbot"].write(message, function(resp) {
			cleverbots[chatter]["lastMessage"] = new Date();
			var reply;
			if (resp['message'] && resp['message'] != "<html>") {
				reply = (chatter === undefined) ? resp['message'] : resp['message'];
			} else {
				reply = "Bot is broken. Please try again later.";
				// showError("Bot is broken. Response was: " + JSON.stringify(resp));
			}
			bot.sendMessage(chatter, ent.decode(reply), Steam.EChatEntryType.ChatMsg);
			console.log('[F] Bot, ' + name + ': ' + ent.decode(reply));
		});
	}
});

bot.on('chatMsg', function(source, message, type, chatter) {
	var perm = bot.chatRooms[source][chatter].rank;
	var name = bot.users[chatter].playerName;
	var game = bot.users[chatter].gameName;
	console.log('[C] ' + name + ' [' + message.length + ']: ' + message);

if (message == lastMsg && chatter == lastUsr) {
	if (perm == 8 || perm == 2 || perm == 1) {
		console.log('[S] ' + name + ' spammed, but not kicked');
	} else {
		bot.sendMessage(source, "Please " + name + ", don't spam (sent the same message twice)" , type.ChatMsg);
		bot.kick(source, chatter);
	}
}

if (message.length > 400) {
	if (perm == 8 || perm == 2 || perm == 1) {
		console.log('[S] ' + name + ' spammed, but not kicked');
	} else {
		bot.sendMessage(source, "Please " + name + ", don't spam (message too long)" , type.ChatMsg);
		bot.kick(source, chatter);
	}
}

if (message.startsWith(".") || (message.indexOf('DASH-E') > -1)) {
	message = message.trim();
	checkCleverbotInstance(source);
	cleverbots[source]["cleverbot"].write(message, function(resp) {
		cleverbots[source]["lastMessage"] = new Date();
		var reply;
		if (resp['message'] && resp['message'] != "<html>") {
			reply = (chatter === undefined) ? resp['message'] : resp['message'];
		} else {
			reply = "Bot is broken. Please try again later.";
			// showError("Bot is broken. Response was: " + JSON.stringify(resp));
		}
		bot.sendMessage(source, ent.decode(reply), type.ChatMsg);
		console.log('[C] Bot: ' + ent.decode(reply));
	});
}

if (message == '!ver') {
	bot.sendMessage(source, BotName + ', Based on Project KraxBot by KraXarN', type.ChatMsg);
}

if (message == '!id') {
	bot.sendMessage(source, chatter, type.ChatMsg);
}

if (message == '!lenny') {
	var lenny = ['( ͡° ͜ʖ ͡°)', 'ᕦ( ͡° ͜ʖ ͡°)ᕤ', '(ง ͠° ͟ل͜ ͡°)ง', 'ヽ༼ຈل͜ຈ༽ﾉ', '( ͡°╭͜ʖ╮͡° )', 'ᕕ༼ຈل͜ຈ༽ᕗ', 'ヽ༼Ὸل͜ຈ༽ﾉ', '¯_(ツ)_/¯', '(∩ ͡° ͜ʖ ͡°)⊃━☆ﾟ. * ･', '(◞≼◉ื≽◟ ;益;◞≼◉ื≽◟)', '( ͝° ͜ʖ͡°)つ', 'ヽ( ͡°╭͜ʖ╮͡° )ﾉ', '༼凸 ◉_◔༽凸', 'ヽ༼✿σل͜ σ༽ﾉ', '( ͡⚆ ͜ʖ ͡⚆)', 'ヽ༼⚆ل͜⚆༽ﾉ', '( ͡ _ ͡°)ﾉ⚲', '♫ ┌༼ຈل͜ຈ༽┘ ♪', 'ಠ⌣ಠ', '༼ ಥل͟ಥ ༽ ┬┴┬┴┤', '༼ ಠل͟ಠ༽', 'ᕕ( ͡° ͜ʖ ͡°)ᕗ', '༼ง ͠ຈ ͟ل͜ ͠ຈ༽ง', '|༼ʘ ل͜ ʘ༽|', 'ヽ༼◕ل͜◕༽ﾉ', 'ζ༼Ɵ͆ل͜Ɵ͆༽ᶘ', '(° ͜ʖ°)', 'ヽ༼ ツ ༽ﾉ', '（͡°͜ʖ͡°）', '(╯°□°)╯︵ ┻━┻', '༼ʕっ•ᴥ•ʔっ', '( ＾◡＾)っ✂╰⋃╯', 'ヽ༼ ຈل͜ຈ༼ ຈل͜ຈ༽ຈل͜ຈ ༽ﾉ', '༼ - ل͜ - ༽', 'ヽ° ~͜ʖ~ °ﾉ ', 'ᕙ (° ~͜ʖ~ °) ᕗ', '乁( ◔ ౪◔)ㄏ', '༼ つ ◕_◕ ༽つ', 'ヽ༼ຈل͜ರೃ༽ﾉ', '୧༼ಠ益ರೃ༽୨', '( ﾉ ﾟｰﾟ)ﾉ', 'ヽຈل͜ຈﾉ', 'ヽ(ﾟｰﾟヽ)', 'ヽ༼ຈ益ຈ༽ﾉ', '(☢益☢t)', '༼ᕗຈل͜ຈ༽ᕗ', '╮(╯▽╰)╭', '╮(╯ل͜╰)╭', '༼ つ◕(oo)◕༽つ', '(ι´Д｀)ﾉ', 'ヽ༼◥▶ل͜◀◤༽ﾉ', '[̲̅$̲̅(̲̅ヽ̲̅༼̲̅ຈ̲̅ل͜ຈ̲̅༽̲̅ﾉ̲̅)̲̅$̲̅]', '[̲̅$̲̅(̲̅ ͡◥▶ ͜ʖ ͡◀◤)̲̅$̲̅]', '༼ ͠ຈ ͟ل͜ ͠ຈ༽ง', 'ヽ༼ຈل͜ຈ༽ﾉ☂', '(＾◡＾)っ', '༼☯﹏☯༽', 'ヽ༼ ☭ل͜☭ ༽ﾉ', '♌༼✪ل͜✪༽ᕤ', '(͡◔ ͜ʖ ͡◔)', 'ヽ༼ʘ̚ل͜ʘ̚༽ﾉ', '─=≡Σ((( つ◕ل͜◕)つ', 'ᕕ( ᐛ )ᕗ', '༼ຈل͜ຈ༽>ง', 'ᕙ༼◕ل͜◕༽ᕗ', 'ヽ༼ຈل͜ຈ༽ﾉ︵┻━┻', '୧༼ ͡◉ل͜ ͡◉༽୨ ', '༼ ͡■ل͜ ͡■༽', '(ง⌐□ل͜□)ง', 'Ѱζ༼ᴼل͜ᴼ༽ᶘѰ', 'ヽ༼ຈل͜ຈ༽ง', '( ° ͜ʖ͡°)╭∩╮', 'ɳ༼ຈل͜ຈ༽ɲ', '(~˘▾˘)~', 'ʕ•ᴥ•ʔ', 'ヽຈل͜ﾉ༼ຈ', '(☞ﾟヮﾟ)☞', '୧༼ಠ益ಠ༽୨', '(▀̿̿Ĺ̯̿̿▀̿ ̿)', '(ﾉಠ_ಠ)ﾉ', '└(°ᴥ°)┘', 'つ◕ل͜◕)つ', 'ლ(́◉◞౪◟◉‵ლ)', 'ヽ༼♥ل͜♥༽ﾉ', '༼ ᓄºل͟º ༽ᓄ', '(ง ͠° ͟ل͜ ͡°)ง', 'ヽ༼ຈل͜ຈ༽ﾉ', 'ᕦ༼ຈل͜ຈ༽ᕤ', '┌༼ຈل͜ຈ༽┐', 'ᕙ༼ຈل͜ຈ༽ᕗ', 'ヽ༼>ل͜<༽ﾉ', '( ͡° ͜ʖ ͡°)', 'ヽ༼@ل͜ຈ༽ﾉ', '༼ ºل͟º༼ ºل͟º༽ºل͟º ༽', 'ヽ( ͝° ͜ʖ͡°)ﾉ', '[̲̅$̲̅(̲̅ ͡° ͜ʖ ͡°̲̅)̲̅$̲̅]'];
	var ranNum = Math.floor(Math.random() * lenny.length);
	bot.sendMessage(source, lenny[ranNum], type.ChatMsg);
}

if (message == '!random') {
 	var users = bot.chatRooms[source];
 	var ranPlayer = Math.floor(Math.random() * Object.keys(users).length);
 	var winner = bot.users[Object.keys(users)[ranPlayer]].playerName;
 	bot.sendMessage(source, 'The winner is ' + winner, type.ChatMsg);
 	console.log('[S] Winner is ' + winner + ' (' + Object.keys(users)[ranPlayer] + ')');
}

if (message == '!games') {
	client.games(chatter, function(err, games){
        num = 0;
        while (num < games.length) {
        	if (games[num].hoursOnRecord > 99) {
        		bot.sendMessage(source, games[num].name + ' (' + games[num].hoursOnRecord + ' hours on record)', type.ChatMsg);
        		num++;
        	} else {
        		num++;
        	}
        }
    });
}

if (message == '!req') {

	client.games(chatter, function(err, games){
        // console.log(util.inspect(games, false, 4, true));
        var gamesNum = games.length.toString();
        if (games.length < 6) { statusGames = ' - FAIL'; } else { statusGames = ' - Ok!'; }
        bot.sendMessage(source, 'You have ' + gamesNum + ' games' + statusGames, type.ChatMsg);
    });

    client.user(chatter, function(err, user){
    	memberSinceYear = user.memberSince.substr(user.memberSince.length - 4);
    	if (memberSinceYear > 2013) { statusMember = ' - FAIL'; } else { statusMember = ' - Ok!'; }
        bot.sendMessage(source, 'You have been a member since ' + user.memberSince + statusMember, type.ChatMsg);
        
        if (user.privacyState == 'public') { statusPrivacy = ' - Ok!'; } else { statusPrivacy = ' - FAIL'; }
        bot.sendMessage(source, 'Your profile is ' + user.privacyState + statusPrivacy, type.ChatMsg);

        if (user.groups.group[0].groupName) { statusGroup = ' - Ok!'; } else { statusGroup = ' - FAIL'; }
        bot.sendMessage(source, 'Your primary group is ' + user.groups.group[0].groupName + statusGroup, type.ChatMsg);
    });

}

if (message.startsWith("!store")) {
	var term = message.substring(message.indexOf("!store")+7, message.length);
	console.log('[D] Search word is: ' + term);
	store.steam('storeSearch', term).then(function (results) {
		results = results.map(function (result) {
			return result.id;
		});
		store.getProductsDetails(results).then(function (details) {
			// console.log(details);

			if (!details[0]) {
				console.log('[S] Nothing found');
				bot.sendMessage(source, 'No results found for ' + term + '! Try again.', type.ChatMsg);
			} else {

				if (details[0].price_overview) {

					var price = details[0].price_overview.final / 100 + '€';

					if (details[0].price_overview.discount_percent == '0') {
						var discount = '';
					} else {
						var discount = ' (' + details[0].price_overview.discount_percent + '% discount)';
					}

				} else {
					var price = 'Free';
					var discount = '';
				}

				var win = '';
				var mac = '';
				var linux = '';

				if (details[0].platforms.windows == true) { win = 'Windows'; }
				if (details[0].platforms.mac == true) { mac = 'Mac'; }
				if (details[0].platforms.linux == true) { linux = 'Linux'; }

				console.log('[S] Found: ' + details[0].name);
				bot.sendMessage(source, 'Found this: \n Name: ' + details[0].name + '\n Developer: ' + details[0].developers[0] + '\n Store Page: http://store.steampowered.com/app/' + details[0].steam_appid + '\n Price: ' + price + discount + '\n Platforms: ' + win + ' ' + mac + ' ' + linux + '\n', type.ChatMsg);
				
				if (details[1]) {
					bot.sendMessage(source, 'I also found ' + details[1].name, type.ChatMsg);
				}
			}
		});
	});
}

if (message.startsWith("!nameof")) {
	var gid = message.substring(message.indexOf("!nameof")+8, message.length);
	var id = parseInt(gid);
	console.log('[D] App ID is ' + id);

	store.getProductsDetails([id]).then(function (details) {
		if (details[0]) {
			bot.sendMessage(source, 'Name of ' + id + ' is ' + details[0].name, type.ChatMsg);
		} else {
			bot.sendMessage(source, 'Nothing found for ' + id, type.ChatMsg);
		}
	});
}

if (message.startsWith("!play")) {
	if (perm == 8 || perm == 2 || perm == 1) {
		bot.gamesPlayed([Number(message.substring(message.indexOf("!play")+6, message.length))]);
	} else {
		bot.sendMessage(source, MsgNoPerm, type.ChatMsg);
	}
}

if (message.startsWith("http"))
 {
	request(message, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var title = body.substring(body.indexOf("<title>")+7, body.indexOf("</title>"));
			//console.log('[D] Body: ' + body);

			if (title.indexOf('YouTube') > -1) {
				var title = body.substring(body.indexOf("<title>")+7, body.indexOf(" - YouTube</title>"));
				bot.sendMessage(source, name + ' posted a video: ' + title, type.ChatMsg);

			} else if (title.indexOf('on Steam') > -1) {
				var title = body.substring(body.indexOf("<title>")+7, body.indexOf(" on Steam</title>"));
				bot.sendMessage(source, name + ' posted a game: ' + title, type.ChatMsg);
			
			} else {
				bot.sendMessage(source, name + ' posted: ' + title, type.ChatMsg);
			}

		}
	})
}

if (message.startsWith("/r/")) {
	request("http://reddit.com" + message, function (error, response, body) {
		if (!error && response.statusCode == 200) {

			var title = body.substring(body.indexOf("<title>")+7, body.indexOf("</title>"));
			if (title == "search results") {
				bot.sendMessage(source, "Subreddit " + message + " not found!", type.ChatMsg);
			} else {
				bot.sendMessage(source, name + " posted subreddit http://reddit.com" + message + " : " + title, type.ChatMsg);
			}

		}
	})
}

if (message == '!name') {
	if (game) {
		bot.sendMessage(source, name + ' playing ' + game + ' (' + perm + ')', type.ChatMsg);
	} else {
		bot.sendMessage(source, name + ' (' + perm + ')', type.ChatMsg);
	}
}

if (message == '!leave') {
	if (perm == 8 || perm == 2 || perm == 1) {
		bot.leaveChat(source);
	}
}

if (message == '!rejoin') { // 0 = guest - 4 = user - 8 = mod - 2 = admin - 1 = owner
	console.log('[D] Request to rejoin ' + source + ' from ' + name + ' (' + perm + ')');
	if (perm == 8 || perm == 2 || perm == 1) {
		console.log('[S] Rejoining chat ' + source);
		bot.leaveChat(source);
		bot.joinChat(source);
	}
}

lastMsg = message;
lastUsr = chatter;

});

function checkCleverbotInstance(roomID) {
	if (cleverbots[roomID] === undefined) {
		console.log('[S] Cleverbot started on ' + roomID);
		cleverbots[roomID] = {
			"cleverbot": new Cleverbot,
			"lastMessage": new Date()
		}
	}
}

bot.on('announcement', function(group, headline) { 
	console.log('[S] Group with SteamID ' + group + ' has posted ' + headline);
});

bot.on('error', function(e) {
	console.log('[E] ' + e);
});