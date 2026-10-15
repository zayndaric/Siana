const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO_OWNER = 'zayndaric';
const REPO_NAME = '-';
const BRANCH = 'main';

const token = process.argv[2] || process.env.GITHUB_TOKEN;

if (!token) {
  console.error('\n[!] Error: No GitHub Personal Access Token provided.');
  console.log('Usage: agy-node upload_to_github.js <YOUR_GITHUB_TOKEN>');
  console.log('Or set GITHUB_TOKEN environment variable.\n');
  process.exit(1);
}

const PROJECT_DIR = __dirname;

function getAllFiles(dir, baseDir = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    // Ignore server.js and node_modules / git / scripts
    if (file === 'server.js' || file === 'upload_to_github.js' || file === '.git' || file === 'node_modules') {
      return;
    }
    const fullPath = path.join(dir, file);
    const relPath = path.join(baseDir, file).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, relPath));
    } else {
      results.push({ fullPath, relPath });
    }
  });
  return results;
}

function githubRequest(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: apiPath,
      method: method,
      headers: {
        'User-Agent': 'JeddahMaintenance-Uploader',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function uploadFile(fileObj) {
  const contentBase64 = fs.readFileSync(fileObj.fullPath).toString('base64');
  const apiPath = `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(fileObj.relPath).replace(/%2F/g, '/')}`;

  // Check if file already exists to get SHA
  let sha = null;
  const check = await githubRequest('GET', apiPath + `?ref=${BRANCH}`);
  if (check.status === 200 && check.data && check.data.sha) {
    sha = check.data.sha;
  }

  const payload = {
    message: `Deploy ${fileObj.relPath} for Vercel deployment`,
    content: contentBase64,
    branch: BRANCH
  };
  if (sha) {
    payload.sha = sha;
  }

  const result = await githubRequest('PUT', apiPath, payload);
  if (result.status === 200 || result.status === 201) {
    console.log(`[✔] Uploaded: ${fileObj.relPath}`);
  } else {
    console.error(`[✖] Failed to upload ${fileObj.relPath}: ${result.status}`, result.data);
  }
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🚀 Uploading website to https://github.com/${REPO_OWNER}/${REPO_NAME}`);
  console.log(`======================================================\n`);

  const files = getAllFiles(PROJECT_DIR);
  console.log(`Found ${files.length} files to upload:\n`);
  files.forEach(f => console.log(`  - ${f.relPath}`));
  console.log('\nStarting upload via GitHub API...\n');

  for (const file of files) {
    await uploadFile(file);
  }

  console.log(`\n🎉 All files uploaded successfully to https://github.com/${REPO_OWNER}/${REPO_NAME}`);
  console.log(`Now you can go to https://vercel.com, import this repository, and deploy in one click!\n`);
}

main().catch(err => {
  console.error('Upload script encountered an error:', err);
});
