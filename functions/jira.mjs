export default async (req, context) => {
  // Only allow GET
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { ATLASSIAN_EMAIL, ATLASSIAN_TOKEN, ATLASSIAN_DOMAIN } = process.env;

  if (!ATLASSIAN_EMAIL || !ATLASSIAN_TOKEN || !ATLASSIAN_DOMAIN) {
    return new Response(JSON.stringify({ error: 'Missing Atlassian environment variables' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(req.url);
  const project = url.searchParams.get('project');

  if (!project || !['DEV', 'SF'].includes(project.toUpperCase())) {
    return new Response(JSON.stringify({ error: 'Invalid project. Use DEV or SF.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const auth = Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_TOKEN}`).toString('base64');
  const jql = encodeURIComponent(`project = ${project.toUpperCase()} ORDER BY updated DESC`);
  const jiraUrl = `https://${ATLASSIAN_DOMAIN}/rest/api/3/search?jql=${jql}&maxResults=50&fields=summary,status,assignee,priority,updated,issuetype`;

  try {
    const resp = await fetch(jiraUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({
        error: `Jira API error ${resp.status}`,
        detail: errText.substring(0, 500)
      }), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await resp.json();

    const issues = (data.issues || []).map(i => ({
      key: i.key,
      summary: i.fields?.summary || '(no title)',
      status: i.fields?.status?.name || 'Unknown',
      assignee: i.fields?.assignee?.displayName || 'Unassigned',
      priority: i.fields?.priority?.name || 'Medium',
      updated: (i.fields?.updated || '').substring(0, 10),
      type: i.fields?.issuetype?.name || 'Task'
    }));

    return new Response(JSON.stringify({ issues, total: data.total || issues.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to reach Jira', detail: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
