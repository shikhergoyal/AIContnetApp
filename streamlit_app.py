import streamlit as st
import requests
from bs4 import BeautifulSoup
import json
from typing import List, Dict, Any
from constants import SYSTEM_INSTRUCTION_COMPETITOR
import textwrap

st.set_page_config(page_title="SG CT SEO - AI Content Strategist", layout="wide")

st.title("SG CT SEO — AI Content Strategist")
st.markdown("""
Enter your website and competitors, provide a primary keyword and optional secondary keywords, then fetch content and run a competitor analysis powered by Gemini (if configured).

Notes:
- For Google Gemini: provide a service key or API key via the **Google** tab below or configure `st.secrets["GOOGLE_API_KEY"]`.
- If Gemini is not configured, you can copy the generated prompt and run it in your GenAI environment.
""")

# Sidebar: API configuration
st.sidebar.header("AI Configuration")
provider = st.sidebar.selectbox("Provider", options=["Google Gemini (recommended)", "OpenAI (fallback)"])

google_api_key = st.sidebar.text_input("Google API Key / Token", type="password", help="Provide Google API key or service account token if required (see README).")
openai_api_key = st.sidebar.text_input("OpenAI API Key (optional)", type="password")

# Inputs
with st.form("inputs"):
    col1, col2 = st.columns([2, 1])
    with col1:
        primary_keyword = st.text_input("Primary keyword", value="project management software")
        secondary_keywords = st.text_area("Secondary keywords (comma-separated)", value="best project management tools, task management software, team collaboration apps")
        client_url = st.text_input("Your site URL", value="https://asana.com/")
        competitors_text = st.text_area("Competitor URLs (one per line)", value="https://monday.com/\nhttps://trello.com/")
        show_manual = st.checkbox("Show manual content editor (if fetching fails)")
    with col2:
        st.markdown("**Controls**")
        analyze_button = st.form_submit_button("Fetch & Analyze")

    manual_client_content = ""
    manual_competitor_contents: Dict[str, str] = {}
    if show_manual:
        manual_client_content = st.text_area("Manual client content (paste HTML/text)")
        st.markdown("Manual competitor contents")
        for url in [u.strip() for u in competitors_text.splitlines() if u.strip()]:
            manual_competitor_contents[url] = st.text_area(f"Content for {url}")


# Utility: fetch HTML and extract readable text
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"

PROXIES = [
    lambda u: f"https://api.allorigins.win/raw?url={u}",
    lambda u: f"https://api.codetabs.com/v1/proxy?quest={u}",
    lambda u: f"https://corsproxy.io/?{u}",
]


def clean_html_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for sel in ["script", "style", "nav", "header", "footer", "iframe"]:
        for tag in soup.select(sel):
            tag.decompose()
    text = soup.get_text(separator=" ")
    return " ".join(text.split())[:200_000]


def fetch_url_content(url: str) -> str:
    # First try direct request
    headers = {"User-Agent": USER_AGENT}
    try:
        r = requests.get(url, headers=headers, timeout=12)
        if r.status_code == 200 and len(r.text) > 50:
            return clean_html_text(r.text)
    except Exception:
        pass

    # Try proxies
    for p in PROXIES:
        try:
            proxy_url = p(url)
            r = requests.get(proxy_url, headers=headers, timeout=12)
            if r.status_code == 200 and len(r.text) > 50:
                return clean_html_text(r.text)
        except Exception:
            continue

    raise RuntimeError(f"Failed to fetch content for {url}. Try enabling manual content or verify URL.")


# Build the prompt and a JSON schema hint
def build_prompt(client_content: str, competitor_contents: Dict[str, str], primary: str, secondaries: List[str]) -> str:
    prompt = textwrap.dedent(f"""
    System instruction:
    {SYSTEM_INSTRUCTION_COMPETITOR}

    Primary keyword: {primary}
    Secondary keywords: {', '.join(secondaries)}

    Client content:
    {client_content}

    """)

    for i, (url, content) in enumerate(competitor_contents.items(), start=1):
        prompt += f"Competitor {i} - {url}:\n{content}\n\n"

    prompt += textwrap.dedent("""
    Tasks:
    1) Strategic Overview (2-3 short paragraphs)
    2) Analyze search intent and how it maps to content types
    3) Identify content gaps and rank by importance
    4) Suggest linkable assets based on competitor examples
    5) Produce a pragmatic action plan with prioritized steps and quick wins
    6) Provide competitor comparisons (title, word count estimate, top keywords)

    Return the result as valid JSON with the following fields:
    - strategicOverview (string)
    - searchIntent (string)
    - topRankingOpportunities (array of strings)
    - contentGaps (array of objects {topic, importance, description, missingFrom})
    - linkableAssets (object with recommendations: array of {type, reason, exampleFromCompetitor, competitorUrl})
    - actionPlan (array of strings)
    - competitorComparisons (array of objects {url, title, wordCount, topKeywords})
    - gscData (array or empty)
    - notes (optional string)
    """)

    return prompt


