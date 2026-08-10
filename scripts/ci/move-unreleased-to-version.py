#!/usr/bin/env python3
"""Move [Unreleased] content to a versioned entry in CHANGELOG.md.

Reads:
  USER_ENTRY_FILE — path to file with user-facing entry (from Gemini)
  TAG_ENTRY_FILE  — path to file with technical tag annotation (from Gemini)
  TAG             — datetime tag string e.g. 2026.08.10.1746
  REPO            — GitHub repo slug e.g. paulopotter/my-kavita-app-reader
  TAG_MSG_FILE    — path to write the full tag annotation message
"""
import os
import re
import sys
from datetime import date

tag            = os.environ['TAG']
repo           = os.environ.get('REPO', '')
user_entry_file = os.environ['USER_ENTRY_FILE']
tag_entry_file  = os.environ['TAG_ENTRY_FILE']
tag_msg_file    = os.environ['TAG_MSG_FILE']

with open(user_entry_file) as f:
    user_entry = f.read().strip()

with open(tag_entry_file) as f:
    tag_entry = f.read().strip()

with open('CHANGELOG.md') as f:
    content = f.read()

today = date.today().isoformat()

if repo:
    tag_url = f"https://github.com/{repo}/releases/tag/{tag}"
    header = f"## [[{tag}]({tag_url})] - {today}"
else:
    header = f"## [{tag}] - {today}"

versioned_block = f"{header}\n\n{user_entry}\n"

unreleased_pattern = re.compile(
    r'(## \[Unreleased\])(.*?)((?=## \[)|\Z)',
    re.DOTALL
)
match = unreleased_pattern.search(content)
if not match:
    print("ERROR: [Unreleased] not found", file=sys.stderr)
    sys.exit(1)

empty_unreleased = "## [Unreleased]\n\n"
new_content = unreleased_pattern.sub(
    empty_unreleased + versioned_block + "\n",
    content,
    count=1
)

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)

# Write tag annotation message
tag_annotation = f"release: {tag}\n\n{tag_entry}"
with open(tag_msg_file, 'w') as f:
    f.write(tag_annotation)

print(f"Moved [Unreleased] to [{tag}]")
