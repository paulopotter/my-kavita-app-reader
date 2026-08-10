#!/usr/bin/env python3
"""Extract android/frontend content from [Unreleased] section of CHANGELOG.md.

Looks for ### **Backend** / ### **Frontend** subsections first.
Falls back to treating the entire [Unreleased] body as both drafts if not found.

Strips formatting markers (**[pt-BR]**, **[en]**, ### headers) so Gemini receives
clean bullet lists as input, not its own previous output format.

Writes to OUTPUT_ANDROID and OUTPUT_FRONTEND env var paths.
"""
import os
import re

output_android  = os.environ['OUTPUT_ANDROID']
output_frontend = os.environ['OUTPUT_FRONTEND']

with open('CHANGELOG.md') as f:
    content = f.read()

unreleased_match = re.search(
    r'## \[Unreleased\](.*?)(?=\n## \[|\Z)',
    content,
    re.DOTALL
)
if not unreleased_match:
    print("No [Unreleased] section found")
    open(output_android, 'w').close()
    open(output_frontend, 'w').close()
    raise SystemExit(0)

unreleased_body = unreleased_match.group(1).strip()

def clean_bullets(text: str) -> str:
    """Strip formatting markers, keep only bullet lines."""
    skip_patterns = re.compile(
        r'^\s*(\*\*\[pt-BR\]\*\*|\*\*\[en\]\*\*|\[pt-BR\]|\[en\]|###|<!--|-{2,}>)',
        re.IGNORECASE
    )
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if skip_patterns.match(stripped):
            continue
        lines.append(stripped)
    return '\n'.join(lines)

def extract_subsection(text: str, header: str) -> str:
    pattern = re.compile(
        rf'###\s+\*?\*?{re.escape(header)}\*?\*?[^\n]*\n(.*?)(?=\n###|\Z)',
        re.DOTALL | re.IGNORECASE
    )
    m = pattern.search(text)
    if not m:
        return ''
    return clean_bullets(m.group(1))

android_content  = extract_subsection(unreleased_body, 'Backend')
frontend_content = extract_subsection(unreleased_body, 'Frontend')

# Fallback: no subsections — strip formatting from full body and use for both
if not android_content and not frontend_content:
    print("No Backend/Frontend subsections found, using full [Unreleased] body as draft")
    fallback = clean_bullets(unreleased_body)
    android_content  = fallback
    frontend_content = fallback

with open(output_android, 'w') as f:
    f.write(android_content)

with open(output_frontend, 'w') as f:
    f.write(frontend_content)

print(f"Backend draft ({len(android_content)} chars):\n{android_content[:200]}")
print(f"Frontend draft ({len(frontend_content)} chars):\n{frontend_content[:200]}")
