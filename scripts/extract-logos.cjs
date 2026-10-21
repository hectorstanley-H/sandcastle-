const { getIconData, iconToSVG, iconToHTML, replaceIDs } = require('@iconify/utils');
const fs = require('fs');
const sets = { logos: require('@iconify-json/logos/icons.json'), vs: require('@iconify-json/vscode-icons/icons.json'), si: require('@iconify-json/simple-icons/icons.json') };
// name -> [set, icon, colorForMono?]
const map = {
  sap: ['logos','sap'], salesforce: ['logos','salesforce'], slack: ['logos','slack-icon'], jira: ['logos','jira'],
  confluence: ['logos','confluence'], hubspot: ['logos','hubspot'], zendesk: ['logos','zendesk-icon'], zoom: ['logos','zoom-icon'],
  notion: ['logos','notion-icon'], teams: ['logos','microsoft-teams'], edge: ['logos','microsoft-edge'], chrome: ['logos','chrome'],
  powerbi: ['logos','microsoft-power-bi'], tableau: ['logos','tableau-icon'], onedrive: ['logos','microsoft-onedrive'],
  oracle: ['logos','oracle'], okta: ['logos','okta-icon'], asana: ['logos','asana-icon'], windows: ['logos','microsoft-windows-icon'],
  microsoft: ['logos','microsoft-icon'], gmail: ['logos','google-gmail'], trello: ['logos','trello'], miro: ['logos','miro-icon'],
  outlook: ['vs','file-type-outlook'], excel: ['vs','file-type-excel'], word: ['vs','file-type-word'], powerpoint: ['vs','file-type-powerpoint'],
  folder: ['vs','default-folder'], folderopen: ['vs','default-folder-opened'],
  docusign: ['si','docusign','#130032','#FFCC22'], acrobat: ['si','adobeacrobatreader','#FFFFFF','#B30B00'], sharepoint: ['si','microsoftsharepoint','#0078D4'],
  expensify: ['si','expensify','#FFFFFF','#0185FF'], greenhouse: ['si','greenhouse','#FFFFFF','#24A47F'], onenote: ['si','microsoftonenote','#7719AA'],
};
for (const [name, [set, icon, color, tile]] of Object.entries(map)) {
  const data = getIconData(sets[set], icon);
  if (!data) { console.log('MISSING', name); continue; }
  const r = iconToSVG(data, { height: 'auto' });
  let body = replaceIDs(r.body, name + '-');
  if (color) body = body.replace(/currentColor/g, color);
  let out = iconToHTML(body, r.attributes)
  if (!out.includes('xmlns=')) out = out.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  if (tile) {
    const vb = r.attributes.viewBox.split(' ').map(Number)
    const size = Math.max(vb[2], vb[3])
    const pad = size * 0.22
    const full = size + pad * 2
    out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}"><rect width="${full}" height="${full}" rx="${full * 0.22}" fill="${tile}"/><g transform="translate(${pad + (size - vb[2]) / 2 - vb[0]} ${pad + (size - vb[3]) / 2 - vb[1]})">${body}</g></svg>`
  }
  fs.writeFileSync(`src/assets/logos/${name}.svg`, out);
}
console.log('done');
