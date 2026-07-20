# DNS safety note

The GitHub/CloudCannon conversion does not require a DNS change. The intended arrangement is:

```text
GoDaddy: domain registration and DNS records
GitHub: source files and version history
CloudCannon: browser-based CMS
Netlify: website build, hosting, HTTPS, and custom domain
```

When the existing Netlify project is linked to the new repository, the domain should remain attached to that same Netlify project.

Never delete all A or CNAME records as a group. Never delete MX, TXT, Autodiscover, SIP, Microsoft 365, or SRV records merely to change the website. Those may support email and identity services. For any future domain correction, copy the exact recommended records from the Netlify **Domain management** screen and change only the conflicting web-host records after making a DNS screenshot or export.
