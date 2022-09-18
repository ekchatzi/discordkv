const { Client, GatewayIntentBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { token, db_config, images_baseurl, images_directory } = require('./config.json');
const util = require('util');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const https = require("https");
const fs = require("fs");
const path = require('path')
const nch = require('non-crypto-hash');

const db = mysql.createPool({
    connectionLimit: 10,    
    password: db_config.password,
    user: db_config.user,
    database: db_config.database,
    host: db_config.host,
    port: db_config.port
}); 

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('ready', () => {
	console.log('Ready!');
});


async function set_value(namespace, key, value) {
	try {
		const ret = await db.query( 'INSERT INTO keyvaluestore (namespace, `key`, value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value=?', [namespace, key, value, value] );
		return true;
	} catch(e) {
		console.error(e);
	}
	return false;
}

const sharpTransformer = sharp()
    .resize({
		width: 240,
		position: sharp.strategy.entropy,
		fit: sharp.fit.inside,
		withoutEnlargement: true
	})
	.webp({ effort: 6 })
;

const hashAlgo = nch.createHash('murmurhash3');
function hashFunc(str) {
	return hashAlgo.hash(str);
} 



async function save_picture(namespace, key, picture_url) {
	let local_url_relative = namespace+'.'+hashFunc(key)+'.webp';
	let local_url_absolute = path.join(__dirname, images_directory, local_url_relative);
	return new Promise ((resolve, reject) => {
		https.get(picture_url, (res) => {
			const writeStream = fs.createWriteStream(local_url_absolute);
			res.pipe(sharpTransformer).pipe(writeStream);
		  
			writeStream.on("error", () => {
				reject();
			});

			writeStream.on("finish", () => {
			  writeStream.close();

			  console.log("Download Completed");
			  resolve(local_url_relative);
			});
		});
	})
}

async function set_picture(namespace, key, picture_url) {
	try {
		const local_url = await save_picture(namespace, key, picture_url);
		await db.query( 'INSERT INTO keyvaluestore (namespace, `key`, picture_url) VALUES (?,?,?) ON DUPLICATE KEY UPDATE picture_url=?', [namespace, key, local_url, local_url] );
	} catch(e) {
		console.error(e);
		return false;
	}
	return true;
}

async function get_value(namespace, key) {
	const [rows, fields] = await db.query( 'SELECT picture_url, value FROM keyvaluestore WHERE namespace=? AND `key`=?', [namespace, key] );
	if(rows.length == 0) return {value: "N/A", picture_url: null};
	return rows[0];
}

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;
	console.log(interaction);

	try {
		const { commandName } = interaction;
		if (commandName === 'info') {
			const key = interaction.options.getString('key');
			const value = await get_value(interaction.guildId, key);
			console.log(value);

			const embed = new EmbedBuilder()
				.setTitle(key)
				.setDescription(value.value);
			
			let files = [];
			if(value.picture_url) {
				const file = new AttachmentBuilder(path.join(__dirname, images_directory, value.picture_url));
				embed.setImage('attachment://'+value.picture_url);
				files.push(file);	
			} 
	
			console.log(embed);
			await interaction.reply({ embeds: [embed], files: files, ephemeral: true });
		} else if (commandName === 'setinfo') {
			const res = await set_value(interaction.guildId, interaction.options.getString('key'), interaction.options.getString('value'))
			await interaction.reply({content: res?'OK!':'Failed', ephemeral: true});
		} else if (commandName === 'setpicture') {
			const attachment = interaction.options.getAttachment('attachment');
			const res = set_picture(interaction.guildId, interaction.options.getString('key'), attachment.url);
			await interaction.reply({content: res?'OK!':'Failed', ephemeral: true});
		}
	}	
	catch(e) {
		console.error(e);
		await interaction.reply('Something went wrong: '+e);
	}
});

client.login(token);