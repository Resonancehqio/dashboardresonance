export default async (req, context) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { ATLASSIAN_EMAIL, ATLASSIAN_TOKEN, ATLASSIAN_DOMAIN, ANTHROPIC_API_KEY } = process.env;

  if (!ATLASSIAN_EMAIL || !ATLASSIAN_TOKEN || !ATLASSIAN_DOMAIN) {
    return new Response(JSON.stringify({ error: 'Missing Atlassian environment variables' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const auth = Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_TOKEN}`).toString('base64');
  const confluenceUrl = `https://${ATLASSIAN_DOMAIN}/wiki/rest/api/content?spaceKey=RC&type=page&orderby=lastModified%20desc&limit=10&expand=body.storage,version`;

  try {
    const resp = await fetch(confluenceUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({
        error: `Confluence API error ${resp.status}`,
        detail: errText.substring(0, 500)
      }), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await resp.json();

    const pages = (data.results || []).map(p => ({
      title: p.title,
      updated: (p.version?.when || '').substring(0, 10),
      updatedBy: p.version?.by?.displayName || 'Unknown',
      body: (p.body?.storage?.value || '').substring(0, 1500),
      summary: null
    }));

    // Use Claude to summarize if API key is available
    if (ANTHROPIC_API_KEY && pages.length > 0) {
      try {
        const bodies = pages.map(p => ({ title: p.title, body: p.body }));

        const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            system: 'Return ONLY a valid JSON array. No markdown, no backticks, no explanation.',
            messages: [{
              role: 'user',
              content: `Summarize each page in 1-2 sentences focused on key decisions or action items.\nReturn: [{"title":"...","summary":"..."}]\n\nPages:\n${JSON.stringify(bodies)}`
            }]
          })
        });

        if (claudeResp.ok) {
          const claudeData = await claudeResp.json();
          const text = (claudeData.content || []).map(c => c.text || '').join('');
          const clean = text.replace(/```json|```/g, '').trim();
          const jsonMatch = clean.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const summaries = JSON.parse(jsonMatch[0]);
            for (const page of pages) {
              const match = summaries.find(s => s.title === page.title);
              if (match) page.summary = match.summary;
            }
          }
        }
      } catch (e) {
        console.warn('Claude summarization failed:', e.message);
        // Continue without summaries
      }
    }

    // Strip body HTML before returning to client
    const result = pages.map(p => ({
      title: p.title,
      updated: p.updated,
      updatedBy: p.updatedBy,
      summary: p.summary || 'Open page for details'
    }));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to reach Confluence', detail: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
