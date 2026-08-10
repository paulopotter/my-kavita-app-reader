#!/usr/bin/env python3
"""Move [Unreleased] content to a versioned entry in CHANGELOG.md."""
import os
import re
import sys
from datetime import date

tag         = os.environ['TAG']
kotlin_next = os.environ['KOTLIN_NEXT']
rn_next     = os.environ['RN_NEXT']

with open('CHANGELOG.md', 'r') as f:
    content = f.read()

unreleased_pattern = re.compile(
    r'(## \[Unreleased\])(.*?)((?=## \[)|$)',
    re.DOTALL
)
match = unreleased_pattern.search(content)
if not match:
    print("ERROR: [Unreleased] not found", file=sys.stderr)
    sys.exit(1)

unreleased_body = match.group(2)
today = date.today().isoformat()

versioned_header = f"## [{tag}] - {today}\n\n> Kotlin `{kotlin_next}` | RN `{rn_next}`\n"
versioned_entry  = f"{versioned_header}{unreleased_body.lstrip()}"

empty_unreleased = "## [Unreleased]\n\n"
new_content = unreleased_pattern.sub(
    empty_unreleased + versioned_entry,
    content,
    count=1
)

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)

print(f"Moved [Unreleased] content to [{tag}]")
