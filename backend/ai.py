"""LLM calls for the AI Drafter and Flagship Report.

Set any of ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY in backend/.env.
If the chosen provider has no key, a structured offline template is used instead,
so the app still works end-to-end without any AI account.
"""
import json
import os
import re

import httpx

MODELS = {
    "anthropic": os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5"),
    "openai": os.environ.get("OPENAI_MODEL", "gpt-4.1"),
    "gemini": os.environ.get("GEMINI_MODEL", "gemini-2.5-pro"),
}
SYSTEM = (
    "You are a senior sustainability consultant writing for corporate ESG, LCA, carbon-market and "
    "supply-chain audiences. Write precise, professional, standards-aware prose (ISO 14040/44, GRI, SASB, "
    "BRSR, CSRD, Verra, Gold Standard). Never invent figures that are not in the provided data; mark gaps clearly."
)


def _call(provider: str, prompt: str, max_tokens: int = 4000) -> str | None:
    timeout = httpx.Timeout(120)
    if provider == "anthropic" and os.environ.get("ANTHROPIC_API_KEY"):
        r = httpx.post(
            "https://api.anthropic.com/v1/messages", timeout=timeout,
            headers={"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"},
            json={"model": MODELS["anthropic"], "max_tokens": max_tokens, "system": SYSTEM,
                  "messages": [{"role": "user", "content": prompt}]},
        )
        r.raise_for_status()
        return "".join(b.get("text", "") for b in r.json()["content"])
    if provider == "openai" and os.environ.get("OPENAI_API_KEY"):
        r = httpx.post(
            "https://api.openai.com/v1/chat/completions", timeout=timeout,
            headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
            json={"model": MODELS["openai"], "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}]},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    if provider == "gemini" and os.environ.get("GEMINI_API_KEY"):
        r = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{MODELS['gemini']}:generateContent",
            timeout=timeout, headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]},
            json={"systemInstruction": {"parts": [{"text": SYSTEM}]}, "contents": [{"parts": [{"text": prompt}]}]},
        )
        r.raise_for_status()
        return "".join(p.get("text", "") for p in r.json()["candidates"][0]["content"]["parts"])
    return None


def generate(provider: str, prompt: str) -> tuple[str | None, str]:
    """Returns (text or None if no key configured, model label)."""
    text = _call(provider, prompt)
    return (text, MODELS.get(provider, provider)) if text else (None, "offline-template")


def parse_json(text: str) -> dict | None:
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
