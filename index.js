const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const client = new Discord.Client();
const { prefix, token, forbiddenRanks, forbiddenChannels, aliasRanks } = require('./config.json');

client.on('ready', () => {
    client.user.setUsername("VicBot");
    client.user.setActivity('bugs, probably.', { type: 'PLAYING'});
    console.log('Ready!');
});

// actually log in
client.login(token);


// listening for messages
client.on('message', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    let adminRole = message.guild.roles.find(role => role.name === 'Admins');
    let papersCategory = message.guild.channels.find(category => category.name === 'papers');

    switch(command){
        case 'addrank':
            await createRank(message, args);
            break;
        case 'reset':
            await reset(message, args);
            break;
        case 'delrank':
            await delRank(message, args);
            break;
        case 'rank':
            await rank(message, args);
            break;
        case 'ranks':
            await ranks(message, args);
            break;
        case 'organise':
            await sort(message, args);
            break;
        case 'micropad':
            await micropad(message);
            break;
        // case 'play':
        //     await play(message, args);
        //     break;
        case 'alias':
            await alias(message, args, adminRole);
            break;
        case 'help':
            await help(message, adminRole);
            break;
    }
});

/**
 * Returns info about all the wonderful things the bot can do.
 * @param {Message} message 
 */
async function help(message, adminRole){
    if(message.member.roles.has(adminRole.id))
    return message.channel.send({embed: {
        color: 0x004834,
        title: "VicBot Commands",
        fields: [{
            name: "rank",
            value: "\`!rank <course> [course ...]\`\nAdd or remove class ranks."
        },
        {
            name: "ranks",
            value: "\`!ranks\`\nList the available user ranks."
        },
        {
            name: "micropad",
            value: "\`!micropad\`\nProvides information about micropad."
        },
        {
            name: "play",
            value: "\`!play <url>\`\nPlays audio from a YouTube video or queues it accordingly."
        },
        {
            name: "addrank",
            value: "\`!addrank <course>\`\nCreates a new class role and channel."
        },
        {
            name: "delrank",
            value: "\`!delrank <course>\`\nDeletes a classes' role and channel."
        },
        {
            name: "organise",
            value: "\`!organise\`\nSorts the channels within the papers category."
        },
        {
            name: "alias",
            value: "\`!alias <alias> <course> [course ...]\`\nChanges the papers allocated to an alias."
        }
    ]
    }});
    
    else
    return message.channel.send({embed: {
        color: 0x004834,
        title: "VicBot Commands",
        fields: [{
            name: "rank",
            value: "\`!rank <course> [course ...]\`\nAdd or remove class ranks."
        },
        {
            name: "ranks",
            value: "\`!ranks\`\nList the available user ranks."
        },
        {
            name: "micropad",
            value: "\`!micropad\`\nProvides information about micropad."
        },
        {
            name: "play",
            value: "\`!play <url>\`\nPlays audio from a YouTube video or queues it accordingly."
        }
    ]
    }});
}

/**
 * Sets the courses applicable to one of the multi-channel roles (e.g. swen-2017)
 * @param {Message} message 
 * @param {string[]} args 
 */
async function alias(message, args, adminRole){
    if(!args.length){
        return message.channel.send(`Adds or removes accordingly the channels available to a given rank, e.g. \`!alias swen-2018 comp-102 comp-103\``);
    }
    else if(!message.member.roles.has(adminRole.id)){
        return message.channel.send(`This requires admin permissions.`);
    } 
    else if(message.guild.roles.find(role => role.name === args[0]) == null){
        return message.channel.send(`Couldn't find ${args[0]}`);
    }
    else if(aliasRanks.indexOf(args[0]) === -1){
        return message.channel.send(`${args[0]} is not an appropriate rank.`)
    }
    else{
        role = message.guild.roles.find(role => role.name === args[0]);
        for(i = 1 ; i < args.length ; i++){
            await superRankSet(message, role, args[i]);
        }
    }
}

/**
 * Swaps permissions of a role for a passed channel, allows viewing if previously disallowed, and vice-versa.
 * @param {Role} role 
 * @param {string} change 
 */
async function superRankSet(message, role, change){
    if(role.guild.channels.find(channel => channel.name === null)) return message.channel.send(`Couldn't find ${change}`);
    channel = role.guild.channels.find(channel => channel.name === change);
    if(role.permissionsIn(channel).has('VIEW_CHANNEL')){
        await channel.updateOverwrite(role, { VIEW_CHANNEL: null});
        return message.channel.send(`Removed ${role.name} from ${change}`);
    }
    else{ 
        await channel.updateOverwrite(role, { VIEW_CHANNEL: true});
        return message.channel.send(`Added ${role.name} to ${change}`);
    }
}

/**
 * Plays music based on a YouTube video, with queueing as appropiate.
 * @param {Message} message 
 * @param {string[]} args 
 */
