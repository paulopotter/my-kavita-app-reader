#!/usr/bin/env python3
"""Extract android/frontend content from [Unreleased] section of CHANGELOG.md.

Looks for ### **Backend** / ### **Frontend** subsections first.
Falls back to treating the entire [Unreleased] body as both drafts if not found.

Writes to OUTPUT_ANDROID and OUTPUT_FRONTEND env var paths.
"""
import os
import re

output_android  = os.environ['OUTPUT_ANDROID']
output_frontend = os.environ['OUTPUT_FRONTEND']

with open('CHANGELOG.md') as f:
    content = f.read()

# Extract the [Unreleased] block
unreleased_match = re.search(
    r'## \[Unreleased\](.*?)(?=## \[|\Z)',
    content,
    re.DOTALL
)
if not unreleased_match:
    print("No [Unreleased] section found")
    open(output_android, 'w').close()
    open(output_frontend, 'w').close()
    raise SystemExit(0)

unreleased_body = unreleased_match.group(1).strip()

def extract_subsection(text: str, header: str) -> str:
    pattern = re.compile(
        rf'###\s+\*?\*?{re.escape(header)}\*?\*?.*?\n(.*?)(?=###|\Z)',
        re.DOTALL | re.IGNORECASE
    )
    m = pattern.search(text)
    if not m:
        return ''
    lines = [
        l.strip() for l in m.group(1).splitlines()
        if l.strip() and not l.strip().startswith('<!--') and '-->' not in l
    ]
    return '\n'.join(lines)

android_content  = extract_subsection(unreleased_body, 'Backend')
frontend_content = extract_subsection(unreleased_body, 'Frontend')

# Fallback: no subsections found — use entire body for both
if not android_content and not frontend_content:
    print("No Backend/Frontend subsections found, using full [Unreleased] body as draft")
    android_content  = unreleased_body
    frontend_content = unreleased_body

with open(output_android, 'w') as f:
    f.write(android_content)

with open(output_frontend, 'w') as f:
    f.write(frontend_content)

print(f"Backend draft: {len(android_content)} chars")
print(f"Frontend draft: {len(frontend_content)} chars")