# Analysis flow
if analyze_button:
    st.info("Starting fetch and analysis...")

    # Prepare competitor list
    competitors = [u.strip() for u in competitors_text.splitlines() if u.strip()]

    # Fetch contents (use manual if provided)
    client_content = manual_client_content.strip() or ""
    if not client_content:
        try:
            client_content = fetch_url_content(client_url)
        except Exception as e:
            st.error(str(e))
            st.stop()

    competitor_contents: Dict[str, str] = {}
    for url in competitors:
        manual = manual_competitor_contents.get(url, "").strip()
        if manual:
            competitor_contents[url] = manual
            continue
        try:
            competitor_contents[url] = fetch_url_content(url)
        except Exception as e:
            st.warning(f"Could not fetch {url}: {e}")
            competitor_contents[url] = ""  # allow analysis to continue but mark missing

    # Build prompt
    secondaries = [s.strip() for s in secondary_keywords.split(",") if s.strip()]
    prompt = build_prompt(client_content, competitor_contents, primary_keyword, secondaries)

    st.subheader("Generated prompt (preview)")
    st.code(prompt[:65_000])

    # Try to call Google Gemini if configured
    result_json = None
    if provider.startswith("Google"):
        try:
            import google.generativeai as genai

            if google_api_key:
                genai.configure(api_key=google_api_key)
            elif "GOOGLE_API_KEY" in st.secrets:
                genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])

            st.info("Calling Google Gemini (gemini-3-pro-preview)...")
            # Attempt multiple possible API methods for compatibility
            response = None
            try:
                response = genai.generate_text(model="gemini-3-pro-preview", prompt=prompt, max_output_tokens=1500, temperature=0)
                text_out = getattr(response, "text", None) or response
            except Exception:
                # Fallback for alternate API
                response = genai.models.generate(model="gemini-3-pro-preview", input=prompt)
                # response may have different structure
                text_out = None
                if hasattr(response, "output"):
                    # Try common shapes
                    text_out = getattr(response.output[0].content[0], "text", None)
                elif isinstance(response, dict):
                    text_out = response.get("text") or json.dumps(response)

            if not text_out:
                st.error("Received empty response from Gemini — please check your key/quotas.")
            else:
                # Try to extract JSON from text
                try:
                    parsed = json.loads(text_out)
                    result_json = parsed
                except Exception:
                    # Attempt to find first JSON block in the text
                    import re

                    m = re.search(r"\{[\s\S]*\}", text_out)
                    if m:
                        try:
                            result_json = json.loads(m.group(0))
                        except Exception:
                            st.error("Gemini returned non-JSON response. Please review the prompt or output.")
                    else:
                        st.error("Could not parse JSON from Gemini's output.")
        except Exception as e:
            st.error(f"Google GenAI client not available or failed: {e}")
            st.info("You can copy the prompt above and run it in your own Gemini playground or configure the 'Google API Key' in the sidebar.")

    # If provider is OpenAI or Gemini wasn't successful, offer an optional OpenAI fallback
    if provider.startswith("OpenAI") or (result_json is None and openai_api_key):
        if not openai_api_key:
            openai_api_key = st.secrets.get("OPENAI_API_KEY") if "OPENAI_API_KEY" in st.secrets else None
        if openai_api_key:
            st.info("Calling OpenAI as a fallback (gpt-4o-mini).")
            try:
                import openai

                openai.api_key = openai_api_key
                resp = openai.ChatCompletion.create(model="gpt-4o-mini", messages=[{"role": "system", "content": SYSTEM_INSTRUCTION_COMPETITOR}, {"role": "user", "content": prompt}], max_tokens=1500, temperature=0)
                text_out = resp.choices[0].message.content
                try:
                    result_json = json.loads(text_out)
                except Exception:
                    import re

                    m = re.search(r"\{[\s\S]*\}", text_out)
                    if m:
                        result_json = json.loads(m.group(0))
            except Exception as e:
                st.error(f"OpenAI call failed: {e}")

    # Display results
    if result_json:
        st.success("Analysis complete — parsed JSON available.")
        st.subheader("Strategic Overview")
        st.write(result_json.get("strategicOverview"))

        st.subheader("Search Intent")
        st.write(result_json.get("searchIntent"))

        st.subheader("Content Gaps")
        for gap in result_json.get("contentGaps", []):
            st.markdown(f"**{gap.get('topic')}** — _{gap.get('importance')}_\n\n{gap.get('description')}\n\nMissing from: {gap.get('missingFrom')}")

        st.subheader("Linkable Assets")
        for r in result_json.get("linkableAssets", {}).get("recommendations", []):
            st.markdown(f"**{r.get('type')}** — {r.get('reason')}\n\nExample: {r.get('exampleFromCompetitor')}\n{r.get('competitorUrl', '')}")

        st.subheader("Action Plan")
        for i, step in enumerate(result_json.get("actionPlan", []), 1):
            st.write(f"{i}. {step}")

        st.download_button("Download JSON", data=json.dumps(result_json, indent=2), file_name="competitor_analysis.json")
    else:
        st.warning("No parsed JSON result available. Check the prompt preview and configure your API keys.")

