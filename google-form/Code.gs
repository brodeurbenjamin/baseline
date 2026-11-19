/**
 * BASELINE tracker — Google Form side.
 * The only Google piece: it builds the entry form and, on each submission,
 * commits a row to data/results.csv in GitHub. Everything else
 * (data, dashboard, hosting) lives in the GitHub repo.
 *
 * Script properties (Project Settings > Script properties):
 *   GITHUB_TOKEN  fine-grained token: this repo only, Contents = Read and write
 *   GITHUB_REPO   e.g. brodeurbenjamin/baseline
 *   GITHUB_BRANCH optional, default "main"
 */
const CSV_PATH = 'data/results.csv';

/** Run once from the editor: creates the form, the submit trigger, and prints site config. */
function setup() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));   // safe to re-run

  const form = FormApp.create('BASELINE — log your result');
  form.setDescription(
    '4 × (1 km + 60 s rest) then 50 wall balls — for Run, Ski and Row.\n' +
    'Enter each BLOCK TOTAL, INCLUDING the 50 wall balls (start to finish).');
  form.setConfirmationMessage('Thanks! Your result will appear on the dashboard within a few minutes.');
  form.setCollectEmail(false);

  // Plain text questions so the dashboard page can submit to this form directly.
  const time = FormApp.createTextValidation()
    .requireTextMatchesPattern('^\\d{1,2}(:[0-5]\\d){1,2}$')
    .setHelpText('Use mm:ss, e.g. 24:35').build();
  form.addTextItem().setTitle('Name').setRequired(true)
      .setHelpText('Use the same name every quarter so your progress lines up.');
  form.addTextItem().setTitle('Workout date').setRequired(true).setHelpText('YYYY-MM-DD')
      .setValidation(FormApp.createTextValidation()
        .requireTextMatchesPattern('^\\d{4}-\\d{2}-\\d{2}$').setHelpText('YYYY-MM-DD').build());
  ['Run', 'Ski', 'Row'].forEach(b =>
    form.addTextItem().setTitle(b + ' block total (incl. wall balls)').setRequired(true)
        .setHelpText('4 × 1 km + rests + 50 wall balls, start to finish (mm:ss).').setValidation(time));

  ScriptApp.newTrigger('onSubmit').forForm(form).onFormSubmit().create();
  PropertiesService.getScriptProperties().setProperty('FORM_ID', form.getId());
  printConfig();
}

/** Prints the block to paste into site/config.js. */
function printConfig() {
  const form = FormApp.openById(PropertiesService.getScriptProperties().getProperty('FORM_ID'));
  const items = form.getItems();
  let resp = form.createResponse();
  items.forEach((it, i) => resp = resp.withItemResponse(it.asTextItem().createResponse('x' + i)));
  const ids = {};
  resp.toPrefilledUrl().replace(/entry\.(\d+)=x(\d)/g, (_, id, i) => { ids[i] = 'entry.' + id; });
  const cfg = {
    GYM_NAME: 'BASELINE',
    FORM_ACTION: form.getPublishedUrl().replace(/\/viewform.*$/, '/formResponse'),
    ENTRY: { name: ids[0], date: ids[1], run: ids[2], ski: ids[3], row: ids[4] },
  };
  Logger.log('Paste this into site/config.js:\n\nwindow.BASELINE_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';');
  Logger.log('Form (backup link / edit): ' + form.getPublishedUrl() + '  |  ' + form.getEditUrl());
}

function toSeconds_(t) {                 // "mm:ss" or "h:mm:ss"
  return String(t).trim().split(':').map(Number).reduce((a, p) => a * 60 + p, 0);
}
function cleanName_(s) {                  // safe for CSV and spreadsheets
  return String(s).replace(/[",\r\n]/g, ' ').replace(/\s+/g, ' ').trim()
                  .replace(/^[=+\-@]+/, '').slice(0, 60);
}

function onSubmit(e) {
  const answers = e.response.getItemResponses().map(r => String(r.getResponse()).trim());
  const [name, date, run, ski, row] =
    [cleanName_(answers[0]), String(answers[1]), ...answers.slice(2, 5).map(toSeconds_)];
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date) || [run, ski, row].some(t => !(t >= 60 && t <= 21600))) {
    console.warn('Skipped invalid response', answers);
    return;
  }
  const [y, m] = date.split('-').map(Number);
  const line = [new Date().toISOString(), date, `${y} Q${Math.ceil(m / 3)}`, name,
                run, ski, row, run + ski + row].join(',');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { appendToGitHub_(line, `BASELINE result: ${name} ${date}`); }
  finally { lock.releaseLock(); }
}

function appendToGitHub_(line, message) {
  const p = PropertiesService.getScriptProperties();
  const token = p.getProperty('GITHUB_TOKEN'), repo = p.getProperty('GITHUB_REPO');
  const branch = p.getProperty('GITHUB_BRANCH') || 'main';
  const url = `https://api.github.com/repos/${repo}/contents/${CSV_PATH}`;
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };

  for (let attempt = 0; attempt < 5; attempt++) {
    const get = UrlFetchApp.fetch(url + '?ref=' + branch, { headers, muteHttpExceptions: true });
    if (get.getResponseCode() !== 200) throw new Error('GitHub read failed: ' + get.getContentText());
    const file = JSON.parse(get.getContentText());
    let csv = Utilities.newBlob(Utilities.base64Decode(file.content.replace(/\n/g, ''))).getDataAsString();
    if (!csv.endsWith('\n')) csv += '\n';
    const put = UrlFetchApp.fetch(url, {
      method: 'put', headers, muteHttpExceptions: true, contentType: 'application/json',
      payload: JSON.stringify({ message, branch, sha: file.sha,
        content: Utilities.base64Encode(csv + line + '\n', Utilities.Charset.UTF_8) }),
    });
    const code = put.getResponseCode();
    if (code === 200 || code === 201) return;
    if (code !== 409 && code !== 422) throw new Error('GitHub write failed: ' + put.getContentText());
    Utilities.sleep(1000 * (attempt + 1));   // someone else committed first; retry
  }
  throw new Error('GitHub write kept conflicting');
}
