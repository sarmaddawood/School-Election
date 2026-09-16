import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/sarma/.gemini/antigravity/brain/87e9b510-683e-4198-a6ea-50f7897f031a';
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE_URL = 'http://localhost:3000';

(async () => {
  console.log("Starting comprehensive UI audit...");
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const auditResults = [];

  async function inspectAndCapture(name, viewport, actions = null) {
    console.log(`[AUDIT] ${name} (${viewport.width}x${viewport.height})`);
    await page.setViewport(viewport);
    await new Promise(r => setTimeout(r, 600));

    if (actions) {
      await actions(page);
      await new Promise(r => setTimeout(r, 800));
    }

    const metrics = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      const overflowElements = [];
      document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > winWidth + 2 && !['HTML', 'BODY'].includes(el.tagName)) {
          overflowElements.push({
            tag: el.tagName,
            cls: el.className?.toString?.()?.slice(0, 40) || '',
            right: Math.round(rect.right),
          });
        }
      });

      // Contrast issues
      const badContrast = [];
      document.querySelectorAll('button, a, [role="button"], span, div').forEach(el => {
        const cs = window.getComputedStyle(el);
        const text = el.innerText?.trim();
        if (!text || text.length > 30) return;
        const color = cs.color;
        const bg = cs.backgroundColor;
        // Check if element has dark text on dark blue background
        if (
          color.includes('rgb(26, 43, 72)') &&
          (bg.includes('rgb(2, 132, 199)') || bg.includes('rgb(52, 152, 219)') || bg.includes('rgb(37, 99, 235)') || bg.includes('rgb(15, 23, 42)'))
        ) {
          badContrast.push({ text, color, bg });
        }
      });

      return {
        hasOverflow: docWidth > winWidth + 1,
        docWidth,
        winWidth,
        overflowElements: overflowElements.slice(0, 3),
        badContrast: badContrast.slice(0, 5),
      };
    });

    const file = `${name}.png`;
    await page.screenshot({ path: path.join(ARTIFACT_DIR, file), fullPage: false });

    auditResults.push({ name, viewport, metrics, screenshot: file });
  }

  try {
    const mobile = { width: 390, height: 844, isMobile: true, hasTouch: true };
    const desktop = { width: 1280, height: 800 };

    // 1. Unauthenticated Login Page
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    await inspectAndCapture('01_login_mobile', mobile);
    await inspectAndCapture('02_login_desktop', desktop);

    // Test How To Vote Modal on Login Page
    await inspectAndCapture('03_modal_how_to_vote_mobile', mobile, async (p) => {
      await p.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.textContent.includes('How to Vote'));
        if (target) target.click();
      });
    });

    // Close modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close modal"]') || document.querySelector('button:has(svg)');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // 2. Perform Login as Admin
    await page.setViewport(mobile);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    await page.type('input[type="text"]', 'ADMIN');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    // 3. Admin Dashboard
    await inspectAndCapture('04_admin_dashboard_mobile', mobile);
    await inspectAndCapture('05_admin_dashboard_desktop', desktop);

    // 4. Test each tab using live Admin session
    const tabNames = ['elections', 'positions', 'candidates', 'users', 'results', 'calendar', 'branding', 'password'];
    for (const tab of tabNames) {
      await inspectAndCapture(`tab_${tab}_mobile`, mobile, async (p) => {
        if (tab === 'password') {
          await p.evaluate(() => {
            const avatarBtn = document.querySelector('button[aria-label="User profile options"]');
            if (avatarBtn) avatarBtn.click();
          });
          await new Promise(r => setTimeout(r, 400));
          await p.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const pwBtn = btns.find(b => b.textContent.toLowerCase().includes('change password'));
            if (pwBtn) pwBtn.click();
          });
        } else {
          // Open drawer menu
          await p.evaluate(() => {
            const menuBtn = document.querySelector('button[aria-label="Toggle navigation menu"]') || document.querySelector('button.p-1.-ml-1') || document.querySelector('header button');
            if (menuBtn) menuBtn.click();
          });
          await new Promise(r => setTimeout(r, 400));
          // Click tab
          await p.evaluate((t) => {
            const navBtns = Array.from(document.querySelectorAll('aside nav button'));
            const target = navBtns.find(b => b.textContent.toLowerCase().includes(t));
            if (target) target.click();
          }, tab);
        }
      });
    }

    // 5. Test Isolated Component Harness (browserManualQa.tsx) for Modals & Student Vote Flow
    await page.goto(`${BASE_URL}/qa.html`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    // Student Vote Page
    await inspectAndCapture('student_vote_flow_mobile', mobile, async (p) => {
      await p.evaluate(() => {
        window.__schoolElectionQaSetRole?.('student');
      });
    });

    // Candidate Detail Modal in Vote Page
    await inspectAndCapture('student_candidate_modal_mobile', mobile, async (p) => {
      await p.evaluate(() => {
        const cardHeader = document.querySelector('.group');
        if (cardHeader) cardHeader.click();
      });
    });

    // Close Candidate Modal
    await page.evaluate(() => {
      const close = document.querySelector('button[aria-label="Close modal"]') || document.querySelector('button:has(svg)');
      if (close) close.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Vote Confirmation Modal
    await inspectAndCapture('student_vote_confirm_modal_mobile', mobile, async (p) => {
      await p.evaluate(() => {
        const voteBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Change Selection') || b.textContent.includes('Select Candidate') || b.textContent.includes('CAST VOTE'));
        if (voteBtn) voteBtn.click();
      });
    });

    // Close Vote Confirmation Modal
    await page.evaluate(() => {
      const cancelBtn = document.querySelector('#vote-confirmation-cancel-btn');
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Admin Users Tab & Modals
    await page.evaluate(() => {
      window.__schoolElectionQaSetRole?.('admin');
    });
    await new Promise(r => setTimeout(r, 400));

    // Switch to Users Tab
    await page.evaluate(() => {
      const navBtns = Array.from(document.querySelectorAll('aside nav button'));
      const usersBtn = navBtns.find(b => b.textContent.toLowerCase().includes('users'));
      if (usersBtn) usersBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Click on a user row to open UserDetailModal
    await inspectAndCapture('admin_user_detail_modal_mobile', mobile, async (p) => {
      await p.evaluate(() => {
        const row = document.querySelector('tbody tr');
        if (row) row.click();
      });
    });

    // Close UserDetailModal
    await page.evaluate(() => {
      const close = document.querySelector('button[aria-label="Close modal"]');
      if (close) close.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Open Bulk Import Modal
    await inspectAndCapture('admin_bulk_import_modal_mobile', mobile, async (p) => {
      await p.evaluate(() => {
        const bulkBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes('bulk import'));
        if (bulkBtn) bulkBtn.click();
      });
      await new Promise(r => setTimeout(r, 400));
    });

    console.log("\n=================== AUDIT RESULTS ===================");
    console.log(JSON.stringify(auditResults, null, 2));
    console.log("\n=================== CONSOLE ERRORS ===================");
    console.log(consoleErrors);

    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'ui_audit_report.json'),
      JSON.stringify({ auditResults, consoleErrors }, null, 2)
    );
    console.log("Audit completed successfully.");
  } catch (err) {
    console.error("Audit run error:", err);
  } finally {
    await browser.close();
  }
})();

