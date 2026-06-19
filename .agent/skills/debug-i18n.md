---
name: debug-i18n
description: "Debug i18n issues in Obsidian using Chrome DevTools Protocol — verify translations, inspect DOM, run diagnostics"
---

# Debug i18n in Obsidian

## 启动调试模式

```bash
# 杀掉旧进程
pkill -x Obsidian

# 以调试模式启动
open -a Obsidian --args --remote-debugging-port=9222

# 等待启动
sleep 5
```

## 连接并诊断

```python
# 用 Python + websockets 连接 DevTools
import asyncio, json, urllib.request, websockets

resp = urllib.request.urlopen("http://127.0.0.1:9222/json")
targets = json.loads(resp.read())
target = next(t for t in targets if 'vault-name' in t['title'])
ws_url = target['webSocketDebuggerUrl']

async def check():
    async with websockets.connect(ws_url) as ws:
        # Enable runtime
        await ws.send(json.dumps({"id":1,"method":"Runtime.enable"}))
        # Read events until response
        while True:
            msg = json.loads(await ws.recv())
            if 'id' in msg and msg['id'] == 1: break
        
        # Run diagnostics
        test_js = "JSON.stringify({ locale: window.moment?.locale(), cancel: app.plugins.plugins['plugin-id']?.t?.('Cancel'), folder: app.plugins.plugins['plugin-id']?.t?.('Folder') })"
        
        await ws.send(json.dumps({"id":2,"method":"Runtime.evaluate","params":{"expression":test_js,"returnByValue":True}}))
        while True:
            msg = json.loads(await ws.recv())
            if 'id' in msg and msg['id'] == 2:
                print(msg['result']['result']['value'])
                break

asyncio.run(check())
```

## 常见排查路径

| 症状 | 排查 |
|------|------|
| 全英文 | `moment.locale()` 是否返回 `zh`？BUILTIN_LOCALES 是否有对应 locale？ |
| 部分英文 | codemod 漏了哪些模式？运行 extract-keys 看看已提取 vs 未提取的字符串 |
| 空的设置项 | adapter 注入是否正确？`this.t` 是否绑定到 plugin 实例？ |
| 弹窗显示 raw key | fallback 链走到第 5 级了，检查词典 key 是否匹配 |
