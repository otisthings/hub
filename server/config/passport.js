import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { Client, GatewayIntentBits } from 'discord.js';
import { runQuery, getQuery } from './database.js';

let discordClient = null;

export async function configurePassport() {
  // Initialize Discord client for role checking
  if (process.env.DISCORD_BOT_TOKEN) {
    discordClient = new Client({ 
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
    });
    
    try {
      await discordClient.login(process.env.DISCORD_BOT_TOKEN);
      console.log('? Discord bot connected');
    } catch (error) {
      console.error('? Failed to connect Discord bot:', error);
    }
  }

  // Determine the correct callback URL based on environment
  const getCallbackURL = () => {
    const baseUrl = process.env.VITE_API_URL || (process.env.NODE_ENV === 'production' 
      ? 'http://localhost:3002'
      : 'http://localhost:3002');
    // Ensure HTTPS for production URLs
    const secureBaseUrl = baseUrl.startsWith('http://') && process.env.NODE_ENV === 'production'
      ? baseUrl.replace('http://', 'https://')
      : baseUrl;
    return `${secureBaseUrl}/auth/discord/callback`;
  };

  const callbackURL = getCallbackURL();
  console.log('?? Discord OAuth Callback URL:', callbackURL);

  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: callbackURL,
    scope: ['identify', 'guilds']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Initialize empty roles array and admin status
      let userRoles = [];
      let isAdmin = false;
      
      // Try to get guild roles if possible, but don't fail if we can't
      if (discordClient && process.env.DISCORD_GUILD_ID) {
        try {
          const guild = await discordClient.guilds.fetch(process.env.DISCORD_GUILD_ID);
          const member = await guild.members.fetch(profile.id);
          
          userRoles = member.roles.cache.map(role => ({
            id: role.id,
            name: role.name
          }));
          
          // Check if user has admin role
          if (process.env.DISCORD_ADMIN_ROLE_ID) {
            isAdmin = member.roles.cache.has(process.env.DISCORD_ADMIN_ROLE_ID);
          }
        } catch (error) {
          console.log('User not in guild or error fetching roles:', error);
          // Continue with empty roles instead of failing
        }
      }
      
      // Check if user exists in database
      let user = await getQuery(
        'SELECT * FROM users WHERE discord_id = ?',
        [profile.id]
      );
      
      if (user) {
        // Update existing user
        await runQuery(`
          UPDATE users 
          SET username = ?, discriminator = ?, avatar = ?, roles = ?, is_admin = ?, last_login = CURRENT_TIMESTAMP
          WHERE discord_id = ?
        `, [
          profile.username,
          profile.discriminator || '0',
          profile.avatar,
          JSON.stringify(userRoles),
          isAdmin ? 1 : 0,
          profile.id
        ]);
        
        // Update user object with latest data
        user.username = profile.username;
        user.discriminator = profile.discriminator || '0';
        user.avatar = profile.avatar;
        user.roles = JSON.stringify(userRoles);
        user.is_admin = isAdmin ? 1 : 0;
      } else {
        // Create new user
        const result = await runQuery(`
          INSERT INTO users (discord_id, username, discriminator, avatar, roles, is_admin)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          profile.id,
          profile.username,
          profile.discriminator || '0',
          profile.avatar,
          JSON.stringify(userRoles),
          isAdmin ? 1 : 0
        ]);
        
        // Create user object for new user
        user = {
          id: result.insertId,
          discord_id: profile.id,
          username: profile.username,
          discriminator: profile.discriminator || '0',
          avatar: profile.avatar,
          roles: JSON.stringify(userRoles),
          is_admin: isAdmin ? 1 : 0
        };
      }
      
      return done(null, user);
    } catch (error) {
      console.error('Authentication error:', error);
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    // Ensure we're serializing the user ID
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getQuery('SELECT * FROM users WHERE id = ?', [id]);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

export function getDiscordClient() {
  return discordClient;
}