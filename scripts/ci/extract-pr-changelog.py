#!/usr/bin/env python3
"""Extract android/ and frontend/ changelog sections from a PR body.

Writes to files specified by OUTPUT_ANDROID and OUTPUT_FRONTEND env vars.
Exits with code 0 always; empty file means no content for that section.
"""
import os
import re
import sys

pr_body        = os.environ.get('PR_BODY', '')
output_android  = os.environ['OUTPUT_ANDROID']
output_frontend = os.environ['OUTPUT_FRONTEND']

def extract_section(text: str, header: str) -> str:
    """Extract bullets under a ### header until the next ### or end of Changelog block."""
    pattern = re.compile(
        rf'###\s+{re.escape(header)}\s*\n(.*?)(?=###\s|\Z)',
        re.DOTALL | re.IGNORECASE
    )
    match = pattern.search(text)
    if not match:
        return ''
    raw = match.group(1)
    lines = [
        l.strip() for l in raw.splitlines()
        if l.strip() and not l.strip().startswith('<!--') and not l.strip().startswith('-->')
    ]
    return '\n'.join(lines)

# Extract only the ## Changelog section from the PR body
changelog_match = re.search(
    r'## Changelog\s*\n(.*?)(?=\n## |\Z)',
    pr_body,
    re.DOTALL
)
changelog_body = changelog_match.group(1) if changelog_match else ''

android_content  = extract_section(changelog_body, 'android/')
frontend_content = extract_section(changelog_body, 'frontend/')

with open(output_android, 'w') as f:
    f.write(android_content)

with open(output_frontend, 'w') as f:
    f.write(frontend_content)

has_android  = bool(android_content.strip())
has_frontend = bool(frontend_content.strip())

print(f"android/: {'found' if has_android else 'empty'}")
print(f"frontend/: {'found' if has_frontend else 'empty'}")

# Exit 1 if both are empty (nothing to changelog)
if not has_android and not has_frontend:
    sys.exit(1)
