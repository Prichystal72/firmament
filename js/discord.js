// Napojeni na Discord Activity (Embedded App SDK). Mimo Discord se nic nenacita.
import { DISCORD_CLIENT_ID } from './discord_nastaveni.js';

// Discord predava aktivite v adrese parametr frame_id
export const vDiscordu = new URLSearchParams(location.search).has('frame_id');

export async function spustDiscord() {
  if (!vDiscordu) return;
  if (!DISCORD_CLIENT_ID) {
    console.error('Discord: chybí DISCORD_CLIENT_ID v js/discord_nastaveni.js');
    return;
  }
  try {
    const { DiscordSDK } = await import('../vendor/discord/embedded-app-sdk.mjs');
    const sdk = new DiscordSDK(DISCORD_CLIENT_ID);
    await sdk.ready(); // Discord skryje nacitaci obrazovku aktivity
  } catch (chyba) {
    console.error('Discord: připojení k SDK selhalo:', chyba);
  }
}
