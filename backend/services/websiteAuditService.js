function publicUrl(value) {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:") {
    const error = new Error("Only HTTPS websites can be audited.");
    error.code = "UNSAFE_URL";
    throw error;
  }
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    /^127\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(
      hostname,
    )
  ) {
    const error = new Error(
      "Private and internal network addresses are not allowed.",
    );
    error.code = "UNSAFE_URL";
    throw error;
  }
  return url;
}
async function getText(url) {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(12000),
    headers: { "user-agent": "NexBriefAudit/1.0 (+https://nexbrief.app)" },
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect without a destination.");
    const next = publicUrl(new URL(location, url));
    return getText(next);
  }
  if (!response.ok) {
    const error = new Error(`Website returned ${response.status}.`);
    error.code = "WEBSITE_UNAVAILABLE";
    throw error;
  }
  return {
    url: response.url,
    html: (await response.text()).slice(0, 2_000_000),
    status: response.status,
  };
}
export async function auditWebsite(inputUrl) {
  const url = publicUrl(inputUrl);
  const robots = await fetch(new URL("/robots.txt", url), {
    signal: AbortSignal.timeout(5000),
  })
    .then((response) => (response.ok ? response.text() : ""))
    .catch(() => "");
  if (/Disallow:\s*\/\s*$/im.test(robots)) {
    const error = new Error("This website disallows crawling in robots.txt.");
    error.code = "ROBOTS_DISALLOWS_CRAWL";
    throw error;
  }
  const page = await getText(url);
  const html = page.html;
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
    .replace(/\s+/g, " ")
    .trim();
  const metaDescription =
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
    )?.[1] || "";
  const headings = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((match) => ({
      level: Number(match[1]),
      text: match[2]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200),
    }))
    .slice(0, 50);
  const images = [...html.matchAll(/<img\b[^>]*>/gi)];
  const missingAlt = images.filter(
    (tag) => !/\balt\s*=\s*["'][^"']*["']/i.test(tag[0]),
  ).length;
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const findings = [];
  if (!title)
    findings.push({
      code: "missing-title",
      severity: "high",
      title: "Missing page title",
      explanation: "Search engines and visitors need a clear page title.",
      evidence: "No <title> element was found.",
      affectedUrl: page.url,
      suggestedService: "SEO setup",
    });
  if (!metaDescription)
    findings.push({
      code: "missing-meta-description",
      severity: "medium",
      title: "Missing meta description",
      explanation: "The page does not provide a search-result summary.",
      evidence: "No description meta tag was found.",
      affectedUrl: page.url,
      suggestedService: "SEO copywriting",
    });
  if (!hasViewport)
    findings.push({
      code: "missing-mobile-viewport",
      severity: "high",
      title: "Mobile viewport is missing",
      explanation: "The page may not adapt correctly to phone screens.",
      evidence: "No viewport meta tag was found.",
      affectedUrl: page.url,
      suggestedService: "Responsive website development",
    });
  if (missingAlt)
    findings.push({
      code: "images-without-alt",
      severity: "low",
      title: "Images without alt text",
      explanation:
        "Some images may be difficult for screen readers to understand.",
      evidence: `${missingAlt} of ${images.length} image tags do not contain alt text.`,
      affectedUrl: page.url,
      suggestedService: "Accessibility improvements",
    });
  const healthScore = Math.max(
    0,
    100 -
      findings.reduce(
        (score, finding) =>
          score +
          ({ high: 25, medium: 12, low: 5, info: 0 }[finding.severity] || 0),
        0,
      ),
  );
  return {
    url: page.url,
    summary: findings.length
      ? `Found ${findings.length} verified issue${findings.length === 1 ? "" : "s"} in the first page audit.`
      : "No issues were found in the checks that completed.",
    healthScore,
    findings,
    checks: {
      https: true,
      status: page.status,
      title,
      metaDescription,
      headings,
      mobileViewport: hasViewport,
      imageCount: images.length,
      missingAlt,
      pageSpeed: "not-configured",
    },
    provider: "built-in-fetch",
  };
}
