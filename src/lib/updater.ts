import { check } from '@tauri-apps/plugin-updater';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';

/**
 * Checks for a new version on startup.
 * If one is found, prompts the user and auto-installs + relaunches.
 * Call this once from App.tsx on mount.
 */
export async function checkForUpdates(silent = true): Promise<void> {
  try {
    const update = await check();

    if (!update) {
      if (!silent) {
        await message('You are already on the latest version!', {
          title: 'No Updates Found',
          kind: 'info',
        });
      }
      return;
    }

    const yes = await ask(
      `Nexus ${update.version} is available.\n\n${update.body ?? 'Bug fixes and improvements.'}\n\nInstall now?`,
      {
        title: 'Update Available',
        kind: 'info',
        okLabel: 'Install & Restart',
        cancelLabel: 'Later',
      }
    );

    if (!yes) return;

    // Download and install — on Windows the app will close automatically
    await update.downloadAndInstall();

    // On macOS / Linux we need to relaunch manually
    await relaunch();
  } catch (err) {
    // Don't surface update errors to the user — just log them
    console.error('[updater]', err);
  }
}
