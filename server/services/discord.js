import axios from 'axios';

export async function sendDiscordWebhook(webhookUrl, embed, content = null) {
  // Use application notification channel for application decisions only
  if (embed.title?.includes('Application') && embed.title !== 'Application Submitted') {
    webhookUrl = process.env.DISCORD_APPLICATION_WEBHOOK_URL;
  }

  if (!webhookUrl) {
    console.warn('Discord webhook URL not configured');
    return;
  }

  try {
    const payload = {
      embeds: [embed]
    };
    
    if (content) {
      payload.content = content;
    }
    
    await axios.post(webhookUrl, payload);
    console.log('? Discord webhook sent successfully');
  } catch (error) {
    console.error('? Failed to send Discord webhook:', error.response?.data || error.message);
  }
}

export async function assignDiscordRole(userId, roleId, botToken, guildId) {
  if (!botToken || !guildId) {
    console.warn('Discord bot token or guild ID not configured');
    return false;
  }

  try {
    await axios.put(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {},
      {
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`? Assigned role ${roleId} to user ${userId}`);
    return true;
  } catch (error) {
    console.error('? Failed to assign Discord role:', error.response?.data || error.message);
    return false;
  }
}

export async function removeDiscordRole(userId, roleId, botToken, guildId) {
  if (!botToken || !guildId) {
    console.warn('Discord bot token or guild ID not configured');
    return false;
  }

  try {
    await axios.delete(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`? Removed role ${roleId} from user ${userId}`);
    return true;
  } catch (error) {
    console.error('? Failed to remove Discord role:', error.response?.data || error.message);
    return false;
  }
}

export async function getUserDiscordRoles(userId, botToken, guildId) {
  if (!botToken || !guildId) {
    console.warn('Discord bot token or guild ID not configured');
    return [];
  }

  try {
    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
      {
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.roles || [];
  } catch (error) {
    console.error('? Failed to get user Discord roles:', error.response?.data || error.message);
    return [];
  }
}

export function createTicketEmbed(ticket, action, user) {
  const actionMessages = {
    created: 'New ticket created',
    message_added: 'New message added',
    status_changed: 'Status updated',
    claimed: 'Ticket claimed',
    unclaimed: 'Ticket unclaimed',
    participant_added: 'User added to ticket',
    participant_removed: 'User removed from ticket'
  };

  return {
    title: `Ticket #${ticket.id}`,
    color: 0xb331ff,
    fields: [
      {
        name: 'Category',
        value: ticket.category_name || 'Unknown',
        inline: true
      },
      {
        name: 'Status',
        value: ticket.status.replace('_', ' ').toUpperCase(),
        inline: true
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'TB Development Demo Hub'
    }
  };
}

export function createApplicationEmbed(application, submission, decision, adminNotes) {
  const embed = {
    title: `Application ${decision.charAt(0).toUpperCase() + decision.slice(1)}`,
    description: `**${application.name}**`,
    color: 0xb331ff, // Always use purple color
    fields: [
      {
        name: 'Submitted',
        value: new Date(submission.submitted_at).toLocaleDateString(),
        inline: true
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'TB Development Demo Hub'
    }
  };

  // Add user ping for submitted applications
  if (decision === 'submitted') {
    embed.description = `**${application.name}**\n\n<@${submission.user_discord_id}>`;
  }

  // Add decision field for reviewed applications
  if (decision !== 'submitted') {
    embed.fields.push({
      name: 'Decision',
      value: decision.toUpperCase(),
      inline: true
    });

    if (adminNotes) {
      embed.fields.push({
        name: 'Notes',
        value: adminNotes,
        inline: false
      });
    }
  }

  return embed;
}