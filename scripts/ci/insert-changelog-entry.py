#!/usr/bin/env python3
"""Insert a formatted changelog entry after the [Unreleased] section."""
import os
import re
import sys

entry    = os.environ['ENTRY']
pr_num   = os.environ.get('PR_NUMBER', '')
pr_title = os.environ.get('PR_TITLE', '')

with open('CHANGELOG.md', 'r') as f:
    content = f.read()

unreleased_match = re.search(r'## \[Unreleased\]', content)
if not unreleased_match:
    print("ERROR: [Unreleased] marker not found", file=sys.stderr)
    sys.exit(1)

insert_at = unreleased_match.end()

comment_match = re.search(r'-->', content[insert_at:])
if comment_match:
    insert_at += comment_match.end()

while insert_at < len(content) and content[insert_at] in ('\n', '\r', ' '):
    insert_at += 1

block = f"\n{entry}\n"
new_content = content[:insert_at] + block + content[insert_at:]

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)

print(f"Inserted changelog entry for PR #{pr_num}: {pr_title}")
