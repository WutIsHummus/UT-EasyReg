// ==UserScript==
// @name         UT EasyReg
// @namespace    http://tampermonkey.net/
// @version      6.9
// @description  Instntly register for your ut classes
// @match        https://utdirect.utexas.edu/registration/chooseSemester.WBX*
// @match        https://utdirect.utexas.edu/registration/registration.WBX*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @run-at       document-start
// ==/UserScript==

(function(){
  'use strict';

  const hashMatch = location.hash.match(/^#quickreg=(.+)$/);
  if (hashMatch) {
    const unique = decodeURIComponent(hashMatch[1]);
    // Poll fast to find needed elements
    const interval = setInterval(()=>{
      if (location.pathname.endsWith('chooseSemester.WBX')) {
        const semForm   = document.querySelector('form[action="registration.WBX"]');
        const submitBtn = semForm?.querySelector('input[type="submit"][value*="Fall"]');
        if (semForm && submitBtn) {
          semForm.action = semForm.action.replace(/#.*$/, '') + '#quickreg=' + encodeURIComponent(unique);
          submitBtn.click();
          clearInterval(interval);
        }
      } else if (location.pathname.endsWith('registration.WBX')) {
        const regForm     = document.getElementById('regform');
        const addRadio    = document.getElementById('ds_request_STADD');
        const uniqueInput = document.getElementById('s_unique_add');
        if (regForm && addRadio && uniqueInput) {
          addRadio.checked      = true;
          uniqueInput.value     = unique;
          regForm.submit();
          clearInterval(interval);
        }
      }
    }, 20);
    return;
  }

  // ui
  let inpU, inpT, statusDiv;
  window.addEventListener('DOMContentLoaded', initPanel);
  setTimeout(initPanel, 200);

  function initPanel() {
    if (document.getElementById('ut-quickreg-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'ut-quickreg-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '260px',
      padding: '8px',
      background: '#fff',
      border: '1px solid #888',
      borderRadius: '4px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      fontFamily: 'sans-serif',
      fontSize: '13px',
      zIndex: 99999
    });
    panel.innerHTML = `
      <strong>UT QuickReg</strong><br><br>
      <label>Uniques (CSV):<br>
        <input id="qt-uniques" type="text" style="width:100%" placeholder="27695,12345,…">
      </label><br>
      <label>When:<br>
        <input id="qt-dt" type="datetime-local" style="width:100%">
      </label><br><br>
      <button id="qt-now" style="width:48%">Submit Now</button>
      <button id="qt-schedule" style="width:48%">Schedule</button>
      <div id="qt-status" style="
        margin-top:8px;
        max-height:120px; overflow-y:auto;
        border:1px solid #ccc; padding:4px;
        font-size:12px; background:#fafafa;
      "><em>Ready…</em></div>
    `;
    document.body.appendChild(panel);

    inpU      = panel.querySelector('#qt-uniques');
    inpT      = panel.querySelector('#qt-dt');
    statusDiv = panel.querySelector('#qt-status');

    inpU.value = GM_getValue('qt_uniques','');
    inpT.value = GM_getValue('qt_dt','');

    panel.querySelector('#qt-now').addEventListener('click', () => {
      saveConfig();
      launchTabs();
    });
    panel.querySelector('#qt-schedule').addEventListener('click', () => {
      saveConfig();
      const when = parseDate(inpT.value);
      if (!when) return alert('Invalid date/time.');
      const delay = when - Date.now();
      if (delay <= 0) launchTabs();
      else {
        statusDiv.innerHTML = `⏰ Scheduled for ${when.toLocaleString()}`;
        setTimeout(launchTabs, delay);
      }
    });
  }

  function saveConfig() {
    GM_setValue('qt_uniques', inpU.value.trim());
    GM_setValue('qt_dt',     inpT.value);
  }

  function parseDate(str) {
    if (!str) return null;
    const [d,t] = str.split('T');
    if (!d||!t) return null;
    const [y,m,day] = d.split('-').map(Number);
    const [hh,mm]   = t.split(':').map(Number);
    if ([y,m,day,hh,mm].some(isNaN)) return null;
    return new Date(y, m-1, day, hh, mm);
  }

  function launchTabs() {
    const uniques = inpU.value.split(',').map(s=>s.trim()).filter(Boolean);
    if (uniques.length === 0) return alert('Enter at least one unique.');

    statusDiv.innerHTML = '🚀 Launching tabs…';
    const chooserUrl = `${location.origin}/registration/chooseSemester.WBX`;

    uniques.forEach(unique => {
      // register
      const tabUrl = `${chooserUrl}#quickreg=${encodeURIComponent(unique)}`;
      GM_openInTab(tabUrl, { active: false, insert: true });
    });
  }

})();
