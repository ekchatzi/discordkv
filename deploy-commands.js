const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { clientId, guildId, token } = require('./config.json');

const commands = [
	new SlashCommandBuilder().setName('info').setDescription('Replies with user info')
		.addStringOption(option =>
			option.setName('key')
				.setDescription('The key/username')
				.setRequired(true)),
	new SlashCommandBuilder().setName('setinfo').setDescription('Sets user info')
		.addStringOption(option =>
			option.setName('key')
				.setDescription('The key/username')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('value')
				.setDescription('The value/info')
				.setRequired(true)),
	new SlashCommandBuilder().setName('setpicture').setDescription('Sets user picture')
		.addStringOption(option =>
			option.setName('key')
				.setDescription('The key/username')
				.setRequired(true))
		.addAttachmentOption(option => option.setName('attachment').setDescription('Image').setRequired(true))
	,
]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

rest.put(Routes.applicationCommands(clientId), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);