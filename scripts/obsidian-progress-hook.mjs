import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_TIMEZONE = 'Asia/Calcutta';

function parseArgs(argv) {
  const options = {
    completed: [],
    files: [],
    next: [],
    risks: [],
    verification: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const nextToken = argv[index + 1];
    const value = nextToken && !nextToken.startsWith('--') ? nextToken : '';

    if (value) index += 1;

    switch (key) {
      case 'vault':
      case 'date':
      case 'project':
      case 'status':
      case 'summary':
      case 'timezone':
        options[key] = value;
        break;
      case 'completed':
      case 'files':
      case 'next':
      case 'risks':
      case 'verification':
        options[key].push(value);
        break;
      default:
        break;
    }
  }

  return options;
}

function formatDateInTimezone(timeZone) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatTimeInTimezone(timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveNotePath(vaultPath, date) {
  const rootNotePath = path.join(vaultPath, `${date}.md`);
  const dailyNotesDir = path.join(vaultPath, 'Daily Notes');
  const dailyNotePath = path.join(dailyNotesDir, `${date}.md`);

  if (await pathExists(rootNotePath)) return rootNotePath;
  if (await pathExists(dailyNotePath)) return dailyNotePath;
  if (await pathExists(dailyNotesDir)) return dailyNotePath;
  return rootNotePath;
}

function buildSection(title, items) {
  if (!items.length) return '';
  return [`#### ${title}`, ...items.map((item) => `- ${item}`), ''].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const timeZone = options.timezone || DEFAULT_TIMEZONE;
  const date = options.date || formatDateInTimezone(timeZone);
  const time = formatTimeInTimezone(timeZone);
  const vaultPath = options.vault || process.env.OBSIDIAN_VAULT_PATH;

  if (!vaultPath) {
    throw new Error('Missing vault path. Pass --vault or set OBSIDIAN_VAULT_PATH.');
  }

  const notePath = await resolveNotePath(vaultPath, date);
  await fs.mkdir(path.dirname(notePath), { recursive: true });

  let existing = '';
  if (await pathExists(notePath)) {
    existing = await fs.readFile(notePath, 'utf8');
  }

  const heading = existing.trim().length === 0 ? `# ${date}\n\n` : '';
  const project = options.project || 'Project';
  const summary = options.summary || 'Progress update';
  const status = options.status || 'in progress';

  const block = [
    `## Progress Update - ${time} IST`,
    '',
    `### [[${project}]] - ${summary}`,
    '',
    `**Status:** ${status}`,
    '',
    buildSection('Completed', options.completed),
    buildSection('Verification', options.verification),
    buildSection('Open Risks', options.risks),
    buildSection('Next', options.next),
    buildSection('Files', options.files),
  ]
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  const prefix = existing.trim().length === 0 ? heading : `${existing.replace(/\s*$/, '')}\n\n`;
  const content = `${prefix}${block}\n`;

  await fs.writeFile(notePath, content, 'utf8');

  process.stdout.write(`${notePath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
