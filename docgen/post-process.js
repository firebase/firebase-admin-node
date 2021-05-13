const fs = require('mz/fs');
const path = require('path');
const readline = require('readline');

async function getExtras() {
  const extrasPath = path.join(__dirname, 'extras');
  const files = await fs.readdir(extrasPath);
  return files.filter((name) => name.endsWith('.md'));
}

async function getContentFrom(source) {
  const reader = readline.createInterface({
    input: fs.createReadStream(source),
  });

  const content = ['\n'];
  for await (const line of reader) {
    content.push(line);
  }

  return content;
}

async function applyExtra(source, target) {
  console.log(`Applying extras to ${target}`);
  const content = await getContentFrom(source);

  const output = [];
  const reader = readline.createInterface({
    input: fs.createReadStream(target),
  });
  for await (const line of reader) {
    output.push(line);
    if (line.startsWith('{% block body %}')) {
      output.push(...content);
    }
  }

  const outputBuffer = Buffer.from(output.join('\r\n'));
  await fs.writeFile(target, outputBuffer);
}

async function postProcessFiles() {
  const extras = await getExtras();
  for (const extra of extras) {
    const source = path.join(__dirname, 'extras', extra);
    const target = path.join(__dirname, 'markdown', extra);
    if (await fs.exists(target)) {
      await applyExtra(source, target);
    } else {
      console.log(`Target path not found: ${target}`);
    }
  }
}

(async () => {
  try {
    await postProcessFiles();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
})();