async function play(message, args){
    if(message.channel.type !== 'text') return;

        const { voiceChannel } = message.member;

        if(!voiceChannel){
            return message.reply('Please join a voice channel first.');
        }
        else if(!args.length){
            return message.channel.send(`Please add a youtube link`);
        }

        else{
        voiceChannel.join().then(connection => {
            const stream = ytdl(args[0], {filter: 'audioonly' });
            const dispatcher = connection.play(stream);
            dispatcher.on('end', () => voiceChannel.leave());
        })};
}

/**
 * Checks against permissions and forbidden roles, then adds the role to the user which sent the message.
 * @param {Message} message 
 * @param {Role} rank 
 */
async function addRank(message, rank){
    if(forbiddenRanks.includes(rank)){
        return message.channel.send(`Sorry, you cannot join ${rank}.`);
    }

    else if(message.guild.roles.find(role => role.name === rank) == null){
        return message.channel.send(`${rank} role doesn't exist. Consider asking an @admin to create it.`);
    }

    else if(!message.guild.roles.find(role => role.name === rank).members.has(message.author.id)){
        await message.member.roles.add(message.guild.roles.find(role => role.name === rank));
        return message.reply(`Added you to ${rank} successfully.`);
    }

    else{
        await message.member.roles.remove(message.guild.roles.find(role => role.name === rank));
        return message.reply(`Removed you from ${rank} successfully.`);
    }
}

/**
 * Ensures the user is an administrator, then removes the role and channel specified.
 * @param {Message} message 
 * @param {string[]} args 
 */
async function delRank(message, args){
    if(!message.member.roles.has(adminRole.id)){
        return message.channel.send(`This requires admin permissions.`);
    }      
    else if (!args.length) {
        return message.channel.send(`Please provide a rank to delete. Type !ranks for a list.`);
    }

    else if(args.length > 1){
        return message.channel.send(`Please only list one rank to delete.`);
    }

    else if((message.guild.roles.find(role => role.name === args[0]) == null) && (message.guild.channels.find(channel => channel.name === args[0]) == null)){
        return message.channel.send(`Cannot find rank to delete.`);
    }

    else{
        deleteRank(message, args);
        return message.channel.send(`Deleted ${args[0]}.`);
    }
}

/**
 * Ensures the user is an administrator, then removes and restores the role and channel specified.
 * @param {Message} message 
 * @param {string[]} args 
 */
async function reset(message, args){
    if(!message.member.roles.has(adminRole.id)){
        return message.channel.send(`This requires admin permissions.`);
    }      
    else if (!args.length) {
        return message.channel.send(`Please include the name of the channel you wish to reset.`);
    }

    else if(args.length > 1){
        return message.channel.send(`Please only include one rank to reset (no spaces).`);
    }

    else if((message.guild.roles.find(role => role.name === args[0]) == null) && (message.guild.channels.find(channel => channel.name === args[0]) == null)){
        return message.channel.send(`Cannot find rank to reset.`);
    }

    else if(message.guild.channels.find(channel => channel.name === args[0]).parent !== papersCategory){
        return message.channel.send(`You can only reset channels in the papers category.`);
    }

    else if(forbiddenRanks.includes(args[0])){
        return message.channel.send(`You probably shouldn't reset this, and at the moment I'm not going to let you.`);
    }

    else{
        await deleteRank(message, args);
        await newRank(message, args, papersCategory);
    }
}

/**
 * Adds the specified role to the user that sent the message.
 * @param {Message} message 
 * @param {string[]} args 
 */
async function rank(message, args){
    if (!args.length) {
        return message.channel.send(`Please provide a class to join. Type !ranks for a list.`);
    }
    else{
        args.forEach(function(item, index, array){
            addRank(message, item);
        });
    }
}

/**
 * Lists each of the ranks that fit the following criteria:
 *  - 8 characters
 *  - Includes '-'
 *  - Also ethics
 * @param {Message} message 
 * @param {string[]} args 
 */
async function ranks(message, args){
    let rankArray = message.guild.roles.array();
        let rankStringArray = new Array();
        rankArray.forEach(function(item, index, array){
            if((item.name.includes("-") && item.name.length === 8) || item.name === "ethics"){
                rankStringArray.push(item.name);
            }
        })
        rankStringArray.sort();
        let rankString = "\`\`\`\n";
        let count = 1;
        rankStringArray.forEach(function(item, index, array){
            rankString += item + `\t`;
            if(count % 3 === 0) rankString += `\n`; 
            count++;
        })
        rankString += "\n\`\`\`";
        return message.channel.send({embed: {
            color: 0x004834,
            description: rankString
        }});
}

/**
 * Checks permissions, then calls organise()
 * @param {Message} message 
 * @param {string[]} args 
 */
