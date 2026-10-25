"""CDP script to dump all visible modal/popup containers directly from the active IDE window."""

import asyncio
import json
import httpx
import websockets
from pathlib import Path

async def dump_live_ide_dom():
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get("http://127.0.0.1:9000/json")
            targets = resp.json()

        # Pick active workbench target
        workbench_target = None
        for t in targets:
            url = (t.get("url") or "").lower()
            title = (t.get("title") or "").lower()
            if "workbench.html" in url or ("workbench" in url and "settings" not in title):
                workbench_target = t
                break

        if not workbench_target:
            print("❌ No active workbench target found on port 9000.")
            return

        ws_url = workbench_target.get("webSocketDebuggerUrl")
        print(f"Connecting to: {workbench_target.get('title')} ({ws_url})")

        js_code = Path("scripts/extract_ide_popup_dom.js").read_text(encoding="utf-8")

        async with websockets.connect(ws_url, max_size=20*1024*1024) as ws:
            await ws.send(json.dumps({
                "id": 999,
                "method": "Runtime.evaluate",
                "params": {
                    "expression": js_code,
                    "returnByValue": True,
                    "awaitPromise": True
                }
            }))

            raw_reply = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data = json.loads(raw_reply)
            result = data.get("result", {}).get("result", {}).get("value")

            output_file = Path("data/extracted_popup_dom.json")
            output_file.parent.mkdir(parents=True, exist_ok=True)
            output_file.write_text(json.dumps(result, indent=2), encoding="utf-8")

            print(f"Extracted {len(result) if isinstance(result, list) else 0} containers.")
            print(f"Saved to: {output_file.resolve()}")

    except Exception as exc:
        print(f"Error extracting DOM via CDP: {exc}")

if __name__ == "__main__":
    asyncio.run(dump_live_ide_dom())
