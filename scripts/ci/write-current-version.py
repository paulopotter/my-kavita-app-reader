#!/usr/bin/env python3
"""Write docs/external/current-version.md with current app/Kotlin/RN versions."""
import os
from datetime import datetime, timezone

tag         = os.environ['TAG']
kotlin_next = os.environ['KOTLIN_NEXT']
rn_next     = os.environ['RN_NEXT']
now         = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')

content = f"""# Versão atual / Current version

| | Versão / Version |
|---|---|
| App | `{tag}` |
| Kotlin (Backend) | `{kotlin_next}` |
| React Native (Frontend) | `{rn_next}` |

_Atualizado em / Updated at: {now}_
"""

import json

os.makedirs('docs/external', exist_ok=True)

with open('docs/external/current-version.md', 'w') as f:
    f.write(content)

with open('docs/external/version.json', 'w') as f:
    json.dump({"app": tag, "kotlin": kotlin_next, "rn": rn_next}, f)

print(f"Written current-version.md and version.json for {tag}")