async function sort(message, args){
    if(!message.member.roles.has(adminRole.id)){
        return message.channel.send(`This requires admin permissions.`);
    }
    else{ 
        message.react("🕦");
        await organise(message);
        // await message.reactions.sweep(new Function('return this === "🕦"'), 'this');
        await message.reactions.get("🕦").users.remove(client.id);
        await message.reactions.deleteAll();
        return message.react("✅");
    }
}

/**
 * Sorts the channels within the 'papers' category.
 * TODO: Sort the roles as well.
 * @param {Message} message 
 */
async function organise(message){
    let channelArray = message.guild.channels.array();
    let paperLength = 0;
    let paperNameArray = [];

    channelArray.forEach(function(item, index, array){
        if(item.parent != null){
            if(item.parent.name === "papers"){
                paperLength++;
                paperNameArray.push(item.name);
            }
        }
    })
    await paperNameArray.sort();

    for(i = 0 ; i < paperLength ; i++){
        if(message.guild.channels.find(channel => channel.name === paperNameArray[i]).position != i)
            await message.guild.channels.find(channel => channel.name === paperNameArray[i]).setPosition(i);
    }
}

/**
 * Shills micropad for Nick.
 * @param {Message} message 
 */
async function micropad(message){
    message.channel.send("<:micropad:339927818181935105> is the easy to use powerful notepad app developed by our very own Nick. Check it out at https://getmicropad.com");
}

/**
 * Checks if three or more users have reacted with 📌, and pins the message.
 */
client.on('messageReactionAdd', async reaction => {
    if(!forbiddenChannels.includes(reaction.message.channel.name)){
        if(reaction.emoji.name === "📌"){
            if(reaction.count >= 3 && !reaction.message.pinned){
                await reaction.message.pin();
            }
        }
    }
});

/**
 * Checks permissions, then calls createRank.
 * @param {Message} message 
 * @param {string[]} args 
 */
async function createRank(message, args){
    if(!message.member.roles.has(adminRole.id)){
        return message.channel.send(`This requires admin permissions.`);
    }      
    else if (!args.length) {
        return message.channel.send(`Please include the name of the rank you wish to create.`);
    }

    else if(args.length > 1){
        return message.channel.send(`Please only include one rank to create (no spaces).`);
    }

    else if(!args[0].includes('-')){
        return message.channel.send(`Classes should include the - symbol`);
    }

    else if(message.guild.roles.find(role => role.name === args[0]) != null){
        return message.channel.send(`Couldn't create class - role already exists.`);
    }

    else if(message.guild.channels.find(role => role.name === args[0]) != null){
        return message.channel.send(`Couldn't create class - channel already exists.`);
    }

    else{
        await newRank(message, args, papersCategory);
        return message.channel.send(`Created ${args[0]} successfully.`);
    }
}

/**
 * Deletes the channel and/or role specified.
 * @param {Message} message 
 * @param {string[]} args 
 */
async function deleteRank(message, args){
    if(message.guild.roles.find(role => role.name === args[0]) != null) await message.guild.roles.find(role => role.name === args[0]).delete();
    if(message.guild.channels.find(channel => channel.name === args[0]) != null) await message.guild.channels.find(channel => channel.name === args[0]).delete();
    return;
}

/**
 * Creates a role and channel for the course specified
 *  - Restricts it to the role created and bots
 *  - Pulls the course title from the victoria website and sets the category
 *  - Places the channel within the 'papers' category
 *  - Sorts the 'papers' category to ensure the channel is in the correct alphabetical location.
 */
async function newRank(message, args, papersCategory){
    await message.guild.roles.create({
        data: {
            name: args[0],
            hoist: false,
            mentionable: false,
        }
    });
    await message.guild.channels.create( args[0], {
        type: 'text',
        overwrites: [
        {
            id: message.guild.id,
            denied: ['VIEW_CHANNEL'],
        },
        {
            id: message.guild.roles.find(role => role.name === args[0]).id,
            allowed: ['VIEW_CHANNEL'],
        },
        {
            id: message.guild.roles.find(role => role.name === 'bots').id,
            allowed: ['VIEW_CHANNEL'],
        },
        ],
        parent: papersCategory,
    });
    await organise(message);

    // pull the course title to be extra af
    let name = args[0].slice(0, 4) + args[0].slice(5, args[0].length);
    let title = "";
    let currentYear = (new Date()).getFullYear();
    const https = require('https');
    https.get(`https://www.victoria.ac.nz/_service/courses/2.1/courses/${name}?year=${currentYear}`, (resp) => {
    let data = '';

    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
        data += chunk;
    });

    // The whole response has been received. Print out the result.
    resp.on('end', () => {
        JSON.parse(data, function(key, value){
            if(key === "title"){
                message.guild.channels.find(channel => channel.name === args[0]).setTopic(value);
            }
        })
    });

    }).on("error", (err) => {
    console.log("Error: " + err.message);
    });
    console.log(title);
    return;
}

